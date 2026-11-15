import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.config import settings
from backend.app.database import (
    connect_to_mongo,
    close_mongo_connection,
    get_courses_collection,
    get_registrations_collection
)
from backend.app.services.enrollment import (
    enrollment_counts,
    enrolled_count,
    roster,
    compute_course_stats
)
from backend.app.services.schedule import parse_schedule

async def check_consistency():
    await connect_to_mongo()
    courses_coll = get_courses_collection()
    reg_coll = get_registrations_collection()
    
    courses = await courses_coll.find().to_list(500)
    if not courses:
        print("[ERROR] No courses found in database.")
        await close_mongo_connection()
        sys.exit(1)
        
    codes = [c["course_code"].upper() for c in courses]
    all_counts = await enrollment_counts(codes)
    
    errors = []
    print(f"Checking enrollment consistency across {len(courses)} courses...")
    
    for c in courses:
        code = c["course_code"].upper()
        cap = int(c.get("capacity", 40))
        
        # 1. Direct registrations count
        direct_reg_count = await reg_coll.count_documents({
            "course_code": code,
            "status": "enrolled"
        })
        
        # 2. Count from enrolled_count function
        fn_enrolled = await enrolled_count(code)
        
        # 3. Count from bulk enrollment_counts function
        bulk_enrolled = all_counts.get(code, 0)
        
        # 4. Count from roster length
        roster_list = await roster(code)
        roster_count = len(roster_list)
        
        if not (direct_reg_count == fn_enrolled == bulk_enrolled == roster_count):
            err = (
                f"Count mismatch for {code}: direct={direct_reg_count}, "
                f"enrolled_count()={fn_enrolled}, enrollment_counts()={bulk_enrolled}, roster()={roster_count}"
            )
            print(f"[FAIL] {err}")
            errors.append(err)
            continue
            
        # 5. Check seats_left calculation
        computed = dict(c)
        compute_course_stats(computed, fn_enrolled)
        expected_seats_left = max(0, cap - fn_enrolled)
        if computed["seats_left"] != expected_seats_left:
            err = f"Seats left mismatch for {code}: got {computed['seats_left']}, expected {expected_seats_left}"
            print(f"[FAIL] {err}")
            errors.append(err)
            continue
            
        # 6. Check status logic
        raw_status = str(c.get("status", "open")).lower()
        if raw_status == "closed":
            expected_status = "closed"
        elif fn_enrolled >= cap:
            expected_status = "full"
        else:
            expected_status = "open"
            
        if computed["status"] != expected_status:
            err = f"Status mismatch for {code}: got {computed['status']}, expected {expected_status}"
            print(f"[FAIL] {err}")
            errors.append(err)
            continue

        # 7. Unit-free schedule parse check (prints warnings only; does not fail exit code)
        sched_str = c.get("schedule")
        if not sched_str and c.get("days"):
            sched_str = f"{', '.join(c.get('days', []))} {c.get('start_time', '')} - {c.get('end_time', '')}"
        sessions = parse_schedule(sched_str or "")
        sched_note = ""
        if not sessions:
            sched_note = f" (WARN: unparseable schedule '{sched_str}')"
            
        print(f"[OK] {code:8s} | Enrolled: {fn_enrolled:2d}/{cap:2d} | Seats Left: {computed['seats_left']:2d} | Status: {computed['status']}{sched_note}")

    await close_mongo_connection()
    
    if errors:
        print(f"\n[FAILED] Consistency check failed with {len(errors)} error(s).")
        sys.exit(1)
    else:
        print(f"\n[PASSED] All {len(courses)} courses passed single-source-of-truth consistency checks!")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(check_consistency())
