from pymongo import ReturnDocument
from backend.app.database import get_counters_collection

async def next_roll_number(stream_code: str, admission_year: int) -> str:
    """
    Generates a consecutive, collision-free roll number atomically using MongoDB find_one_and_update.
    Format: {STREAM}-{YEAR}-{SEQ:04d} (e.g. CS-2024-0001)
    """
    clean_stream = stream_code.upper().strip()
    counters_coll = get_counters_collection()
    counter_id = f"roll_{clean_stream}_{admission_year}"
    
    result = await counters_coll.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    
    seq = result.get("seq", 1)
    return f"{clean_stream}-{admission_year}-{seq:04d}"
