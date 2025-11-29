from datetime import datetime

def create_member(data):
    return {
        "member_id": data.get("member_id"),
        "name": data.get("name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "address": data.get("address"),
        "joined_date": datetime.utcnow(),
        "status": "active"
    }
