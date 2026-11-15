import asyncio
from datetime import datetime, timezone
from backend.app.database import (
    connect_to_mongo,
    close_mongo_connection,
    get_database,
    get_courses_collection,
    get_waitlist_entries_collection
)
from backend.app.services.waitlist import ensure_waitlist_indexes, get_next_waitlist_position

async def migrate_waitlists():
    await connect_to_mongo()
    db = get_database()
    courses_coll = get_courses_collection()
    entries_coll = get_waitlist_entries_collection()
    
    await ensure_waitlist_indexes()
    
    now = datetime.now(timezone.utc)
    embedded_migrated_count = 0
    collection_migrated_count = 0
    
    # 1. Migrate embedded waitlists from courses collection
    courses_with_embedded = await courses_coll.find({"waitlists": {"$exists": True}}).to_list(1000)
    for c in courses_with_embedded:
        code = c.get("course_code", "").upper().strip()
        embedded_list = c.get("waitlists", [])
        if isinstance(embedded_list, list):
            for item in embedded_list:
                s_id = item if isinstance(item, str) else item.get("student_id")
                if s_id:
                    # Check if already in waitlist_entries
                    existing = await entries_coll.find_one({
                        "course_code": code,
                        "student_id": s_id,
                        "status": {"$in": ["waiting", "offered"]}
                    })
                    if not existing:
                        pos = await get_next_waitlist_position(code)
                        await entries_coll.insert_one({
                            "course_code": code,
                            "student_id": s_id,
                            "position": pos,
                            "status": "waiting",
                            "joined_at": now,
                            "offer_expires_at": None,
                            "offered_at": None,
                            "updated_at": now
                        })
                        embedded_migrated_count += 1
                        
        # Unset embedded waitlists field
        await courses_coll.update_one({"_id": c["_id"]}, {"$unset": {"waitlists": ""}})
        
    # 2. Migrate legacy 'waitlists' collection if it exists and has documents
    if "waitlists" in await db.list_collection_names():
        legacy_coll = db["waitlists"]
        legacy_docs = await legacy_coll.find().to_list(5000)
        for doc in legacy_docs:
            code = doc.get("course_code", "").upper().strip()
            s_id = doc.get("student_id")
            if code and s_id:
                existing = await entries_coll.find_one({
                    "course_code": code,
                    "student_id": s_id,
                    "status": {"$in": ["waiting", "offered"]}
                })
                if not existing:
                    pos = doc.get("position")
                    if not pos:
                        pos = await get_next_waitlist_position(code)
                    await entries_coll.insert_one({
                        "course_code": code,
                        "student_id": s_id,
                        "position": pos,
                        "status": doc.get("status", "waiting"),
                        "joined_at": doc.get("joined_at", now),
                        "offer_expires_at": doc.get("offer_expires_at"),
                        "offered_at": doc.get("offered_at"),
                        "updated_at": now
                    })
                    collection_migrated_count += 1
                    
        # Clean legacy collection so second run is idempotent
        await legacy_coll.drop()
        
    total_changes = embedded_migrated_count + collection_migrated_count
    if total_changes == 0:
        print("[MIGRATE] Migrated 0 embedded waitlists and 0 legacy collection entries. Database already up to date.")
    else:
        print(f"[MIGRATE] Successfully migrated {embedded_migrated_count} embedded waitlists and {collection_migrated_count} legacy collection entries into 'waitlist_entries'.")
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(migrate_waitlists())
