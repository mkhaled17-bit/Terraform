from datetime import datetime
from bson import ObjectId

def create_borrow_record(data):
    return {
        "member_id": ObjectId(data.get("member_id")),
        "book_id": ObjectId(data.get("book_id")),
        "borrow_date": datetime.utcnow(),
        "due_date": data.get("due_date"),
        "return_date": None,
        "status": "borrowed",
        "fine": 0
    }
