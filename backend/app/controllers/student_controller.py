import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from backend.app.database import (
    get_users_collection,
    get_courses_collection,
    get_registrations_collection,
    get_waitlist_entries_collection,
    get_academic_records_collection,
)
from backend.app.services.waitlist import (
    release_seats,
    accept_seat_offer,
    decline_seat_offer,
    join_waitlist,
    calculate_waiting_rank,
    expire_offers
)
from backend.app.schemas.schemas import (
    CartCheckRequest,
    CartCheckResponse,
    CartItemCheckResult,
    BatchRegisterRequest,
    BatchRegisterResponse,
    RegistrationResultItem,
    SeatOfferResponse,
    AcademicRecordResponse,
    StudentDashboardSummary,
)
from backend.app.utils.logger import log_activity
from backend.app.config import settings
from backend.app.services.enrollment import (
    enrollment_counts,
    enrolled_count,
    compute_course_stats
)

def clean_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
    return doc

async def get_student_completed_prereqs(student_id: str) -> set:
    """Returns a set of uppercase course codes the student has completed and passed."""
    records_coll = get_academic_records_collection()
    record = await records_coll.find_one({"student_id": student_id})
    completed = set()
    if not record or "terms" not in record:
        return completed
    
    for term in record.get("terms", []):
        for course in term.get("courses", []):
            code = course.get("code", "").upper().strip()
            is_passed = course.get("is_passed", True)
            grade = course.get("grade", "").upper()
            if is_passed and not any(fail in grade for fail in ["GRADE F", "FAIL", "WITHDRAW"]):
                completed.add(code)
    return completed

async def get_student_current_credits(student_id: str, semester: str = "Fall", year: int = 2026) -> int:
    """Calculate total credits currently enrolled by student in the given semester."""
    reg_coll = get_registrations_collection()
    cursor = reg_coll.find({
        "student_id": student_id,
        "status": "enrolled",
        "semester": semester,
        "year": year
    })
    total = 0
    async for reg in cursor:
        total += reg.get("credits", 0)
    return total

