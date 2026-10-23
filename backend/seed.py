
import json
import os
from datetime import date
from pathlib import Path

from werkzeug.security import generate_password_hash

from app import create_app
from app.models import db, User, Book


DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "bookleaf_sample_data.json"
)


def parse_date(value):
    return date.fromisoformat(value) if value else None


def seed_database():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Sample data not found: {DATA_FILE}")

    with DATA_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)

    authors = data["authors"]
    default_password = os.getenv("DEMO_AUTHOR_PASSWORD", "Author@12345")
    admin_password = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345")

    for record in authors:
        author_id = record["author_id"]

        user = db.session.get(User, author_id)

        if user is None:
            user = User(
                id=author_id,
                name=record["name"],
                email=record["email"].lower(),
                password_hash=generate_password_hash(default_password),
                role="author",
                phone=record.get("phone"),
                city=record.get("city"),
                joined_date=parse_date(record.get("joined_date")),
            )
            db.session.add(user)

        for book_data in record["books"]:
            book_id = book_data["book_id"]

            if db.session.get(Book, book_id):
                continue

            book = Book(
                id=book_id,
                author_id=author_id,
                title=book_data["title"],
                isbn=book_data.get("isbn"),
                genre=book_data.get("genre"),
                publication_date=parse_date(
                    book_data.get("publication_date")
                ),
                status=book_data["status"],
                mrp=book_data.get("mrp"),
                author_royalty_per_copy=book_data.get(
                    "author_royalty_per_copy"
                ),
                total_copies_sold=book_data.get(
                    "total_copies_sold", 0
                ),
                total_royalty_earned=book_data.get(
                    "total_royalty_earned", 0
                ),
                royalty_paid=book_data.get("royalty_paid", 0),
                royalty_pending=book_data.get("royalty_pending", 0),
                last_royalty_payout_date=parse_date(
                    book_data.get("last_royalty_payout_date")
                ),
                print_partner=book_data.get("print_partner"),
                available_on=book_data.get("available_on", []),
            )
            db.session.add(book)

    if db.session.get(User, "ADMIN001") is None:
        db.session.add(
            User(
                id="ADMIN001",
                name="BookLeaf Administrator",
                email="admin@bookleaf.demo",
                password_hash=generate_password_hash(admin_password),
                role="admin",
            )
        )

    db.session.commit()

    print(f"Authors in database: {User.query.filter_by(role='author').count()}")
    print(f"Books in database: {Book.query.count()}")
    print(f"Admins in database: {User.query.filter_by(role='admin').count()}")
    print("Database seeding completed successfully.")


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        seed_database()
