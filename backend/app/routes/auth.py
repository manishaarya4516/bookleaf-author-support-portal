from functools import wraps
from flask import Blueprint, jsonify, request, session, g
from werkzeug.security import check_password_hash
from app.models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = session.get('user_id')
        user = db.session.get(User, user_id) if user_id else None
        if user is None:
            session.clear()
            return jsonify(error='Authentication required'), 401
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if g.current_user.role != 'admin':
            return jsonify(error='Admin access required'), 403
        return fn(*args, **kwargs)
    return wrapper


def user_json(user):
    return {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}


@auth_bp.post('/login')
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Expected a JSON object'), 400
    email = data.get('email')
    password = data.get('password')
    if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not password:
        return jsonify(error='Email and password are required'), 400
    user = db.session.execute(db.select(User).filter_by(email=email.strip().lower())).scalar_one_or_none()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify(error='Invalid email or password'), 401
    session.clear()
    session['user_id'] = user.id
    session.permanent = True
    return jsonify(user=user_json(user))


@auth_bp.get('/me')
@login_required
def me():
    return jsonify(user=user_json(g.current_user))


@auth_bp.post('/logout')
@login_required
def logout():
    session.clear()
    return jsonify(message='Logged out')
