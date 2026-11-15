import re
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from backend.app.database import (
    get_courses_collection,
    get_registrations_collection,
    get_waitlist_entries_collection,
    get_activity_logs_collection,
    get_users_collection
)
from backend.app.services.waitlist import release_seats
from backend.app.schemas.schemas import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    AdminDashboardSummary,
    FacultyCreateRequest,
    FacultyUpdateRequest,
    FacultyResponse
)
from backend.app.utils.logger import log_activity
from backend.app.utils.security import hash_password
from backend.app.utils.email import send_faculty_credentials_email
from backend.app.services.ids import next_faculty_id
from backend.app.constants import FACULTY_PERMISSIONS, DEFAULT_FACULTY_PERMISSIONS
from backend.app.services.enrollment import (
    enrollment_counts,
    enrolled_count,
    compute_course_stats
)

async def check_circular_prereqs(course_code: str, target_prereq: str, visited: set = None) -> bool:
    """
    Checks if target_prereq transitively depends on course_code (which would form a cycle).
    """
    if visited is None:
        visited = set()
    if target_prereq in visited:
        return False
    visited.add(target_prereq)
    
    courses_coll = get_courses_collection()
    prereq_course = await courses_coll.find_one({"course_code": target_prereq})
    if not prereq_course:
        return False
        
    next_prereqs = [p.upper().strip() for p in prereq_course.get("prerequisites", [])]
    if course_code.upper() in next_prereqs:
        return True
        
    for p in next_prereqs:
        if await check_circular_prereqs(course_code, p, visited):
            return True
    return False

async def get_admin_dashboard_summary() -> AdminDashboardSummary:
    courses_coll = get_courses_collection()
    reg_coll = get_registrations_collection()
    waitlist_coll = get_waitlist_entries_collection()
    activity_coll = get_activity_logs_collection()
    
    # 1. Registrations today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    registrations_today = await reg_coll.count_documents({
        "status": "enrolled",
        "registered_at": {"$gte": today_start}
    })
    
    # 2. Total active enrolled from registrations collection
    total_enrolled = await reg_coll.count_documents({"status": "enrolled"})
    
    # 3. Dynamic course counts
    counts = await enrollment_counts()
    all_courses_cursor = courses_coll.find()
    courses_full = 0
    all_courses = []
    async for c in all_courses_cursor:
        code = c["course_code"].upper()
        enrolled = counts.get(code, 0)
        cap = int(c.get("capacity", 40))
        if enrolled >= cap or c.get("status") == "full":
            courses_full += 1
        all_courses.append((c, enrolled, cap))
    
    # 4. Active waitlist
    active_waitlist = await waitlist_coll.count_documents({"status": "waiting"})
    
    # 5. Blocked attempts
    blocked_attempts = await activity_coll.count_documents({
        "action": {"$in": ["BLOCKED_PREREQ", "BLOCKED_CREDIT_LIMIT", "BLOCKED_CLOSED_COURSE"]}
    })
    
    # 6. High demand courses (top 5 with waitlists)
    high_demand = []
    for c, enrolled, cap in all_courses[:8]:
        code = c["course_code"]
        wait_cnt = await waitlist_coll.count_documents({"course_code": code, "status": "waiting"})
        high_demand.append({
            "code": code,
            "title": c.get("course_name", code),
            "department": c.get("department", "Computer Science"),
            "enrolled": enrolled,
            "capacity": cap,
            "waitlist": wait_cnt,
            "instructor": c.get("faculty_name", "TBA")
        })
    
    # Sort by waitlist descending, then enrolled descending
    high_demand.sort(key=lambda x: (x["waitlist"], x["enrolled"]), reverse=True)
    high_demand = high_demand[:5]
    
    # 7. Recent activity logs
    logs_cursor = activity_coll.find().sort("timestamp", -1).limit(10)
    recent_activity = []
    async for log in logs_cursor:
        recent_activity.append({
            "id": str(log["_id"]),
            "action": log.get("action"),
            "user_id": log.get("user_id"),
            "user_role": log.get("user_role"),
            "details": log.get("details", {}),
            "timestamp": log.get("timestamp").isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp"))
        })
        
    return AdminDashboardSummary(
        registrations_today=registrations_today,
        total_enrolled=total_enrolled,
        courses_full=courses_full,
        active_waitlist=active_waitlist,
        blocked_attempts=blocked_attempts,
        high_demand_courses=high_demand,
        recent_activity=recent_activity
    )

