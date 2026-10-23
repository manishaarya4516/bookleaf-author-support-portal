from flask import Blueprint, jsonify
from app.models import db, Ticket, AISuggestion
from app.routes.auth import admin_required
from app.services.ai import suggest, MODEL

ai_bp = Blueprint('ai', __name__, url_prefix='/api/admin')


@ai_bp.post('/tickets/<int:ticket_id>/ai-suggest')
@admin_required
def generate_suggestion(ticket_id):
    ticket = db.session.get(Ticket, ticket_id)
    if ticket is None:
        return jsonify(error='Ticket not found'), 404
    try:
        result = suggest(ticket, ticket.book)
    except Exception:
        # Do not leak API keys, model response details or internal exceptions.
        return jsonify(error='AI temporarily unavailable. Ticket and manual replies remain available.'), 503
    saved = AISuggestion(
        ticket_id=ticket.id,
        suggested_category=result['category'],
        suggested_priority=result['priority'],
        draft_response=result['draft_response'],
        model_name=MODEL
    )
    db.session.add(saved)
    db.session.commit()
    return jsonify(suggestion={
        'id': saved.id,
        'ticket_id': saved.ticket_id,
        'category': saved.suggested_category,
        'priority': saved.suggested_priority,
        'draft_response': saved.draft_response,
        'model': saved.model_name
    })
