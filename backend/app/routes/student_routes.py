from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List, Optional, Dict, Any

from backend.app.services.enrollment import (
    enrollment_counts,
    enrolled_count,
    compute_course_stats
)
from backend.app.middleware.auth import get_current_student, get_optional_user
from backend.app.schemas.schemas import (
    StudentDashboardSummary,
    CartCheckRequest,
    CartCheckResponse,
    BatchRegisterRequest,
    BatchRegisterResponse,
    DropCourseRequest,
    SeatOfferActionRequest,
    AcademicRecordResponse,
    CourseResponse,
    WaitlistJoinRequest,
)
from backend.app.controllers.student_controller import (
    get_dashboard_summary,
    check_cart,
    register_batch_courses,
    drop_course,
    handle_seat_offer,
    get_academic_record,
    get_student_completed_prereqs
)
from backend.app.database import (
    get_courses_collection,
    get_registrations_collection,
    get_waitlist_entries_collection,
    get_seat_offers_collection
)
from backend.app.services.schedule import (
    parse_schedule,
    find_conflicts,
    check_session_conflict
)
from backend.app.services.waitlist import (
    get_student_waitlist,
    join_waitlist,
    leave_waitlist,
    accept_seat_offer,
    decline_seat_offer
)

router = APIRouter(prefix="/student", tags=["Student Features"])

@router.get("/profile")
async def get_student_profile(current_student: dict = Depends(get_current_student)):
    return current_student

@router.get("/dashboard", response_model=StudentDashboardSummary)
async def get_student_dashboard(current_student: dict = Depends(get_current_student)):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await get_dashboard_summary(student_id)

@router.get("/courses")
async def get_available_courses(
    department: Optional[str] = Query(None, description="Department filter"),
    semester: Optional[str] = Query("Fall", description="Semester"),
    year: Optional[int] = Query(2026, description="Year"),
    search: Optional[str] = Query(None, description="Search term"),
    current_student: dict = Depends(get_current_student)
):
    courses_coll = get_courses_collection()
    student_id = current_student.get("student_id") or current_student.get("email")
    completed_prereqs = await get_student_completed_prereqs(student_id)
    
    query: Dict[str, Any] = {}
    if department and department.lower() != "all":
        query["department"] = {"$regex": f"^{department}", "$options": "i"}
    if semester:
        query["semester"] = semester
    if year:
        query["year"] = year
    if search:
        search_rgx = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"course_code": search_rgx},
            {"course_name": search_rgx},
            {"faculty_name": search_rgx}
        ]
        
    cursor = courses_coll.find(query)
    courses_raw = await cursor.to_list(500)
    
    reg_coll = get_registrations_collection()
    enrolled_regs = await reg_coll.find({"student_id": student_id, "status": "enrolled"}).to_list(100)
    enrolled_codes = {r["course_code"].upper() for r in enrolled_regs}
    
    codes = [c["course_code"] for c in courses_raw]
    counts = await enrollment_counts(codes)
    
    courses = []
    for c in courses_raw:
        c["id"] = str(c["_id"])
        c.pop("_id", None)
        
        enrolled = counts.get(c["course_code"].upper(), 0)
        compute_course_stats(c, enrolled)
        
        # Check prerequisites
        prereqs = [p.upper().strip() for p in c.get("prerequisites", [])]
        missing = [p for p in prereqs if p not in completed_prereqs]
        c["prereqs_met"] = len(missing) == 0
        c["missing_prereqs"] = missing
        c["is_enrolled"] = c["course_code"].upper() in enrolled_codes
        courses.append(c)
        
    return courses

@router.get("/courses/{course_code}")
async def get_course_detail(course_code: str, current_student: dict = Depends(get_current_student)):
    courses_coll = get_courses_collection()
    course = await courses_coll.find_one({"course_code": course_code.upper()})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course["id"] = str(course["_id"])
    course.pop("_id", None)
    
    enrolled = await enrolled_count(course_code)
    compute_course_stats(course, enrolled)
    return course

