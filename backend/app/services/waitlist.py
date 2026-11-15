import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

from backend.app.database import (
    get_waitlist_entries_collection,
    get_courses_collection,
    get_registrations_collection,
    get_users_collection,
    get_counters_collection,
    get_academic_records_collection
)
from backend.app.services.enrollment import enrolled_count, compute_course_stats, enrollment_counts
from backend.app.utils.logger import log_activity
from backend.app.config import settings

logger = logging.getLogger("ccrs.waitlist")

async def ensure_waitlist_indexes():
    """Ensure partial unique index and query indexes exist on waitlist_entries."""
    try:
        coll = get_waitlist_entries_collection()
        await coll.create_index(
            [("course_code", 1), ("student_id", 1)],
            unique=True,
            partialFilterExpression={"status": {"$in": ["waiting", "offered"]}}
        )
        await coll.create_index(
            [("course_code", 1), ("status", 1), ("position", 1)]
        )
        await coll.create_index(
            [("student_id", 1), ("status", 1)]
        )
    except Exception as exc:
        logger.warning(f"Could not create waitlist indexes: {exc}")

async def get_next_waitlist_position(course_code: str) -> int:
    """Atomic monotonic counter sequence for each course waitlist."""
    counters_coll = get_counters_collection()
    res = await counters_coll.find_one_and_update(
        {"_id": f"waitlist:{course_code.upper().strip()}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return int(res["seq"])

async def calculate_waiting_rank(course_code: str, position: int) -> int:
    """Computes the current rank of a waiting entry (#1, #2, etc.)."""
    coll = get_waitlist_entries_collection()
    prior_count = await coll.count_documents({
        "course_code": course_code.upper().strip(),
        "status": "waiting",
        "position": {"$lt": position}
    })
    return prior_count + 1

async def get_student_current_credits(student_id: str) -> int:
    """Calculates active enrolled credits for a student."""
    reg_coll = get_registrations_collection()
    cursor = reg_coll.find({"student_id": student_id, "status": "enrolled"})
    total = 0
    async for r in cursor:
        total += r.get("credits", 4)
    return total

async def release_seats(course_code: str) -> List[Dict[str, Any]]:
    """
    R5: Core seat release logic.
    Computes free seats: capacity - enrolled - active_unexpired_offers.
    For each free seat, converts the lowest-position 'waiting' entry to 'offered' (24h window).
    """
    code_clean = course_code.upper().strip()
    courses_coll = get_courses_collection()
    waitlist_coll = get_waitlist_entries_collection()
    
    course = await courses_coll.find_one({"course_code": code_clean})
    if not course:
        return []
        
    capacity = int(course.get("capacity", 40))
    enrolled = await enrolled_count(code_clean)
    now = datetime.now(timezone.utc)
    
    # Active unexpired offers
    active_offers_count = await waitlist_coll.count_documents({
        "course_code": code_clean,
        "status": "offered",
        "offer_expires_at": {"$gt": now}
    })
    
    free_seats = capacity - enrolled - active_offers_count
    offered_entries = []
    
    if free_seats > 0:
        waiting_cursor = waitlist_coll.find({
            "course_code": code_clean,
            "status": "waiting"
        }).sort("position", 1).limit(free_seats)
        
        async for entry in waiting_cursor:
            expires_at = now + timedelta(hours=24)
            await waitlist_coll.update_one(
                {"_id": entry["_id"]},
                {
                    "$set": {
                        "status": "offered",
                        "offered_at": now,
                        "offer_expires_at": expires_at,
                        "updated_at": now
                    }
                }
            )
            
            await log_activity(
                action="SEAT_OFFERED",
                user_id=entry["student_id"],
                user_role="system",
                details={
                    "course_code": code_clean,
                    "position": entry.get("position"),
                    "offer_expires_at": expires_at.isoformat()
                }
            )
            
            entry["status"] = "offered"
            entry["offered_at"] = now
            entry["offer_expires_at"] = expires_at
            offered_entries.append(entry)
            
    return offered_entries

async def expire_offers() -> int:
    """
    R8: Periodic background task & on-demand cleaner.
    Marks expired offers as 'expired' and invokes release_seats for affected courses.
    """
    waitlist_coll = get_waitlist_entries_collection()
    now = datetime.now(timezone.utc)
    
    expired_cursor = waitlist_coll.find({
        "status": "offered",
        "offer_expires_at": {"$lte": now}
    })
    
    affected_courses = set()
    expired_count = 0
    
    async for entry in expired_cursor:
        course_code = entry.get("course_code")
        await waitlist_coll.update_one(
            {"_id": entry["_id"]},
            {"$set": {"status": "expired", "updated_at": now}}
        )
        expired_count += 1
        if course_code:
            affected_courses.add(course_code)
            
        await log_activity(
            action="WAITLIST_OFFER_EXPIRED",
            user_id=entry.get("student_id"),
            user_role="system",
            details={"course_code": course_code, "position": entry.get("position")}
        )
        
    for code in affected_courses:
        await release_seats(code)
        
    return expired_count

async def join_waitlist(student_id: str, course_code: str, selected_codes: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    R1, R2, R3: Enforces full check, duplicate check, and credit limit claim.
    """
    code_clean = course_code.upper().strip()
    courses_coll = get_courses_collection()
    waitlist_coll = get_waitlist_entries_collection()
    reg_coll = get_registrations_collection()
    
    course = await courses_coll.find_one({"course_code": code_clean})
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course {code_clean} not found.")
        
    capacity = int(course.get("capacity", 40))
    enrolled = await enrolled_count(code_clean)
    course_credits = int(course.get("credits", 4))
    
    # R1: Only full courses can be waitlisted
    if enrolled < capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Seats are still available. Select the course instead."
        )
        
    # R2: Check existing enrollment
    already_enrolled = await reg_coll.find_one({
        "student_id": student_id,
        "course_code": code_clean,
        "status": "enrolled"
    })
    if already_enrolled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled in this course."
        )
        
    # R2: Check existing active waitlist or offer
    active_entry = await waitlist_coll.find_one({
        "student_id": student_id,
        "course_code": code_clean,
        "status": {"$in": ["waiting", "offered"]}
    })
    if active_entry:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already on the waiting list for this course."
        )
        
    # R3: Total credit limit check (enrolled + selected + this course)
    current_credits = await get_student_current_credits(student_id)
    selected_credits = 0
    if selected_codes:
        for sc in selected_codes:
            if sc.upper() != code_clean:
                s_course = await courses_coll.find_one({"course_code": sc.upper()})
                if s_course:
                    selected_credits += int(s_course.get("credits", 4))
                    
    limit = settings.MAX_CREDITS_PER_STUDENT or 24
    if current_credits + selected_credits + course_credits > limit:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Adding this course would exceed your maximum term credit limit of {limit} credits."
        )
        
    now = datetime.now(timezone.utc)
    position = await get_next_waitlist_position(code_clean)
    
    entry_doc = {
        "course_code": code_clean,
        "student_id": student_id,
        "position": position,
        "status": "waiting",
        "joined_at": now,
        "offer_expires_at": None,
        "offered_at": None,
        "updated_at": now
    }
    
    res = await waitlist_coll.insert_one(entry_doc)
    rank = await calculate_waiting_rank(code_clean, position)
    
    await log_activity(
        action="WAITLIST_JOIN",
        user_id=student_id,
        user_role="student",
        details={"course_code": code_clean, "position": position, "rank": rank}
    )
    
    return {
        "id": str(res.inserted_id),
        "course_code": code_clean,
        "course_name": course.get("course_name", code_clean),
        "position": position,
        "rank": rank,
        "status": "waiting",
        "joined_at": now.isoformat()
    }

async def leave_waitlist(student_id: str, course_code: str) -> Dict[str, Any]:
    """R4: Student voluntarily leaves a waiting list."""
    code_clean = course_code.upper().strip()
    waitlist_coll = get_waitlist_entries_collection()
    
    entry = await waitlist_coll.find_one({
        "student_id": student_id,
        "course_code": code_clean,
        "status": "waiting"
    })
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active waiting entry not found for this course."
        )
        
    now = datetime.now(timezone.utc)
    await waitlist_coll.update_one(
        {"_id": entry["_id"]},
        {"$set": {"status": "left", "updated_at": now}}
    )
    
    await log_activity(
        action="WAITLIST_LEFT",
        user_id=student_id,
        user_role="student",
        details={"course_code": code_clean, "position": entry.get("position")}
    )
    
    return {"ok": True, "message": f"Successfully left the waitlist for {code_clean}."}

async def accept_seat_offer(student_id: str, course_code: str) -> Dict[str, Any]:
    """
    R6: Student accepts offered seat.
    Atomically re-verifies offer validity, seat availability, and credit limits.
    """
    code_clean = course_code.upper().strip()
    waitlist_coll = get_waitlist_entries_collection()
    courses_coll = get_courses_collection()
    reg_coll = get_registrations_collection()
    users_coll = get_users_collection()
    
    # 1. Verify offer
    await expire_offers()
    now = datetime.now(timezone.utc)
    
    offer = await waitlist_coll.find_one({
        "student_id": student_id,
        "course_code": code_clean,
        "status": "offered",
        "offer_expires_at": {"$gt": now}
    })
    
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Seat offer not found or has already expired."
        )
        
    course = await courses_coll.find_one({"course_code": code_clean})
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        
    capacity = int(course.get("capacity", 40))
    enrolled = await enrolled_count(code_clean)
    course_credits = int(course.get("credits", 4))
    
    # 2. Re-check credit limit
    current_credits = await get_student_current_credits(student_id)
    limit = settings.MAX_CREDITS_PER_STUDENT or 24
    if current_credits + course_credits > limit:
        # Mark declined due to credit limit and release seat to next
        await waitlist_coll.update_one(
            {"_id": offer["_id"]},
            {"$set": {"status": "declined", "reason": "credit_limit", "updated_at": now}}
        )
        await release_seats(code_clean)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Accepting this offer would exceed your maximum term credit limit of {limit} credits."
        )
        
    # 3. Re-check seat capacity
    if enrolled >= capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Seat was taken. Your offer is still open."
        )
        
    # 4. Create registration record
    new_reg = {
        "student_id": student_id,
        "course_code": code_clean,
        "semester": course.get("semester", "Fall"),
        "year": int(course.get("year", 2026)),
        "section": course.get("section", "SEC A"),
        "credits": course_credits,
        "registered_at": now,
        "status": "enrolled",
        "grade": "Not Graded"
    }
    await reg_coll.insert_one(new_reg)
    
    # 5. Mark entry accepted & remove other entries for same student/course
    await waitlist_coll.update_one(
        {"_id": offer["_id"]},
        {"$set": {"status": "accepted", "updated_at": now}}
    )
    await waitlist_coll.delete_many({
        "student_id": student_id,
        "course_code": code_clean,
        "status": "waiting"
    })
    
    await log_activity(
        action="WAITLIST_OFFER_ACCEPTED",
        user_id=student_id,
        user_role="student",
        details={"course_code": code_clean, "position": offer.get("position")}
    )
    
    return {
        "ok": True,
        "message": f"Seat accepted! You are now enrolled in {code_clean}.",
        "course_code": code_clean
    }

async def decline_seat_offer(student_id: str, course_code: str) -> Dict[str, Any]:
    """R7: Student declines offered seat; immediately triggers release_seats."""
    code_clean = course_code.upper().strip()
    waitlist_coll = get_waitlist_entries_collection()
    now = datetime.now(timezone.utc)
    
    res = await waitlist_coll.update_one(
        {
            "student_id": student_id,
            "course_code": code_clean,
            "status": "offered"
        },
        {"$set": {"status": "declined", "updated_at": now}}
    )
    
    if res.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active seat offer not found."
        )
        
    await log_activity(
        action="WAITLIST_OFFER_DECLINED",
        user_id=student_id,
        user_role="student",
        details={"course_code": code_clean}
    )
    
    # Release seat to next in line
    await release_seats(code_clean)
    
    return {"ok": True, "message": f"Offer for {code_clean} declined."}

async def get_student_waitlist(student_id: str) -> List[Dict[str, Any]]:
    """
    Returns caller's waitlist entries: code, name, status, rank (for waiting),
    position, offer_expires_at, seconds_remaining, seats_left.
    """
    await expire_offers()
    waitlist_coll = get_waitlist_entries_collection()
    courses_coll = get_courses_collection()
    now = datetime.now(timezone.utc)
    
    cursor = waitlist_coll.find({
        "student_id": student_id,
        "status": {"$in": ["waiting", "offered", "accepted", "declined", "expired"]}
    }).sort("joined_at", -1)
    
    results = []
    async for entry in cursor:
        code = entry.get("course_code")
        course = await courses_coll.find_one({"course_code": code})
        c_name = course.get("course_name", code) if course else code
        cap = int(course.get("capacity", 40)) if course else 40
        enrolled = await enrolled_count(code) if code else 0
        seats_left = max(0, cap - enrolled)
        
        status_val = entry.get("status")
        rank_val = None
        if status_val == "waiting":
            rank_val = await calculate_waiting_rank(code, entry.get("position", 1))
            
        expires_at = entry.get("offer_expires_at")
        sec_rem = 0
        if status_val == "offered" and expires_at:
            if isinstance(expires_at, datetime):
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                sec_rem = max(0, int((expires_at - now).total_seconds()))
                
        results.append({
            "id": str(entry["_id"]),
            "course_code": code,
            "course_name": c_name,
            "status": status_val,
            "rank": rank_val,
            "position": entry.get("position"),
            "offer_expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else str(expires_at) if expires_at else None,
            "seconds_remaining": sec_rem,
            "seats_left": seats_left,
            "joined_at": entry.get("joined_at").isoformat() if isinstance(entry.get("joined_at"), datetime) else str(entry.get("joined_at"))
        })
    return results

async def get_admin_waitlist_overview() -> List[Dict[str, Any]]:
    """
    Admin: per course: code, name, seats_left, waiting count, offered count,
    entries sorted by position with status and student name.
    """
    await expire_offers()
    courses_coll = get_courses_collection()
    waitlist_coll = get_waitlist_entries_collection()
    users_coll = get_users_collection()
    now = datetime.now(timezone.utc)
    
    courses = await courses_coll.find().to_list(100)
    counts = await enrollment_counts([c["course_code"] for c in courses])
    
    overview = []
    for c in courses:
        code = c["course_code"].upper()
        cap = int(c.get("capacity", 40))
        enrolled = counts.get(code, 0)
        seats_left = max(0, cap - enrolled)
        
        waiting_count = await waitlist_coll.count_documents({"course_code": code, "status": "waiting"})
        offered_count = await waitlist_coll.count_documents({
            "course_code": code,
            "status": "offered",
            "offer_expires_at": {"$gt": now}
        })
        
        entries_cursor = waitlist_coll.find({
            "course_code": code,
            "status": {"$in": ["waiting", "offered"]}
        }).sort("position", 1)
        
        entries = []
        async for e in entries_cursor:
            user = await users_coll.find_one({"student_id": e.get("student_id")})
            student_name = user.get("name") or user.get("full_name") or "Student" if user else "Student"
            
            expires_at = e.get("offer_expires_at")
            sec_rem = 0
            if e.get("status") == "offered" and expires_at:
                if isinstance(expires_at, datetime):
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                    sec_rem = max(0, int((expires_at - now).total_seconds()))
                    
            entries.append({
                "id": str(e["_id"]),
                "student_id": e.get("student_id"),
                "student_name": student_name,
                "position": e.get("position"),
                "status": e.get("status"),
                "offer_expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else str(expires_at) if expires_at else None,
                "seconds_remaining": sec_rem,
                "joined_at": e.get("joined_at").isoformat() if isinstance(e.get("joined_at"), datetime) else str(e.get("joined_at"))
            })
            
        overview.append({
            "course_code": code,
            "course_name": c.get("course_name", code),
            "department": c.get("department", "Computer Science"),
            "capacity": cap,
            "enrolled": enrolled,
            "seats_left": seats_left,
            "waiting_count": waiting_count,
            "offered_count": offered_count,
            "entries": entries
        })
        
    return overview

async def admin_manual_release_seat(course_code: str, admin_id: str) -> List[Dict[str, Any]]:
    """R9: Admin manual seat release; guarantees the next waiting student is offered a seat."""
    code_clean = course_code.upper().strip()
    waitlist_coll = get_waitlist_entries_collection()
    now = datetime.now(timezone.utc)
    
    # Try standard release_seats first
    offered = await release_seats(code_clean)
    if not offered:
        # Force offer to the lowest position waiting student
        next_waiting = await waitlist_coll.find_one_and_update(
            {"course_code": code_clean, "status": "waiting"},
            {
                "$set": {
                    "status": "offered",
                    "offered_at": now,
                    "offer_expires_at": now + timedelta(hours=24),
                    "updated_at": now
                }
            },
            sort=[("position", 1)],
            return_document=True
        )
        if next_waiting:
            await log_activity(
                action="ADMIN_MANUAL_SEAT_RELEASE",
                user_id=admin_id,
                user_role="admin",
                details={
                    "course_code": code_clean,
                    "student_id": next_waiting.get("student_id"),
                    "position": next_waiting.get("position")
                }
            )
            offered = [next_waiting]
            
    return offered

async def admin_remove_waitlist_entry(course_code: str, student_id: str, admin_id: str) -> Dict[str, Any]:
    """Admin removes a waiting student entry."""
    code_clean = course_code.upper().strip()
    waitlist_coll = get_waitlist_entries_collection()
    
    res = await waitlist_coll.delete_one({
        "course_code": code_clean,
        "student_id": student_id,
        "status": "waiting"
    })
    
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waiting entry not found.")
        
    await log_activity(
        action="ADMIN_REMOVE_WAITLIST_ENTRY",
        user_id=admin_id,
        user_role="admin",
        details={"course_code": code_clean, "student_id": student_id}
    )
    
    await release_seats(code_clean)
    return {"ok": True, "message": f"Removed {student_id} from {code_clean} waiting list."}