async def get_all_courses_admin(
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    courses_coll = get_courses_collection()
    waitlist_coll = get_waitlist_entries_collection()
    
    query = {}
    if department and department.lower() != "all":
        query["department"] = {"$regex": f"^{department}", "$options": "i"}
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"course_code": search_regex},
            {"course_name": search_regex},
            {"faculty_name": search_regex}
        ]
        
    cursor = courses_coll.find(query)
    courses_raw = await cursor.to_list(500)
    
    # Dynamic counts single source of truth
    codes = [c["course_code"] for c in courses_raw]
    counts = await enrollment_counts(codes)
    
    results = []
    for c in courses_raw:
        c["id"] = str(c["_id"])
        c.pop("_id", None)
        
        enrolled = counts.get(c["course_code"].upper(), 0)
        compute_course_stats(c, enrolled)
        
        # Apply status filter dynamically if requested
        if status_filter and status_filter.lower() != "all":
            if c["status"] != status_filter.lower():
                continue
                
        wait_cnt = await waitlist_coll.count_documents({"course_code": c["course_code"], "status": "waiting"})
        c["waitlist_count"] = wait_cnt
        results.append(c)
        
    return results

async def create_course_admin(course_data: CourseCreate, admin_id: str) -> Dict[str, Any]:
    courses_coll = get_courses_collection()
    
    code = course_data.course_code.upper().strip()
    existing = await courses_coll.find_one({"course_code": code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course with code {code} already exists."
        )
        
    if course_data.credits < 1 or course_data.credits > 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course credits must be between 1 and 6."
        )
    
    doc = course_data.model_dump()
    doc["course_code"] = code
    doc["prerequisites"] = [p.upper().strip() for p in doc.get("prerequisites", [])]
    
    # Validate prerequisites exist
    for p in doc["prerequisites"]:
        if p == code:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A course cannot have itself as a prerequisite."
            )
        p_exist = await courses_coll.find_one({"course_code": p})
        if not p_exist:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Prerequisite course '{p}' does not exist."
            )
            
    result = await courses_coll.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    
    compute_course_stats(doc, 0)
    
    await log_activity(
        action="COURSE_CREATED",
        user_id=admin_id,
        user_role="admin",
        details={"course_code": code}
    )
    return doc

async def update_course_admin(course_code: str, update_data: CourseUpdate, admin_id: str) -> Dict[str, Any]:
    courses_coll = get_courses_collection()
    code = course_code.upper().strip()
    
    existing = await courses_coll.find_one({"course_code": code})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_code} not found."
        )
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # 1. Credits validation (1 - 6)
    if "credits" in update_dict:
        cr = update_dict["credits"]
        if cr < 1 or cr > 6:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course credits must be between 1 and 6."
            )
            
    # 2. Capacity validation: cannot be less than currently enrolled students
    current_enrolled = await enrolled_count(code)
    if "capacity" in update_dict:
        new_cap = int(update_dict["capacity"])
        if new_cap < current_enrolled:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Capacity ({new_cap}) cannot be less than currently enrolled students ({current_enrolled})."
            )
            
    # 3. Prerequisites validation
    if "prerequisites" in update_dict:
        cleaned_prereqs = [p.upper().strip() for p in update_dict["prerequisites"] if p and p.strip()]
        if code in cleaned_prereqs:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A course cannot have itself as a prerequisite."
            )
        for p in cleaned_prereqs:
            p_course = await courses_coll.find_one({"course_code": p})
            if not p_course:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Prerequisite course '{p}' does not exist in the course catalog."
                )
            if await check_circular_prereqs(code, p):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Circular prerequisite dependency detected between {code} and {p}."
                )
        update_dict["prerequisites"] = cleaned_prereqs

    # 4. Status update
    if "status" in update_dict:
        st = update_dict["status"].lower()
        if st not in ["open", "closed"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Status must be either 'open' or 'closed'."
            )
        update_dict["status"] = st

    if update_dict:
        await courses_coll.update_one(
            {"course_code": code},
            {"$set": update_dict}
        )
        await log_activity(
            action="COURSE_UPDATED",
            user_id=admin_id,
            user_role="admin",
            details={"course_code": code, "updates": update_dict}
        )
        # R10: If capacity was increased, release freed seats to waiting list
        if "capacity" in update_dict:
            new_cap = int(update_dict["capacity"])
            old_cap = int(existing.get("capacity", 40))
            if new_cap > old_cap:
                await release_seats(code)
    
    updated = await courses_coll.find_one({"course_code": code})
    updated["id"] = str(updated["_id"])
    updated.pop("_id", None)
    
    compute_course_stats(updated, current_enrolled)
    return updated

