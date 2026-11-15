import asyncio
import random
from datetime import datetime, timezone, timedelta
from backend.app.database import connect_to_mongo, close_mongo_connection, get_database
from backend.app.utils.security import hash_password

# Mock lists for generating data
FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Shaurya", "Atharv", "Advik", "Pranav", "Dhruv", "Kavya", "Ananya", "Diya", "Ira", "Myra",
    "Sara", "Aaradhya", "Riya", "Anvi", "Prisha", "Aisha", "Zara", "Kritika", "Neha", "Pooja"
]
LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Nair", "Iyer", "Bhat", "Rao",
    "Desai", "Mehta", "Joshi", "Chawla", "Malhotra", "Verma", "Saxena", "Choudhury", "Menon", "Kapoor"
]
STREAMS = [
    "Computer Science",
    "Software Engineering",
    "Data Science",
    "Artificial Intelligence",
    "Cyber Security"
]

async def seed_data():
    await connect_to_mongo()
    db = get_database()
    now = datetime.now(timezone.utc)
    random.seed(42)

    print("Dropping existing collections...")
    collections_to_drop = [
        "users", "courses", "registrations", "waitlists", 
        "waitlist_entries", "seat_offers", "academic_records", "activity_logs", "counters"
    ]
    for col in collections_to_drop:
        try:
            await db[col].drop()
        except Exception:
            pass

    print("Creating Admin...")
    admin_pw = hash_password("AdminPass2026!")
    admin_users = [
        {
            "full_name": "Dr. Melissa Carter",
            "name": "Dr. Melissa Carter",
            "email": "admin@westbridge.edu",
            "student_id": "ADMIN-001",
            "faculty_id": "ADMIN-001",
            "hashed_password": admin_pw,
            "role": "admin",
            "department": "Administration",
            "provider": "local",
            "is_active": True,
            "is_onboarded": True,
            "email_verified": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "full_name": "Dr. Melissa Carter",
            "name": "Dr. Melissa Carter",
            "email": "m.carter@westbridge.edu",
            "student_id": "ADMIN-002",
            "faculty_id": "ADMIN-002",
            "hashed_password": admin_pw,
            "role": "admin",
            "department": "Administration",
            "provider": "local",
            "is_active": True,
            "is_onboarded": True,
            "email_verified": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    await db["users"].insert_many(admin_users)

    print("Creating Faculty...")
    faculty_specs = [
        {"name": "Dr. R. Sharma", "dept": "Computer Science", "hours": "Mon/Wed 2:00 – 4:00 PM"},
        {"name": "Prof. Alan Vance", "dept": "Computer Science", "hours": "Tue/Thu 1:00 – 3:00 PM"},
        {"name": "Dr. Al-Mansoor", "dept": "Software Engineering", "hours": "Wed/Fri 10:00 AM – 12:00 PM"},
        {"name": "Dr. Eileen Wu", "dept": "Mathematics", "hours": "Mon/Fri 11:00 AM – 1:00 PM"},
        {"name": "Dr. Marcus Rivera", "dept": "Artificial Intelligence", "hours": "Tue/Thu 3:00 – 5:00 PM"},
    ]
    fac_pw = hash_password("Faculty2026!")
    faculty_users = []
    for i, spec in enumerate(faculty_specs):
        last = spec["name"].split()[-1].replace("-", "").lower()
        email = f"{last}@westbridge.edu"
        fac = {
            "full_name": spec["name"],
            "name": spec["name"],
            "email": email,
            "student_id": f"FAC-{100+i}",
            "faculty_id": f"FAC-{100+i}",
            "hashed_password": fac_pw,
            "role": "faculty",
            "department": spec["dept"],
            "office_hours": spec["hours"],
            "provider": "local",
            "is_active": True,
            "is_onboarded": True,
            "email_verified": True,
            "created_at": now,
            "updated_at": now
        }
        await db["users"].insert_one(fac)
        faculty_users.append(fac)

    print("Creating 100 Students...")
    stu_pw = hash_password("Student2026!")
    student_users = []
    for i in range(100):
        if i == 0:
            # Match standard login default
            fname, lname = "Aarav", "Sharma"
            stream = "Computer Science"
            roll = "STU2024-00123"
            sem = 4
        else:
            fname = FIRST_NAMES[i % len(FIRST_NAMES)]
            lname = LAST_NAMES[i % len(LAST_NAMES)]
            stream = STREAMS[i % len(STREAMS)]
            stream_code = "".join([word[0] for word in stream.split()]).upper()
            roll = f"WU-2026-{stream_code}-{str(i).zfill(3)}"
            sem = random.randint(1, 8)
        
        email = f"{fname.lower()}.{lname.lower()}{i}@westbridge.edu" if i > 0 else "student@westbridge.edu"
        
        stu = {
            "full_name": f"{fname} {lname}",
            "name": f"{fname} {lname}",
            "email": email,
            "student_id": roll,
            "roll_number": roll,
            "hashed_password": stu_pw,
            "role": "student",
            "stream": stream,
            "semester": sem,
            "current_semester": sem,
            "current_year": (sem + 1) // 2,
            "program": f"B.Sc. {stream}",
            "term": "Fall 2026",
            "status": "Active Priority Enrollment",
            "provider": "local",
            "is_active": True,
            "is_onboarded": True,
            "email_verified": True,
            "created_at": now,
            "updated_at": now
        }
        await db["users"].insert_one(stu)
        student_users.append(stu)

    print("Creating Courses...")
    courses_data = [
        {"code": "CS301", "name": "Data Structures & Algorithms", "credits": 4, "sched": "Mon, Wed 10:00 – 11:30 AM", "room": "Turing Hall 102", "prereq": []},
        {"code": "CS304", "name": "Database Management Systems", "credits": 4, "sched": "Tue, Thu 02:00 – 03:30 PM", "room": "Ada Lab 4", "prereq": ["CS301"]},
        {"code": "SE319", "name": "Software Engineering", "credits": 4, "sched": "Mon, Fri 01:00 – 02:30 PM", "room": "Hall 204", "prereq": ["CS301"]},
        {"code": "MA201", "name": "Linear Algebra", "credits": 4, "sched": "Wed, Fri 08:30 – 10:00 AM", "room": "Gauss 11", "prereq": []},
        {"code": "AI401", "name": "Machine Learning Fundamentals", "credits": 4, "sched": "Tue, Thu 10:00 – 11:30 AM", "room": "Turing Hall 105", "prereq": ["CS301", "MA201"]},
        {"code": "CY201", "name": "Network Security", "credits": 3, "sched": "Mon, Wed 03:00 – 04:30 PM", "room": "Hopper Hall 201", "prereq": []},
        {"code": "IT210", "name": "Web Technologies", "credits": 3, "sched": "Tue, Thu 04:00 – 05:30 PM", "room": "Ada Lab 2", "prereq": []}
    ]
    
    courses = []
    for i, c in enumerate(courses_data):
        fac_obj = faculty_users[i % len(faculty_users)]
        course = {
            "code": c["code"],
            "course_code": c["code"],
            "name": c["name"],
            "course_name": c["name"],
            "credits": c["credits"],
            "faculty_name": fac_obj["full_name"],
            "instructor": fac_obj["full_name"],
            "capacity": 38,
            "enrolled_count": 0,
            "department": fac_obj["department"],
            "schedule": c["sched"],
            "room": c["room"],
            "prerequisites": c["prereq"],
            "description": f"Comprehensive study of {c['name']} covering foundational concepts and advanced applications at Westbridge University.",
            "status": "open",
            "term": "Fall 2026",
            "created_at": now,
            "updated_at": now
        }
        await db["courses"].insert_one(course)
        courses.append(course)

    print("Enrolling Students (Real Data Sync with Waitlist & Seat Offers)...")
    waitlist_trackers = {c["course_code"]: [] for c in courses}
    
    # Guarantee student #0 gets 3 registrations and 1 active waitlist offer
    # First, enroll all students into 3 courses
    for s_idx, stu in enumerate(student_users):
        enrolled_courses = random.sample(courses, 3)
        for c in enrolled_courses:
            code = c["course_code"]
            if c["enrolled_count"] < c["capacity"]:
                # Normal enrollment
                await db["registrations"].insert_one({
                    "student_id": stu["student_id"],
                    "roll_number": stu["roll_number"],
                    "course_code": code,
                    "course_name": c["course_name"],
                    "status": "enrolled",
                    "semester": "Fall",
                    "year": 2026,
                    "credits": c["credits"],
                    "created_at": now
                })
                c["enrolled_count"] += 1
                await db["courses"].update_one(
                    {"course_code": code},
                    {"$inc": {"enrolled_count": 1}}
                )
            else:
                # Capacity reached: spill into waitlist
                waitlist_trackers[code].append(stu)
                pos = len(waitlist_trackers[code])
                # Top 1-2 students on full course waitlist receive an active 24-hr seat offer
                is_offered = (pos <= 2) or (s_idx == 0)
                status_val = "offered" if is_offered else "waiting"
                offered_at = now if is_offered else None
                expires_at = (now + timedelta(hours=24)) if is_offered else None

                entry = {
                    "student_id": stu["student_id"],
                    "course_code": code,
                    "position": pos,
                    "status": status_val,
                    "joined_at": now,
                    "offered_at": offered_at,
                    "offer_expires_at": expires_at,
                    "updated_at": now
                }
                # Sync into both waitlist collections for unified compatibility
                await db["waitlists"].insert_one(entry)
                await db["waitlist_entries"].insert_one(entry.copy())

    # Ensure student #0 (default test user STU2024-00123) has an active 24-hr seat offer if not yet added
    stu0 = student_users[0]
    stu0_offer = await db["waitlist_entries"].find_one({"student_id": stu0["student_id"], "status": "offered"})
    if not stu0_offer:
        target_course = courses[1]["course_code"] # CS304
        offer_entry = {
            "student_id": stu0["student_id"],
            "course_code": target_course,
            "position": 1,
            "status": "offered",
            "joined_at": now,
            "offered_at": now,
            "offer_expires_at": now + timedelta(hours=24),
            "updated_at": now
        }
        await db["waitlists"].insert_one(offer_entry)
        await db["waitlist_entries"].insert_one(offer_entry.copy())

    # Update course statuses to "full" where capacity was reached
    for c in courses:
        if c["enrolled_count"] >= c["capacity"]:
            await db["courses"].update_one(
                {"course_code": c["course_code"]},
                {"$set": {"status": "full"}}
            )

    print("Seeding Complete! Database is fully synced.")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_data())