async def get_dashboard_summary(student_id: str) -> StudentDashboardSummary:
    users_coll = get_users_collection()
    reg_coll = get_registrations_collection()
    courses_coll = get_courses_collection()
    waitlist_entries_coll = get_waitlist_entries_collection()
    records_coll = get_academic_records_collection()
    
    user = await users_coll.find_one({"student_id": student_id})
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # 1. Registered courses
    registered_cursor = reg_coll.find({"student_id": student_id, "status": "enrolled"})
    registered_courses = []
    credits_used = 0
    async for reg in registered_cursor:
        course = await courses_coll.find_one({"course_code": reg["course_code"]})
        if course:
            c_credits = course.get("credits", 4)
            credits_used += c_credits
            registered_courses.append({
                "code": course["course_code"],
                "sec": reg.get("section", "SEC A"),
                "title": course["course_name"],
                "instructor": course.get("faculty_name", "TBA"),
                "time": f"{', '.join(course.get('days', []))} {course.get('start_time', '')} – {course.get('end_time', '')}",
                "room": course.get("room", "TBA"),
                "credits": c_credits
            })
    
    # 2. Waitlist count
    waitlist_count = await waitlist_entries_coll.count_documents({
        "student_id": student_id,
        "status": "waiting"
    })
    
    # 3. CGPA from academic records
    academic_record = await records_coll.find_one({"student_id": student_id})
    cgpa = academic_record.get("cgpa", 3.84) if academic_record else 3.84
    
    # 4. Active seat offers (expiring past now)
    await expire_offers()
    now = datetime.now(timezone.utc)
    offers_cursor = waitlist_entries_coll.find({
        "student_id": student_id,
        "status": "offered",
        "offer_expires_at": {"$gt": now}
    })
    active_offers = []
    async for off in offers_cursor:
        c_code = off["course_code"]
        course = await courses_coll.find_one({"course_code": c_code})
        course_name = course.get("course_name", c_code) if course else c_code
        expires_at = off["offer_expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        rem_sec = max(0, int((expires_at - now).total_seconds()))
        hours = rem_sec // 3600
        minutes = (rem_sec % 3600) // 60
        active_offers.append(SeatOfferResponse(
            id=str(off["_id"]),
            student_id=off["student_id"],
            course_code=c_code,
            course_name=course_name,
            offered_at=off.get("offered_at") or now,
            expires_at=expires_at,
            status=off["status"],
            time_remaining_str=f"Expires in {hours}h {minutes}m"
        ))
    
    # 5. Notifications
    notifications = [
        {
            "id": 1,
            "title": "Seat offer available" if active_offers else "Course waitlist active",
            "desc": f"{active_offers[0].course_code} - {active_offers[0].course_name}" if active_offers else "Monitoring enrollment changes",
            "time": active_offers[0].time_remaining_str if active_offers else "Today",
            "unread": bool(active_offers),
            "actionRequired": bool(active_offers),
        },
        {
            "id": 2,
            "title": "Enrollment Priority Open",
            "desc": "Your enrollment priority group is now live.",
            "time": "1 hour ago",
            "unread": False,
            "actionRequired": False,
        },
        {
            "id": 3,
            "title": "Waitlist Update",
            "desc": f"You have {waitlist_count} active course(s) on the waiting list.",
            "time": "2 hours ago",
            "unread": False,
            "actionRequired": False,
        }
    ]
    
    max_credits = settings.MAX_CREDITS_PER_STUDENT
    credits_rem = max(0, max_credits - credits_used)
    
    return StudentDashboardSummary(
        student_id=student_id,
        name=user.get("name", "Student"),
        program=user.get("program", "B.Sc. Computer Science"),
        term=user.get("term", "Fall 2026"),
        status=user.get("status", "Active Priority Enrollment"),
        cgpa=cgpa,
        registered_courses_count=len(registered_courses),
        credits_used=credits_used,
        credits_max=max_credits,
        credits_remaining=credits_rem,
        waiting_list_count=waitlist_count,
        registered_courses=registered_courses,
        active_seat_offers=active_offers,
        notifications=notifications
    )

async def check_cart(student_id: str, request: CartCheckRequest) -> CartCheckResponse:
    """
    Validate all courses in the cart:
    - course existence
    - prerequisites check
    - capacity & status check
    - credit limit calculation
    """
    courses_coll = get_courses_collection()
    reg_coll = get_registrations_collection()
    
    completed_prereqs = await get_student_completed_prereqs(student_id)
    current_credits = await get_student_current_credits(student_id)
    
    # Check what courses student is already registered for
    existing_regs = await reg_coll.find({"student_id": student_id, "status": "enrolled"}).to_list(length=100)
    already_enrolled_codes = {r["course_code"].upper() for r in existing_regs}
    
    results: List[CartItemCheckResult] = []
    total_requested_credits = 0
    counts = await enrollment_counts(request.course_codes)
    
    for code in request.course_codes:
        course = await courses_coll.find_one({"course_code": code})
        if not course:
            results.append(CartItemCheckResult(
                course_code=code,
                can_register=False,
                has_conflict=True,
                conflict_message=f"Course {code} does not exist in the course catalog.",
                status="closed",
                prereqs_met=False,
                missing_prereqs=[]
            ))
            continue
        
        c_code_upper = code.upper()
        enrolled_count = counts.get(c_code_upper, 0)
        compute_course_stats(course, enrolled_count)
        
        c_credits = course.get("credits", 4)
        c_status = course.get("status", "open")
        capacity = course.get("capacity", 40)
        prereqs = [p.upper().strip() for p in course.get("prerequisites", [])]
        
        # Check if already enrolled
        if c_code_upper in already_enrolled_codes:
            results.append(CartItemCheckResult(
                course_code=code,
                can_register=False,
                has_conflict=True,
                conflict_message=f"Already registered for {code}.",
                status=c_status,
                prereqs_met=True,
                missing_prereqs=[]
            ))
            continue
        
        # Check prerequisites
        missing = [p for p in prereqs if p not in completed_prereqs]
        prereqs_met = len(missing) == 0
        
        has_conflict = False
        conflict_msg = None
        can_register = True
        
        if not prereqs_met:
            has_conflict = True
            can_register = False
            missing_str = ", ".join(missing)
            conflict_msg = f"Prerequisite requirement: You cannot register until {missing_str} is verified in your completed records."
        elif c_status == "closed":
            has_conflict = True
            can_register = False
            conflict_msg = f"Course {code} registration is currently closed by the Registrar."
        elif enrolled_count >= capacity:
            # Capacity full -> will route to waitlist
            has_conflict = False
            conflict_msg = f"Course {code} is currently at full capacity ({enrolled_count}/{capacity}). Registering will add you to the waiting list."
        
        if can_register:
            total_requested_credits += c_credits
        
        results.append(CartItemCheckResult(
            course_code=code,
            can_register=can_register,
            has_conflict=has_conflict,
            conflict_message=conflict_msg,
            status=c_status if enrolled_count < capacity else "full",
            prereqs_met=prereqs_met,
            missing_prereqs=missing
        ))
    
    projected_credits = current_credits + total_requested_credits
    credit_limit_exceeded = projected_credits > settings.MAX_CREDITS_PER_STUDENT
    
    all_valid = (not credit_limit_exceeded) and all(not r.has_conflict for r in results)
    
    return CartCheckResponse(
        results=results,
        total_requested_credits=total_requested_credits,
        current_enrolled_credits=current_credits,
        projected_credits=projected_credits,
        credit_limit_exceeded=credit_limit_exceeded,
        all_valid=all_valid
    )

async def register_batch_courses(student_id: str, request: BatchRegisterRequest) -> BatchRegisterResponse:
    """
    Registers a student for a list of courses (e.g. from cart).
    Executes the 5 constraint rules:
    1. Authenticated student
    2. Course exists and is open
    3. Prerequisites completed
    4. Credit ceiling (max 24)
    5. Seats availability / waitlisting
    """
    courses_coll = get_courses_collection()
    reg_coll = get_registrations_collection()
    
    completed_prereqs = await get_student_completed_prereqs(student_id)
    current_credits = await get_student_current_credits(student_id)
    
    results: List[RegistrationResultItem] = []
    now = datetime.now(timezone.utc)
    
    for code in request.course_codes:
        course = await courses_coll.find_one({"course_code": code})
        if not course:
            results.append(RegistrationResultItem(
                course_code=code,
                status="blocked",
                message=f"Course {code} not found."
            ))
            continue
        
        enrolled_count = await enrolled_count(code)
        compute_course_stats(course, enrolled_count)
        c_credits = course.get("credits", 4)
        c_status = course.get("status", "open")
        capacity = course.get("capacity", 40)
        prereqs = [p.upper().strip() for p in course.get("prerequisites", [])]
        
        # Rule 1: Check if already registered
        existing_reg = await reg_coll.find_one({
            "student_id": student_id,
            "course_code": code,
            "status": "enrolled"
        })
        if existing_reg:
            results.append(RegistrationResultItem(
                course_code=code,
                status="blocked",
                message=f"Student is already enrolled in {code}."
            ))
            continue
        
        # Rule 2: Course must be open
        if c_status == "closed":
            results.append(RegistrationResultItem(
                course_code=code,
                status="blocked",
                message=f"Registration for {code} is closed by university administration."
            ))
            await log_activity(
                action="BLOCKED_CLOSED_COURSE",
                user_id=student_id,
                user_role="student",
                details={"course_code": code}
            )
            continue
        
        # Rule 3: Prerequisites check
        missing = [p for p in prereqs if p not in completed_prereqs]
        if missing:
            msg = f"Prerequisite requirement: You cannot register until {', '.join(missing)} is verified."
            results.append(RegistrationResultItem(
                course_code=code,
                status="blocked",
                message=msg
            ))
            await log_activity(
                action="BLOCKED_PREREQ",
                user_id=student_id,
                user_role="student",
                details={"course_code": code, "missing_prerequisites": missing}
            )
            continue
        
        # Rule 4: Credit Limit check (24 credits)
        if current_credits + c_credits > settings.MAX_CREDITS_PER_STUDENT:
            msg = f"Credit limit exceeded: Adding {code} ({c_credits} cr) would exceed 24 max credits (current: {current_credits})."
            results.append(RegistrationResultItem(
                course_code=code,
                status="blocked",
                message=msg
            ))
            await log_activity(
                action="BLOCKED_CREDIT_LIMIT",
                user_id=student_id,
                user_role="student",
                details={"course_code": code, "current_credits": current_credits, "course_credits": c_credits}
            )
            continue
        
        # Rule 5: Seats availability
        if enrolled_count < capacity:
            # Register student!
            await reg_coll.insert_one({
                "student_id": student_id,
                "course_code": code,
                "semester": course.get("semester", "Fall"),
                "year": course.get("year", 2026),
                "section": "SEC A",
                "credits": c_credits,
                "registered_at": now,
                "status": "enrolled"
            })
            
            # Increment enrolled_count
            new_enrolled = enrolled_count + 1
            new_status = "full" if new_enrolled >= capacity else "open"
            await courses_coll.update_one(
                {"course_code": code},
                {"$set": {"enrolled_count": new_enrolled, "status": new_status}}
            )
            
            current_credits += c_credits
            results.append(RegistrationResultItem(
                course_code=code,
                status="registered",
                message=f"Successfully registered for {code} ({course.get('course_name')})."
            ))
            await log_activity(
                action="REGISTER_COURSE",
                user_id=student_id,
                user_role="student",
                details={"course_code": code, "credits": c_credits}
            )
        else:
            # Course is full -> automatically join waiting list
            try:
                wl_res = await join_waitlist(student_id, code)
                results.append(RegistrationResultItem(
                    course_code=code,
                    status="waitlisted",
                    message=f"Course is at full capacity. Placed on waiting list at position #{wl_res['position']} (Rank #{wl_res['rank']}).",
                    waitlist_position=wl_res["position"]
                ))
            except HTTPException as e:
                results.append(RegistrationResultItem(
                    course_code=code,
                    status="error",
                    message=e.detail
                ))
    
    ref_num = f"REF-2026-F-{datetime.now().strftime('%H%M%S')}"
    timestamp_str = f"{now.strftime('%b %d, %Y · %H:%M')} EST"
    
    return BatchRegisterResponse(
        results=results,
        reference_number=ref_num,
        timestamp=timestamp_str
    )

async def drop_course(student_id: str, course_code: str):
    """
    Drop a registered course and automatically promote the first waiting list student (Rule R5).
    """
    reg_coll = get_registrations_collection()
    courses_coll = get_courses_collection()
    code_clean = course_code.upper().strip()
    
    reg = await reg_coll.find_one({
        "student_id": student_id,
        "course_code": code_clean,
        "status": "enrolled"
    })
    
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active registration found for {code_clean}."
        )
    
    # 1. Update registration to dropped
    await reg_coll.update_one(
        {"_id": reg["_id"]},
        {"$set": {"status": "dropped", "dropped_at": datetime.now(timezone.utc)}}
    )
    
    # 2. Update course capacity count
    course = await courses_coll.find_one({"course_code": code_clean})
    if course:
        new_enrolled = max(0, course.get("enrolled_count", 1) - 1)
        await courses_coll.update_one(
            {"course_code": code_clean},
            {"$set": {"enrolled_count": new_enrolled, "status": "open"}}
        )
    
    await log_activity(
        action="DROP_COURSE",
        user_id=student_id,
        user_role="student",
        details={"course_code": code_clean}
    )
    
    # 3. Promote waiting student via R5 release_seats
    promoted_list = await release_seats(code_clean)
    promoted_student = promoted_list[0]["student_id"] if promoted_list else None
            
    return {
        "message": f"Successfully dropped {code_clean}.",
        "promoted_waitlist_student": promoted_student
    }