async def delete_course_admin(course_code: str, admin_id: str):
    courses_coll = get_courses_collection()
    waitlist_coll = get_waitlist_entries_collection()
    code = course_code.upper().strip()
    
    existing = await courses_coll.find_one({"course_code": code})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_code} not found."
        )
        
    enrolled = await enrolled_count(code)
    if enrolled > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Course has {enrolled} enrolled students. Close enrollment instead of deleting."
        )
    
    await courses_coll.delete_one({"course_code": code})
    # Remove any waitlist entries for this course
    await waitlist_coll.delete_many({"course_code": code})
    
    await log_activity(
        action="COURSE_DELETED",
        user_id=admin_id,
        user_role="admin",
        details={"course_code": code}
    )
    return {"message": f"Course {code} successfully deleted."}

async def toggle_course_registration(course_code: str, admin_id: str) -> Dict[str, Any]:
    courses_coll = get_courses_collection()
    code = course_code.upper().strip()
    course = await courses_coll.find_one({"course_code": code})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_code} not found."
        )
    
    current_status = course.get("status", "open")
    new_status = "closed" if current_status != "closed" else "open"
    
    await courses_coll.update_one(
        {"course_code": code},
        {"$set": {"status": new_status}}
    )
    
    await log_activity(
        action="REGISTRATION_STATUS_TOGGLED",
        user_id=admin_id,
        user_role="admin",
        details={"course_code": code, "from": current_status, "to": new_status}
    )
    
    enrolled = await enrolled_count(code)
    updated = await courses_coll.find_one({"course_code": code})
    compute_course_stats(updated, enrolled)
    
    return {"course_code": code, "status": updated["status"], "enrolled": enrolled, "capacity": updated["capacity"]}

async def get_waitlist_by_course(course_code: str) -> List[Dict[str, Any]]:
    waitlist_coll = get_waitlist_entries_collection()
    users_coll = get_users_collection()
    
    cursor = waitlist_coll.find(
        {"course_code": course_code.upper()}
    ).sort("position", 1)
    
    results = []
    async for w in cursor:
        student = await users_coll.find_one({"student_id": w["student_id"]})
        results.append({
            "id": str(w["_id"]),
            "student_id": w["student_id"],
            "student_name": student.get("name", "Student") if student else "Student",
            "position": w.get("position", 1),
            "joined_at": w.get("joined_at").isoformat() if isinstance(w.get("joined_at"), datetime) else str(w.get("joined_at")),
            "status": w.get("status", "waiting")
        })
    return results

async def admin_delete_enrollment(course_code: str, student_id: str, admin_id: str) -> Dict[str, Any]:
    """Deletes an enrolled student's registration and triggers release_seats for waitlist."""
    code_clean = course_code.upper().strip()
    reg_coll = get_registrations_collection()
    
    res = await reg_coll.delete_one({
        "course_code": code_clean,
        "student_id": student_id,
        "status": "enrolled"
    })
    
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment record not found.")
        
    await log_activity(
        action="ADMIN_DELETE_ENROLLMENT",
        user_id=admin_id,
        user_role="admin",
        details={"course_code": code_clean, "student_id": student_id}
    )
    
    # R5: Must call release_seats on admin enrollment deletion
    await release_seats(code_clean)
    return {"ok": True, "message": f"Enrollment for {student_id} in {code_clean} removed."}

async def get_all_activity_logs(limit: int = 50) -> List[Dict[str, Any]]:
    activity_coll = get_activity_logs_collection()
    cursor = activity_coll.find().sort("timestamp", -1).limit(limit)
    logs = []
    async for log in cursor:
        logs.append({
            "id": str(log["_id"]),
            "action": log.get("action"),
            "user_id": log.get("user_id"),
            "user_role": log.get("user_role"),
            "details": log.get("details", {}),
            "timestamp": log.get("timestamp").isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp"))
        })
    return logs


# ----------------- FACULTY ACCESS CONTROL CONTROLLER -----------------

async def create_faculty_admin(payload: FacultyCreateRequest, admin_id: str) -> Dict[str, Any]:
    users_coll = get_users_collection()
    email_clean = payload.email.lower().strip()

    existing = await users_coll.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    faculty_id = await next_faculty_id()
    temp_password = secrets.token_urlsafe(9)
    hashed_pwd = hash_password(temp_password)
    now = datetime.now(timezone.utc)

    perms = payload.permissions if payload.permissions is not None else DEFAULT_FACULTY_PERMISSIONS

    new_user = {
        "full_name": payload.full_name.strip(),
        "name": payload.full_name.strip(),
        "email": email_clean,
        "role": "faculty",
        "student_id": faculty_id,
        "faculty_id": faculty_id,
        "department": payload.department,
        "permissions": perms,
        "must_change_password": True,
        "email_verified": True,
        "is_active": True,
        "provider": "local",
        "hashed_password": hashed_pwd,
        "created_at": now,
        "updated_at": now
    }

    await users_coll.insert_one(new_user)

    sent, _ = await send_faculty_credentials_email(
        email_clean, faculty_id, temp_password, payload.full_name.strip()
    )

    await log_activity(
        action="ADMIN_CREATE_FACULTY",
        user_id=admin_id,
        user_role="admin",
        details={
            "faculty_id": faculty_id,
            "email": email_clean,
            "department": payload.department,
            "permissions": perms,
            "email_sent": sent
        }
    )

    return {
        "ok": True,
        "faculty_id": faculty_id,
        "name": payload.full_name.strip(),
        "email": email_clean,
        "department": payload.department,
        "permissions": perms,
        "email_sent": sent,
        "message": "Faculty account created successfully"
    }

