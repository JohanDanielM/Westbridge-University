from pymongo import ReturnDocument
from backend.app.database import get_counters_collection
from backend.app.services.roll_numbers import next_roll_number

async def next_student_id(year: int) -> str:
    """
    Generates a consecutive student ID atomically from MongoDB counters collection.
    Format: STU{year}-{seq:05d} (e.g. STU2026-00001)
    Counter key: student:{year}
    """
    counters_coll = get_counters_collection()
    counter_id = f"student:{year}"
    
    result = await counters_coll.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    
    seq = result.get("seq", 1)
    return f"STU{year}-{seq:05d}"

async def next_faculty_id() -> str:
    """
    Generates a consecutive faculty ID atomically from MongoDB counters collection.
    Format: FAC-{seq:03d} (e.g. FAC-009)
    Counter key: faculty
    """
    counters_coll = get_counters_collection()
    counter_id = "faculty"
    
    result = await counters_coll.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    
    seq = result.get("seq", 1)
    return f"FAC-{seq:03d}"
