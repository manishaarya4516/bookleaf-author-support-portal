from datetime import date, datetime, timezone
from flask import Blueprint, jsonify, request, g
from sqlalchemy import or_
from app.models import db, Book, Ticket, TicketMessage
from app.routes.auth import login_required, admin_required

api_bp = Blueprint('api', __name__, url_prefix='/api')
CATEGORIES = ('Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry')
PRIORITIES = ('Critical', 'High', 'Medium', 'Low')
STATUSES = ('Open', 'In Progress', 'Resolved', 'Closed')


def error(message, code=400):
    return jsonify(error=message), code


def iso(value):
    return value.isoformat() if value else None


def book_json(book):
    fields = ('id', 'author_id', 'title', 'isbn', 'genre', 'publication_date', 'status', 'mrp', 'author_royalty_per_copy', 'total_copies_sold', 'total_royalty_earned', 'royalty_paid', 'royalty_pending', 'last_royalty_payout_date', 'print_partner', 'available_on')
    return {key: float(value) if hasattr(value, 'as_tuple') else iso(value) if isinstance(value, (date, datetime)) else value for key in fields for value in [getattr(book, key)]}


def message_json(message):
    return {'id': message.id, 'sender_id': message.sender_id, 'content': message.content, 'is_internal': message.is_internal, 'created_at': iso(message.created_at)}


def ticket_json(ticket, details=False):
    result = {'id': ticket.id, 'author_id': ticket.author_id, 'book_id': ticket.book_id, 'subject': ticket.subject, 'description': ticket.description, 'status': ticket.status, 'category': ticket.category, 'priority': ticket.priority, 'assigned_admin_id': ticket.assigned_admin_id, 'created_at': iso(ticket.created_at), 'updated_at': iso(ticket.updated_at)}
    if details:
        result['messages'] = [message_json(m) for m in ticket.messages if g.current_user.role == 'admin' or not m.is_internal]
    return result


def get_ticket(ticket_id):
    ticket = db.session.get(Ticket, ticket_id)
    if ticket is None or (g.current_user.role != 'admin' and ticket.author_id != g.current_user.id):
        return None
    return ticket


def json_object():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@api_bp.get('/books')
@login_required
def books():
    query = db.select(Book).order_by(Book.id)
    if g.current_user.role != 'admin':
        query = query.where(Book.author_id == g.current_user.id)
    return jsonify(books=[book_json(b) for b in db.session.execute(query).scalars()])


@api_bp.get('/tickets')
@login_required
def tickets():
    query = db.select(Ticket)
    if g.current_user.role != 'admin':
        query = query.where(Ticket.author_id == g.current_user.id)
    else:
        for field, allowed in (('status', STATUSES), ('category', CATEGORIES), ('priority', PRIORITIES)):
            value = request.args.get(field)
            if value:
                if value not in allowed:
                    return error(f'Invalid {field}')
                query = query.where(getattr(Ticket, field) == value)
        start = request.args.get('from_date')
        end = request.args.get('to_date')
        try:
            if start:
                query = query.where(Ticket.created_at >= datetime.combine(date.fromisoformat(start), datetime.min.time()))
            if end:
                query = query.where(Ticket.created_at < datetime.combine(date.fromisoformat(end), datetime.max.time()))
        except ValueError:
            return error('Dates must use YYYY-MM-DD')
    priority_order = db.case((Ticket.priority == 'Critical', 0), (Ticket.priority == 'High', 1), (Ticket.priority == 'Medium', 2), else_=3)
    query = query.order_by(db.case((Ticket.status.in_(['Resolved', 'Closed']), 1), else_=0), priority_order, Ticket.created_at.asc())
    return jsonify(tickets=[ticket_json(t) for t in db.session.execute(query).scalars()])