@router.post("/cart/check", response_model=CartCheckResponse)
async def validate_cart_courses(
    request: CartCheckRequest,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await check_cart(student_id, request)

@router.post("/register", response_model=BatchRegisterResponse)
async def register_courses(
    request: BatchRegisterRequest,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await register_batch_courses(student_id, request)

@router.post("/drop")
async def drop_registered_course(
    request: DropCourseRequest,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await drop_course(student_id, request.course_code.upper())

@router.get("/registrations")
async def get_registered_courses(current_student: dict = Depends(get_current_student)):
    student_id = current_student.get("student_id") or current_student.get("email")
    reg_coll = get_registrations_collection()
    courses_coll = get_courses_collection()
    
    cursor = reg_coll.find({"student_id": student_id, "status": "enrolled"})
    results = []
    async for reg in cursor:
        course = await courses_coll.find_one({"course_code": reg["course_code"]})
        results.append({
            "registration_id": str(reg["_id"]),
            "course_code": reg["course_code"],
            "sec": reg.get("section", "SEC A"),
            "course_name": course.get("course_name", "") if course else "",
            "instructor": course.get("faculty_name", "") if course else "",
            "credits": reg.get("credits", 4),
            "time": f"{', '.join(course.get('days', []))} {course.get('start_time', '')} – {course.get('end_time', '')}" if course else "",
            "room": course.get("room", "") if course else "",
            "registered_at": reg.get("registered_at")
        })
    return results

@router.get("/timetable")
async def get_student_timetable(
    selected: Optional[str] = Query(None, description="Comma-separated course codes"),
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    reg_coll = get_registrations_collection()
    courses_coll = get_courses_collection()
    
    enrolled_regs = await reg_coll.find({"student_id": student_id, "status": "enrolled"}).to_list(100)
    enrolled_sessions = []
    for reg in enrolled_regs:
        code = reg["course_code"].upper()
        course = await courses_coll.find_one({"course_code": code})
        if not course:
            continue
        sched_str = course.get("schedule", "")
        if not sched_str:
            days_str = ", ".join(course.get("days", []))
            st = course.get("start_time", "")
            et = course.get("end_time", "")
            sched_str = f"{days_str} {st}–{et}".strip()
        parsed = parse_schedule(sched_str)
        for s in parsed:
            enrolled_sessions.append({
                "day": s["day"],
                "start": s["start"],
                "end": s["end"],
                "course_code": code,
                "course_name": course.get("course_name", code),
                "room": course.get("room", "TBA"),
                "faculty_name": course.get("faculty_name", "TBA"),
                "credits": course.get("credits", 4),
                "status": "enrolled"
            })
            
    selected_sessions = []
    if selected:
        sel_codes = [c.strip().upper() for c in selected.split(",") if c.strip()]
        for scode in sel_codes:
            course = await courses_coll.find_one({"course_code": scode})
            if not course:
                continue
            sched_str = course.get("schedule", "")
            if not sched_str:
                days_str = ", ".join(course.get("days", []))
                st = course.get("start_time", "")
                et = course.get("end_time", "")
                sched_str = f"{days_str} {st}–{et}".strip()
            parsed = parse_schedule(sched_str)
            for s in parsed:
                selected_sessions.append({
                    "day": s["day"],
                    "start": s["start"],
                    "end": s["end"],
                    "course_code": scode,
                    "course_name": course.get("course_name", scode),
                    "room": course.get("room", "TBA"),
                    "faculty_name": course.get("faculty_name", "TBA"),
                    "credits": course.get("credits", 4),
                    "status": "selected"
                })
                
    combined = []
    for s in enrolled_sessions:
        combined.append({**s, "code": s["course_code"]})
    for s in selected_sessions:
        combined.append({**s, "code": s["course_code"]})
    conflicts = find_conflicts(combined)
    
    return {
        "enrolled": enrolled_sessions,
        "selected": selected_sessions,
        "conflicts": conflicts
    }

@router.get("/courses/{course_code}/preview-slot")
async def get_course_preview_slot(
    course_code: str,
    selected: Optional[str] = Query(None),
    current_student: Optional[dict] = Depends(get_optional_user)
):
    student_id = (current_student.get("student_id") or current_student.get("email")) if current_student else None
    courses_coll = get_courses_collection()
    reg_coll = get_registrations_collection()
    
    code_clean = course_code.upper().strip()
    course = await courses_coll.find_one({"course_code": code_clean})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    sched_str = course.get("schedule", "")
    if not sched_str:
        days_str = ", ".join(course.get("days", []))
        st = course.get("start_time", "")
        et = course.get("end_time", "")
        sched_str = f"{days_str} {st}–{et}".strip()
    sessions = parse_schedule(sched_str)
    
    other_sessions = []
    if student_id:
        enrolled_regs = await reg_coll.find({"student_id": student_id, "status": "enrolled"}).to_list(100)
        for reg in enrolled_regs:
            c_other = await courses_coll.find_one({"course_code": reg["course_code"]})
            if c_other:
                s_other = parse_schedule(c_other.get("schedule", ""))
                for s in s_other:
                    other_sessions.append({**s, "code": reg["course_code"]})
                
    if selected:
        for scode in [c.strip().upper() for c in selected.split(",") if c.strip()]:
            if scode != code_clean:
                c_sel = await courses_coll.find_one({"course_code": scode})
                if c_sel:
                    s_sel = parse_schedule(c_sel.get("schedule", ""))
                    for s in s_sel:
                        other_sessions.append({**s, "code": scode})
                        
    conflicts = []
    for s_new in sessions:
        for s_other in other_sessions:
            if check_session_conflict(s_new, s_other):
                conflicts.append({
                    "course_code": s_other["code"],
                    "day": s_new["day"],
                    "start": s_new["start"],
                    "end": s_new["end"],
                    "message": f"Conflicts with {s_other['code']} on {s_new['day']} {s_other['start']}."
                })
                
    return {
        "course_code": code_clean,
        "sessions": sessions,
        "conflicts": conflicts
    }

@router.get("/waitlist")
async def get_waitlist_for_student(current_student: dict = Depends(get_current_student)):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await get_student_waitlist(student_id)

@router.post("/waitlist")
async def join_waitlist_endpoint(
    request: WaitlistJoinRequest,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await join_waitlist(student_id, request.course_code, request.selected_codes)

@router.delete("/waitlist/{course_code}")
async def leave_waitlist_endpoint(
    course_code: str,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await leave_waitlist(student_id, course_code)

@router.post("/offers/{course_code}/accept")
async def accept_offer_endpoint(
    course_code: str,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await accept_seat_offer(student_id, course_code)

@router.post("/offers/{course_code}/decline")
async def decline_offer_endpoint(
    course_code: str,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await decline_seat_offer(student_id, course_code)

@router.get("/offers")
async def get_student_offers(current_student: dict = Depends(get_current_student)):
    student_id = current_student.get("student_id") or current_student.get("email")
    entries = await get_student_waitlist(student_id)
    return [e for e in entries if e.get("status") == "offered"]

@router.post("/offers/action")
async def respond_to_seat_offer(
    request: SeatOfferActionRequest,
    current_student: dict = Depends(get_current_student)
):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await handle_seat_offer(student_id, request.course_code.upper(), request.action)

@router.get("/academic-record", response_model=AcademicRecordResponse)
async def get_student_academic_records(current_student: dict = Depends(get_current_student)):
    student_id = current_student.get("student_id") or current_student.get("email")
    return await get_academic_record(student_id)

