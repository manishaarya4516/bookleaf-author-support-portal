
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="author")
    phone = db.Column(db.String(30))
    city = db.Column(db.String(100))
    joined_date = db.Column(db.Date)

    books = db.relationship("Book", back_populates="author")
    tickets = db.relationship(
        "Ticket",
        back_populates="author",
        foreign_keys="Ticket.author_id"
    )


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.String(20), primary_key=True)
    author_id = db.Column(
        db.String(20), db.ForeignKey("users.id"), nullable=False
    )
    title = db.Column(db.String(255), nullable=False)
    isbn = db.Column(db.String(50))
    genre = db.Column(db.String(150))
    publication_date = db.Column(db.Date)
    status = db.Column(db.String(100), nullable=False)
    mrp = db.Column(db.Numeric(12, 2))
    author_royalty_per_copy = db.Column(db.Numeric(12, 2))
    total_copies_sold = db.Column(db.Integer, default=0)
    total_royalty_earned = db.Column(db.Numeric(12, 2), default=0)
    royalty_paid = db.Column(db.Numeric(12, 2), default=0)
    royalty_pending = db.Column(db.Numeric(12, 2), default=0)
    last_royalty_payout_date = db.Column(db.Date)
    print_partner = db.Column(db.String(100))
    available_on = db.Column(db.JSON, default=list)

    author = db.relationship("User", back_populates="books")


class Ticket(db.Model):
    __tablename__ = "tickets"

    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(
        db.String(20), db.ForeignKey("users.id"), nullable=False
    )
    book_id = db.Column(
        db.String(20), db.ForeignKey("books.id"), nullable=True
    )
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)

    status = db.Column(db.String(30), nullable=False, default="Open")
    category = db.Column(db.String(100), default="General Inquiry")
    priority = db.Column(db.String(20), default="Medium")

    assigned_admin_id = db.Column(
        db.String(20), db.ForeignKey("users.id"), nullable=True
    )

    created_at = db.Column(db.DateTime(timezone=True), default=utc_now)
    updated_at = db.Column(
        db.DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    author = db.relationship(
        "User", back_populates="tickets", foreign_keys=[author_id]
    )
    book = db.relationship("Book")
    assigned_admin = db.relationship("User", foreign_keys=[assigned_admin_id])

    messages = db.relationship(
        "TicketMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketMessage.created_at"
    )


class TicketMessage(db.Model):
    __tablename__ = "ticket_messages"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("tickets.id"), nullable=False
    )
    sender_id = db.Column(
        db.String(20), db.ForeignKey("users.id"), nullable=False
    )
    content = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now)

    ticket = db.relationship("Ticket", back_populates="messages")
    sender = db.relationship("User")


class AISuggestion(db.Model):
    __tablename__ = "ai_suggestions"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("tickets.id"), nullable=False
    )
    suggested_category = db.Column(db.String(100))
    suggested_priority = db.Column(db.String(20))
    draft_response = db.Column(db.Text)
    model_name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now)

    ticket = db.relationship("Ticket")