@api_bp.post('/tickets')
@login_required
def create_ticket():
    if g.current_user.role != 'author':
        return error('Only authors can create tickets', 403)
    data = json_object()
    if data is None:
        return error('Expected a JSON object')
    subject, description = data.get('subject'), data.get('description')
    if not isinstance(subject, str) or not 1 <= len(subject.strip()) <= 200:
        return error('Subject must be 1-200 characters')
    if not isinstance(description, str) or not 1 <= len(description.strip()) <= 10000:
        return error('Description must be 1-10000 characters')
    book_id = data.get('book_id') or None
    if book_id is not None:
        if not isinstance(book_id, str):
            return error('Invalid book_id')
        book = db.session.get(Book, book_id)
        if book is None or book.author_id != g.current_user.id:
            return error('Book not found for this author', 404)
    ticket = Ticket(author_id=g.current_user.id, book_id=book_id, subject=subject.strip(), description=description.strip())
    db.session.add(ticket)
    db.session.commit()
    return jsonify(ticket=ticket_json(ticket)), 201


@api_bp.get('/tickets/<int:ticket_id>')
@login_required
def ticket_detail(ticket_id):
    ticket = get_ticket(ticket_id)
    if ticket is None:
        return error('Ticket not found', 404)
    return jsonify(ticket=ticket_json(ticket, details=True))


@api_bp.patch('/tickets/<int:ticket_id>')
@admin_required
def update_ticket(ticket_id):
    ticket = get_ticket(ticket_id)
    if ticket is None:
        return error('Ticket not found', 404)
    data = json_object()
    if data is None:
        return error('Expected a JSON object')
    if not data or any(key not in ('status', 'category', 'priority', 'assign_to_me') for key in data):
        return error('Invalid update fields')
    for field, allowed in (('status', STATUSES), ('category', CATEGORIES), ('priority', PRIORITIES)):
        if field in data:
            if data[field] not in allowed:
                return error(f'Invalid {field}')
            setattr(ticket, field, data[field])
    if 'assign_to_me' in data:
        if not isinstance(data['assign_to_me'], bool):
            return error('assign_to_me must be a boolean')
        ticket.assigned_admin_id = g.current_user.id if data['assign_to_me'] else None
    ticket.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(ticket=ticket_json(ticket))


@api_bp.post('/tickets/<int:ticket_id>/messages')
@admin_required
def send_message(ticket_id):
    ticket = get_ticket(ticket_id)
    if ticket is None:
        return error('Ticket not found', 404)
    data = json_object()
    if data is None:
        return error('Expected a JSON object')
    content = data.get('content')
    internal = data.get('is_internal', False)
    if not isinstance(content, str) or not 1 <= len(content.strip()) <= 10000:
        return error('Message must be 1-10000 characters')
    if not isinstance(internal, bool):
        return error('is_internal must be a boolean')
    message = TicketMessage(ticket_id=ticket.id, sender_id=g.current_user.id, content=content.strip(), is_internal=internal)
    db.session.add(message)
    ticket.updated_at = datetime.now(timezone.utc)
    if not internal and ticket.status == 'Open':
        ticket.status = 'In Progress'
    db.session.commit()
    return jsonify(message=message_json(message)), 201



@api_bp.get("/admin/tickets")
def admin_ticket_queue():
    from flask import jsonify, session
    from app.models import db, User, Ticket

    # Find the authenticated user from the session.
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    current_user = db.session.get(User, user_id)

    if current_user is None or current_user.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    tickets = Ticket.query.order_by(
        Ticket.created_at.desc()
    ).all()

    results = []

    for ticket in tickets:
        results.append({
            "id": ticket.id,
            "author_id": ticket.author_id,
            "author_name": ticket.author.name,
            "book_id": ticket.book_id,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "category": ticket.category,
            "priority": ticket.priority,
            "assigned_admin_id": ticket.assigned_admin_id,
            "created_at": ticket.created_at.isoformat(),
            "updated_at": ticket.updated_at.isoformat(),
        })

    return jsonify({"tickets": results}), 200
