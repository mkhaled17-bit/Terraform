from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from src.db.mongo_connection import mongo
from src.db.modules.book_model import create_book

book_bp = Blueprint("book_bp", __name__)

#  Add a new book (Admin only)
@book_bp.route("/books", methods=["POST"])
@jwt_required()
def add_book():
    current_user_id = get_jwt_identity()
    data = request.json

    if not all([data.get("title"), data.get("author"), data.get("isbn")]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        data["available_copies"] = int(data.get("available_copies", 1))
    except ValueError:
        return jsonify({"error": "available_copies must be a number"}), 400

    new_book = create_book(data, current_user_id)
    mongo.db.books.insert_one(new_book)
    return jsonify({"message": "Book added successfully"}), 201


#  Edit book
@book_bp.route("/books/<book_id>", methods=["PUT"])
@jwt_required()
def update_book(book_id):
    data = request.json
    updates = {key: value for key, value in data.items() if key in ["title", "author", "isbn", "category", "quantity"]}
    updates["updated_at"] = datetime.utcnow()

    mongo.db.books.update_one({"_id": ObjectId(book_id)}, {"$set": updates})
    return jsonify({"message": "Book updated successfully"}), 200


# Delete book
@book_bp.route("/books/<book_id>", methods=["DELETE"])
@jwt_required()
def delete_book(book_id):
    mongo.db.books.delete_one({"_id": ObjectId(book_id)})
    return jsonify({"message": "Book deleted successfully"}), 200


#  View all books
@book_bp.route("/books", methods=["GET"])
@jwt_required(optional=True)
def get_books():
    books = list(mongo.db.books.find({}, {"_id": 1, "title": 1, "author": 1, "category": 1, "available_copies": 1}))
    for b in books:
        b["_id"] = str(b["_id"])
    return jsonify(books), 200
