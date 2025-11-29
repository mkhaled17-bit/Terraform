import os
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
from flask import send_from_directory
from bson import ObjectId
from src.db.mongo_connection import mongo


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/html"))

user_bp = Blueprint("user_bp", __name__)

# ---------------------------
# USER SIGNUP
# ---------------------------
@user_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")  # default role = "user"

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    # Check if username already exists
    if mongo.db.users.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 400

    # Create new user
    new_user = {
        "username": username,
        "password_hash": generate_password_hash(password),
        "role": role,
        "linked_member_id": None,
        "created_at": datetime.utcnow(),
        "last_login": None
    }

    mongo.db.users.insert_one(new_user)

    return jsonify({"message": "User registered successfully"}), 201


# ---------------------------
# USER LOGIN
# ---------------------------
@user_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = mongo.db.users.find_one({"username": username})
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    # Generate JWT
    token = create_access_token(identity=str(user["_id"]))

    # Update last login
    mongo.db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    # Determine dashboard route based on role
    if user["role"] == "admin":
        dashboard_url = "/api/users/admin-dashboard"
    else:
        dashboard_url = "/api/users/dashboard"

    return jsonify({
        "message": "Login successful",
        "token": token,
        "role": user["role"],
        "redirect_to": dashboard_url
    }), 200


@user_bp.route("/admin-dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

    if not user or user["role"] != "admin":
        return jsonify({"error": "Access denied"}), 403

    return send_from_directory(BASE_DIR, "admin-dashboard.html")


@user_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def user_dashboard():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})

    if not user or user["role"] != "user":
        return jsonify({"error": "Access denied"}), 403

    return send_from_directory(BASE_DIR, "dashboard.html")
