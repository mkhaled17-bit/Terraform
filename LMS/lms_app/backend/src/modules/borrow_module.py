from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from src.db.mongo_connection import mongo
from src.db.modules.borrow_model import create_borrow_record

borrow_bp = Blueprint("borrow_bp", __name__)

# ---------------------------
# HELPER
# ---------------------------
def is_admin(user_id):
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    return user and user.get("role") == "admin"

# ---------------------------
# USER BORROW REQUEST
# ---------------------------
@borrow_bp.route("/request", methods=["POST"])
@jwt_required()
def request_borrow():
    user_id = get_jwt_identity()
    data = request.json
    book_id = data.get("book_id")

    book = mongo.db.books.find_one({"_id": ObjectId(book_id)})
    if not book or book["available_copies"] <= 0:
        return jsonify({"error": "Book unavailable"}), 400

    borrow_request = {
        "book_id": ObjectId(book_id),
        "user_id": ObjectId(user_id),
        "status": "pending",
        "requested_at": datetime.utcnow()
    }
    mongo.db.borrow_requests.insert_one(borrow_request)
    return jsonify({"message": "Borrow request submitted"}), 201

# ---------------------------
# ADMIN APPROVE/REJECT BORROW
# ---------------------------
@borrow_bp.route("/request/<request_id>", methods=["PUT"])
@jwt_required()
def approve_or_reject_borrow(request_id):
    data = request.json
    action = data.get("action")  # "approve" or "reject"

    request_doc = mongo.db.borrow_requests.find_one({"_id": ObjectId(request_id)})
    if not request_doc:
        return jsonify({"error": "Request not found"}), 404

    if action == "approve":
        borrow_data = {
            "member_id": request_doc["user_id"],
            "book_id": request_doc["book_id"],
            "due_date": datetime.utcnow() + timedelta(days=14)
        }
        mongo.db.borrow_records.insert_one(create_borrow_record(borrow_data))
        mongo.db.books.update_one({"_id": request_doc["book_id"]}, {"$inc": {"available_copies": -1}})
        mongo.db.borrow_requests.update_one({"_id": request_doc["_id"]}, {"$set": {"status": "approved"}})
        return jsonify({"message": "Borrow approved"}), 200

    elif action == "reject":
        mongo.db.borrow_requests.update_one({"_id": ObjectId(request_id)}, {"$set": {"status": "rejected"}})
        return jsonify({"message": "Borrow rejected"}), 200

    else:
        return jsonify({"error": "Invalid action"}), 400

# ---------------------------
# ADMIN MARK RETURNED
# ---------------------------
@borrow_bp.route("/return/<record_id>", methods=["PUT"])
@jwt_required()
def return_book(record_id):
    record = mongo.db.borrow_records.find_one({"_id": ObjectId(record_id)})
    if not record:
        return jsonify({"error": "Record not found"}), 404

    mongo.db.borrow_records.update_one(
        {"_id": record["_id"]},
        {"$set": {"return_date": datetime.utcnow(), "status": "returned"}}
    )
    mongo.db.books.update_one({"_id": record["book_id"]}, {"$inc": {"available_copies": 1}})
    return jsonify({"message": "Book returned"}), 200

# ---------------------------
# CURRENT USER BORROWS
# ---------------------------
@borrow_bp.route("/my-borrows", methods=["GET"])
@jwt_required()
def get_my_borrows():
    current_user_id = get_jwt_identity()

    # Only borrowed books (all statuses included if needed, currently shows all)
    query = {"member_id": ObjectId(current_user_id)}
    borrows = list(mongo.db.borrow_records.find(query))

    for b in borrows:
        b["_id"] = str(b["_id"])
        b["book_id"] = str(b["book_id"])
        b["member_id"] = str(b["member_id"])

    return jsonify(borrows), 200

# ---------------------------
# ADMIN: ALL BORROW ACTIVITY
# ---------------------------
@borrow_bp.route("/admin/borrows", methods=["GET"])
@jwt_required()
def admin_get_all_borrows():
    current_user_id = get_jwt_identity()
    if not is_admin(current_user_id):
        return jsonify({"error": "Access denied"}), 403

    # Helper to get book info
    def get_book_info(book_id):
        book = mongo.db.books.find_one({"_id": ObjectId(book_id)})
        if book:
            return {
                "title": book.get("title", "Unknown"),
                "available": book.get("available_copies", 0)
            }
        return {"title": "Unknown", "available": 0}

    # Helper to get username
    def get_username(user_id):
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            return user.get("username", "Unknown")
        return "Unknown"

    # Requested books
    requested = list(mongo.db.borrow_requests.find({"status": "pending"}))
    for r in requested:
        r["_id"] = str(r["_id"])
        r["book_id"] = str(r["book_id"])
        r["user_id"] = str(r["user_id"])
        book_info = get_book_info(r["book_id"])
        r["book_name"] = book_info["title"]
        r["available_quantity"] = book_info["available"]
        r["username"] = get_username(r["user_id"])

    # Currently borrowed books
    borrowed = list(mongo.db.borrow_records.find({"status": "borrowed"}))
    for b in borrowed:
        b["_id"] = str(b["_id"])
        b["book_id"] = str(b["book_id"])
        b["member_id"] = str(b["member_id"])
        book_info = get_book_info(b["book_id"])
        b["book_name"] = book_info["title"]
        b["available_quantity"] = book_info["available"]
        b["username"] = get_username(b["member_id"])

    # Returned books
    returned = list(mongo.db.borrow_records.find({"status": "returned"}))
    for r in returned:
        r["_id"] = str(r["_id"])
        r["book_id"] = str(r["book_id"])
        r["member_id"] = str(r["member_id"])
        book_info = get_book_info(r["book_id"])
        r["book_name"] = book_info["title"]
        r["available_quantity"] = book_info["available"]
        r["username"] = get_username(r["member_id"])

    return jsonify({
        "requested": requested,
        "borrowed": borrowed,
        "returned": returned
    }), 200
