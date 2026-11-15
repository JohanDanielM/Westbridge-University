from typing import Dict, List, Optional, Any
from backend.app.database import get_registrations_collection, get_users_collection, get_courses_collection

async def enrollment_counts(course_codes: Optional[List[str]] = None) -> Dict[str, int]:
    """
    Returns a dictionary mapping course_code -> number of active 'enrolled' students.
    If course_codes is provided, only those courses are aggregated (and guaranteed in result with 0 default).
    """
    reg_coll = get_registrations_collection()
    match_filter: Dict[str, Any] = {"status": "enrolled"}
    
    codes_map: Dict[str, int] = {}
    if course_codes is not None:
        upper_codes = [c.upper().strip() for c in course_codes]
        for c in upper_codes:
            codes_map[c] = 0
        match_filter["course_code"] = {"$in": upper_codes}
        
    pipeline = [
        {"$match": match_filter},
        {"$group": {"_id": "$course_code", "count": {"$sum": 1}}}
    ]
    
    cursor = reg_coll.aggregate(pipeline)
    async for doc in cursor:
        code = str(doc["_id"]).upper().strip()
        codes_map[code] = int(doc["count"])
        
    return codes_map

async def enrolled_count(code: str) -> int:
    """
    Returns the exact number of active enrolled students for a single course.
    """
    reg_coll = get_registrations_collection()
    return await reg_coll.count_documents({
        "course_code": code.upper().strip(),
        "status": "enrolled"
    })

async def roster(code: str) -> List[Dict[str, Any]]:
    """
    Returns the student roster for a given course code.
    Each item contains student details and enrollment metadata.
    """
    reg_coll = get_registrations_collection()
    users_coll = get_users_collection()
    
    regs = await reg_coll.find({
        "course_code": code.upper().strip(),
        "status": "enrolled"
    }).to_list(500)
    
    results = []
    for r in regs:
        student_id = r.get("student_id")
        student = await users_coll.find_one({"student_id": student_id})
        
        full_name = None
        email = None
        department = None
        if student:
            full_name = student.get("full_name") or student.get("name")
            email = student.get("email")
            department = student.get("department") or student.get("program")
            
        results.append({
            "registration_id": str(r["_id"]),
            "student_id": student_id,
            "full_name": full_name or f"Student {student_id}",
            "email": email or f"{student_id}@westbridge.edu",
            "department": department or "General",
            "section": r.get("section", "SEC A"),
            "registered_at": r.get("registered_at"),
            "grade": r.get("grade", "Not Graded"),
            "status": r.get("status", "enrolled")
        })
    return results

def compute_course_stats(course: Dict[str, Any], enrolled: int) -> Dict[str, Any]:
    """
    Dynamically computes seats_left, enrolled, and status for a course document.
    """
    cap = int(course.get("capacity", 40))
    seats_left = max(0, cap - enrolled)
    
    raw_status = str(course.get("status", "open")).lower()
    if raw_status == "closed":
        computed_status = "closed"
    elif enrolled >= cap:
        computed_status = "full"
    else:
        computed_status = "open"
        
    course["enrolled"] = enrolled
    course["enrolled_count"] = enrolled # keep for backward compatibility
    course["capacity"] = cap
    course["seats_left"] = seats_left
    course["status"] = computed_status
    return course
