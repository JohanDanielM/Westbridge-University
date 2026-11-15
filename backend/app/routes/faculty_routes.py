import re
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from backend.app.middleware.auth import require_faculty, require_permission
from backend.app.database import get_courses_collection, get_registrations_collection, get_users_collection
from backend.app.services.enrollment import enrollment_counts, roster, compute_course_stats, enrolled_count
from backend.app.services.schedule import parse_schedule

router = APIRouter(prefix="/api/faculty", tags=["Faculty"])

class GradeUpdate(BaseModel):
    grade: str

@router.get("/courses")
async def get_my_courses(current_user: dict = Depends(require_faculty)):
    courses_coll = get_courses_collection()
    faculty_name = current_user.get("full_name") or current_user.get("name") or ""
    faculty_id = current_user.get("faculty_id") or current_user.get("student_id") or ""
    
    # Match exact, case-insensitive regex or faculty_id
    query_conditions = []
    if faculty_name:
        query_conditions.append({"faculty_name": faculty_name})
        query_conditions.append({"faculty_name": {"$regex": f"^{re.escape(faculty_name)}$", "$options": "i"}})
    if faculty_id:
        query_conditions.append({"faculty_id": faculty_id})
        
    query = {"$or": query_conditions} if query_conditions else {}
    
    courses = await courses_coll.find(query).to_list(100)
    
    codes = [c["course_code"] for c in courses]
    counts = await enrollment_counts(codes)
    
    for c in courses:
        c["_id"] = str(c["_id"])
        c["id"] = c["_id"]
        enrolled = counts.get(c["course_code"].upper(), 0)
        compute_course_stats(c, enrolled)
        
    return courses

@router.get("/timetable")
async def get_faculty_timetable(current_user: dict = Depends(require_faculty)):
    courses_coll = get_courses_collection()
    faculty_name = current_user.get("full_name") or current_user.get("name") or ""
    faculty_id = current_user.get("faculty_id") or current_user.get("student_id") or ""
    
    query_conditions = []
    if faculty_name:
        query_conditions.append({"faculty_name": faculty_name})
        query_conditions.append({"faculty_name": {"$regex": f"^{re.escape(faculty_name)}$", "$options": "i"}})
    if faculty_id:
        query_conditions.append({"faculty_id": faculty_id})
        
    query = {"$or": query_conditions} if query_conditions else {}
    courses = await courses_coll.find(query).to_list(100)
    
    codes = [c["course_code"] for c in courses]
    counts = await enrollment_counts(codes)
    
    sessions = []
    for c in courses:
        c["_id"] = str(c["_id"])
        c["id"] = c["_id"]
        enrolled = counts.get(c["course_code"].upper(), 0)
        compute_course_stats(c, enrolled)
        
        sched_str = c.get("schedule", "")
        if not sched_str:
            days_str = ", ".join(c.get("days", []))
            st = c.get("start_time", "")
            et = c.get("end_time", "")
            sched_str = f"{days_str} {st}–{et}".strip()
            
        parsed = parse_schedule(sched_str)
        for s in parsed:
            sessions.append({
                "day": s["day"],
                "start": s["start"],
                "end": s["end"],
                "course_code": c["course_code"],
                "course_name": c.get("course_name", c["course_code"]),
                "room": c.get("room", "TBA"),
                "enrolled": enrolled,
                "capacity": int(c.get("capacity", 40)),
                "credits": c.get("credits", 4),
                "status": "enrolled"
            })
            
    return {
        "courses": courses,
        "sessions": sessions,
        "enrolled": sessions, # For client compatibility with student structure
        "selected": [],
        "conflicts": []
    }

@router.get("/courses/{course_code}/roster")
@router.get("/courses/{course_code}/students")
async def get_course_roster(course_code: str, current_user: dict = Depends(require_faculty)):
    """
    Find all documents in registrations where course_code == {course_code} and status == "enrolled".
    Then, for each registration, look up the student's details in the users collection using the student_id.
    """
    code_clean = course_code.upper().strip()
    reg_coll = get_registrations_collection()
    users_coll = get_users_collection()

    regs = await reg_coll.find({
        "course_code": code_clean,
        "status": "enrolled"
    }).to_list(1000)

    students = []
    for r in regs:
        sid = r.get("student_id") or r.get("roll_number")
        user = await users_coll.find_one({
            "$or": [
                {"student_id": sid},
                {"roll_number": sid}
            ]
        })

        full_name = None
        email = None
        department = None
        stream = None
        semester = None

        if user:
            full_name = user.get("full_name") or user.get("name")
            email = user.get("email")
            department = user.get("department") or user.get("program") or user.get("stream")
            stream = user.get("stream")
            semester = user.get("semester") or user.get("current_semester")

        students.append({
            "registration_id": str(r["_id"]),
            "student_id": sid,
            "roll_number": sid,
            "full_name": full_name or f"Student {sid}",
            "name": full_name or f"Student {sid}",
            "email": email or f"{sid.lower()}@westbridge.edu",
            "department": department or "Computer Science",
            "stream": stream or "Computer Science",
            "semester": semester or 1,
            "section": r.get("section", "SEC A"),
            "registered_at": r.get("created_at") or r.get("registered_at"),
            "grade": r.get("grade", "Not Graded"),
            "status": r.get("status", "enrolled")
        })

    return students

@router.patch("/courses/{course_code}")
async def patch_course_details(
    course_code: str,
    request: Request,
    current_user: dict = Depends(require_permission("manage_course"))
):
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid request body."
        )

    allowed_fields = {"description", "schedule", "room"}
    if not set(body.keys()).issubset(allowed_fields):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only description, schedule and room can be changed by faculty."
        )

    code_clean = course_code.upper().strip()
    courses_coll = get_courses_collection()
    course = await courses_coll.find_one({"course_code": code_clean})
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course {code_clean} not found.")

    fac_name = current_user.get("full_name") or current_user.get("name") or ""
    fac_id = current_user.get("faculty_id") or current_user.get("student_id") or ""
    course_fac_name = course.get("faculty_name", "")
    course_fac_id = course.get("faculty_id", "")

    is_assigned = False
    if fac_name and course_fac_name.strip().lower() == fac_name.strip().lower():
        is_assigned = True
    elif fac_id and course_fac_id and course_fac_id.strip().lower() == fac_id.strip().lower():
        is_assigned = True

    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not assigned to teach this course."
        )

    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    if update_data:
        await courses_coll.update_one({"_id": course["_id"]}, {"$set": update_data})

    updated_course = await courses_coll.find_one({"_id": course["_id"]})
    updated_course["_id"] = str(updated_course["_id"])
    updated_course["id"] = updated_course["_id"]
    enrolled = await enrolled_count(code_clean)
    compute_course_stats(updated_course, enrolled)
    return updated_course

@router.post("/courses/{course_code}/students/{student_id}/grade")
async def update_student_grade(
    course_code: str,
    student_id: str,
    payload: GradeUpdate,
    current_user: dict = Depends(require_permission("enter_grades"))
):
    reg_coll = get_registrations_collection()
    res = await reg_coll.update_one(
        {"course_code": course_code.upper().strip(), "student_id": student_id, "status": "enrolled"},
        {"$set": {"grade": payload.grade}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment record not found for this course and student.")
    return {
        "message": "Grade updated successfully",
        "course_code": course_code.upper().strip(),
        "student_id": student_id,
        "grade": payload.grade
    }
