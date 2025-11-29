from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from src.db.mongo_connection import mongo

search_bp = Blueprint("search_bp", __name__)

@search_bp.route("/books/search", methods=["GET"])
@jwt_required()
def search_books():
    user_id = get_jwt_identity()
    
    query_param = request.args.get("q", None)
    query = {}
    if query_param:
        query["title"] = {"$regex": query_param, "$options": "i"}

    # Role check
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    is_admin = user and user.get("role") == "admin"

    if not is_admin:
        query["available_copies"] = {"$gt": 0}

    books = list(mongo.db.books.find(query))
    for b in books:
        b["_id"] = str(b["_id"])

    return jsonify(books), 200
