from datetime import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash

def create_user(data):
    return {
        "username": data.get("username"),
        "password_hash": generate_password_hash(data.get("password")),
        "role": data.get("role", "user"),
        "linked_member_id": ObjectId(data["linked_member_id"]) if data.get("linked_member_id") else None,
        "created_at": datetime.utcnow(),
        "last_login": None
    }
