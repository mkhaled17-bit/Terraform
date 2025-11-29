from datetime import datetime
from bson import ObjectId

def create_book(data, added_by_id):
    return {
        "title": data.get("title"),
        "author": data.get("author"),
        "isbn": data.get("isbn"),
        "category": data.get("category"),
        "quantity": data.get("quantity", 1),
        "available_copies": data.get("available_copies", data.get("quantity", 1)),
        "added_by": ObjectId(added_by_id),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
