import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app.config import settings

logger = logging.getLogger("ccrs.database")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    uri = settings.MONGO_URL or settings.MONGO_URI or "mongodb://localhost:27017"
    logger.info(f"Connecting to MongoDB at {uri}...")
    db_instance.client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2500)
    db_instance.db = db_instance.client[settings.DB_NAME]
    logger.info(f"Connected to MongoDB database '{settings.DB_NAME}'.")

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db

def get_users_collection():
    return db_instance.db["users"]

def get_courses_collection():
    return db_instance.db["courses"]

def get_registrations_collection():
    return db_instance.db["registrations"]

def get_waitlist_entries_collection():
    return db_instance.db["waitlist_entries"]

def get_seat_offers_collection():
    return db_instance.db["seat_offers"]

def get_academic_records_collection():
    return db_instance.db["academic_records"]

def get_activity_logs_collection():
    return db_instance.db["activity_logs"]

def get_counters_collection():
    return db_instance.db["counters"]