async def list_faculty_admin() -> List[Dict[str, Any]]:
    users_coll = get_users_collection()
    courses_coll = get_courses_collection()

    cursor = users_coll.find({"role": "faculty"}).sort("created_at", -1)
    faculty_list = []

    async for u in cursor:
        fac_id = u.get("faculty_id") or u.get("student_id") or ""
        fac_name = u.get("full_name") or u.get("name") or ""

        courses_count = await courses_coll.count_documents({
            "$or": [
                {"faculty_name": fac_name},
                {"faculty_name": {"$regex": f"^{re.escape(fac_name)}$", "$options": "i"}},
                {"faculty_id": fac_id}
            ]
        })

        faculty_list.append({
            "id": str(u["_id"]),
            "faculty_id": fac_id,
            "name": fac_name,
            "full_name": fac_name,
            "email": u.get("email", ""),
            "department": u.get("department", "Computer Science"),
            "permissions": u.get("permissions") or [],
            "is_active": u.get("is_active", True),
            "courses_taught": courses_count,
            "last_login": u.get("last_login").isoformat() if isinstance(u.get("last_login"), datetime) else str(u.get("last_login")) if u.get("last_login") else None
        })

    return faculty_list

async def update_faculty_admin(faculty_id: str, payload: FacultyUpdateRequest, admin_id: str) -> Dict[str, Any]:
    users_coll = get_users_collection()

    faculty = await users_coll.find_one({
        "role": "faculty",
        "$or": [
            {"faculty_id": faculty_id},
            {"student_id": faculty_id}
        ]
    })

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty account with ID '{faculty_id}' not found."
        )

    updates = {}
    if payload.permissions is not None:
        valid_keys = set(FACULTY_PERMISSIONS.keys())
        for p in payload.permissions:
            if p not in valid_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid permission '{p}'. Valid permissions are: {list(valid_keys)}"
                )
        updates["permissions"] = payload.permissions

    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await users_coll.update_one({"_id": faculty["_id"]}, {"$set": updates})

    await log_activity(
        action="ADMIN_UPDATE_FACULTY",
        user_id=admin_id,
        user_role="admin",
        details={"faculty_id": faculty_id, "updates": {k: v for k, v in updates.items() if k != "updated_at"}}
    )

    updated = await users_coll.find_one({"_id": faculty["_id"]})
    return {
        "id": str(updated["_id"]),
        "faculty_id": updated.get("faculty_id") or updated.get("student_id"),
        "name": updated.get("full_name") or updated.get("name"),
        "full_name": updated.get("full_name") or updated.get("name"),
        "email": updated.get("email"),
        "department": updated.get("department", "Computer Science"),
        "permissions": updated.get("permissions") or [],
        "is_active": updated.get("is_active", True)
    }

async def resend_faculty_credentials_admin(faculty_id: str, admin_id: str) -> Dict[str, Any]:
    users_coll = get_users_collection()

    faculty = await users_coll.find_one({
        "role": "faculty",
        "$or": [
            {"faculty_id": faculty_id},
            {"student_id": faculty_id}
        ]
    })

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty account with ID '{faculty_id}' not found."
        )

    temp_password = secrets.token_urlsafe(9)
    hashed_pwd = hash_password(temp_password)
    now = datetime.now(timezone.utc)

    await users_coll.update_one(
        {"_id": faculty["_id"]},
        {"$set": {"hashed_password": hashed_pwd, "must_change_password": True, "updated_at": now}}
    )

    fac_name = faculty.get("full_name") or faculty.get("name") or "Faculty Member"
    sent, mailer_msg = await send_faculty_credentials_email(
        faculty["email"], faculty_id, temp_password, fac_name
    )

    await log_activity(
        action="ADMIN_RESEND_FACULTY_CREDENTIALS",
        user_id=admin_id,
        user_role="admin",
        details={"faculty_id": faculty_id, "email": faculty["email"], "email_sent": sent}
    )

    return {
        "ok": True,
        "message": "Faculty credentials have been regenerated and dispatched via email.",
        "email_sent": sent
    }
