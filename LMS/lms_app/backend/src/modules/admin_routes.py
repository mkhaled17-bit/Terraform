from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from werkzeug.security import generate_password_hash
from datetime import datetime
from src.db.mongo_connection import mongo

admin_bp = Blueprint("admin_bp", __name__)

def is_admin(user_id):
    """Check if current user is admin"""
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    return user and user.get("role") == "admin"


#  Create User (Admin Only)
@admin_bp.route("/users", methods=["POST"])
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    if not is_admin(current_user_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.json
    if not data.get("username") or not data.get("password"):
        return jsonify({"error": "Username and password required"}), 400

    if mongo.db.users.find_one({"username": data["username"]}):
        return jsonify({"error": "Username already exists"}), 400

    new_user = {
        "username": data["username"],
        "password_hash": generate_password_hash(data["password"]),
        "role": "user",  #  force user role (not admin)
        "created_at": datetime.utcnow(),
        "last_login": None
    }

    mongo.db.users.insert_one(new_user)
    return jsonify({"message": "User created successfully"}), 201


# Get All Users (Admin Only)
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def get_all_users():
    current_user_id = get_jwt_identity()
    if not is_admin(current_user_id):
        return jsonify({"error": "Access denied"}), 403

    users = list(mongo.db.users.find({}, {"password_hash": 0}))
    for u in users:
        u["_id"] = str(u["_id"])
    return jsonify(users), 200


#  Update User (Admin Only)
@admin_bp.route("/users/<user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    if not is_admin(current_user_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.json
    update_fields = {}
    if "username" in data:
        update_fields["username"] = data["username"]
    if "password" in data:
        update_fields["password_hash"] = generate_password_hash(data["password"])
    if "status" in data:
        update_fields["status"] = data["status"]

    if not update_fields:
        return jsonify({"error": "No valid fields provided"}), 400

    result = mongo.db.users.update_one(
        {"_id": ObjectId(user_id), "role": {"$ne": "admin"}},  # prevent changing admins
        {"$set": update_fields}
    )

    if result.modified_count == 0:
        return jsonify({"error": "User not found or cannot modify admin"}), 404

    return jsonify({"message": "User updated successfully"}), 200


#  Delete User (Admin Only)
@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if not is_admin(current_user_id):
        return jsonify({"error": "Access denied"}), 403

    result = mongo.db.users.delete_one(
        {"_id": ObjectId(user_id), "role": {"$ne": "admin"}}  # prevent deleting admins
    )

    if result.deleted_count == 0:
        return jsonify({"error": "User not found or cannot delete admin"}), 404

    return jsonify({"message": "User deleted successfully"}), 200