async def handle_seat_offer(student_id: str, course_code: str, action: str):
    """
    Accept or decline an offered seat (Rules R6 & R7).
    """
    code_clean = course_code.upper().strip()
    act = action.strip().lower()
    if act == "accept":
        return await accept_seat_offer(student_id, code_clean)
    elif act == "decline":
        return await decline_seat_offer(student_id, code_clean)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Use 'accept' or 'decline'."
        )

async def get_academic_record(student_id: str) -> AcademicRecordResponse:
    records_coll = get_academic_records_collection()
    users_coll = get_users_collection()
    
    user = await users_coll.find_one({"student_id": student_id})
    student_name = user.get("name", "Student") if user else "Student"
    
    record = await records_coll.find_one({"student_id": student_id})
    if not record:
        return AcademicRecordResponse(
            student_id=student_id,
            student_name=student_name,
            cgpa=3.84,
            total_credits_earned=46.0,
            major_credits_earned=34.0,
            core_credits_completed=12.0,
            standing="Dean's Honor Roll",
            terms=[]
        )
    
    return AcademicRecordResponse(
        student_id=student_id,
        student_name=student_name,
        cgpa=record.get("cgpa", 3.84),
        total_credits_earned=record.get("total_credits_earned", 46.0),
        major_credits_earned=record.get("major_credits_earned", 34.0),
        core_credits_completed=record.get("core_credits_completed", 12.0),
        standing=record.get("standing", "Dean's Honor Roll"),
        terms=record.get("terms", [])
    )

