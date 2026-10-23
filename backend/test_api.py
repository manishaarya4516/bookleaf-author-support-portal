import pytest
from werkzeug.security import generate_password_hash
from app import create_app
from app.models import db, User, Book

@pytest.fixture
def client():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:', 'SECRET_KEY': 'test-secret'})
    with app.app_context():
        db.session.add_all([
            User(id='AUTH001', name='Author 1', email='author@test.com', role='author', password_hash=generate_password_hash('password')),
            User(id='AUTH002', name='Author 2', email='other@test.com', role='author', password_hash=generate_password_hash('password')),
            User(id='ADMIN001', name='Admin', email='admin@test.com', role='admin', password_hash=generate_password_hash('password')),
        ])
        db.session.add_all([Book(id='BK001', author_id='AUTH001', title='Book 1', status='Published & Live'), Book(id='BK002', author_id='AUTH002', title='Book 2', status='Published & Live')])
        db.session.commit()
    return app.test_client()

def login(client, email):
    return client.post('/api/auth/login', json={'email': email, 'password': 'password'})

def test_auth_and_access(client):
    assert client.get('/api/books').status_code == 401
    assert login(client, 'author@test.com').status_code == 200
    books = client.get('/api/books').json['books']
    assert [b['id'] for b in books] == ['BK001']
    assert client.post('/api/tickets', json={'book_id': 'BK002', 'subject': 'Issue', 'description': 'Help'}).status_code == 404
    created = client.post('/api/tickets', json={'book_id': 'BK001', 'subject': 'Issue', 'description': 'Help'})
    assert created.status_code == 201
    ticket_id = created.json['ticket']['id']
    assert client.patch(f'/api/tickets/{ticket_id}', json={'status': 'Resolved'}).status_code == 403
    assert client.post('/api/auth/logout').status_code == 200
    assert login(client, 'other@test.com').status_code == 200
    assert client.get(f'/api/tickets/{ticket_id}').status_code == 404
    assert login(client, 'admin@test.com').status_code == 200
    assert client.patch(f'/api/tickets/{ticket_id}', json={'priority': 'High', 'assign_to_me': True}).status_code == 200
    assert client.post(f'/api/tickets/{ticket_id}/messages', json={'content': 'Private note', 'is_internal': True}).status_code == 201
    assert client.post(f'/api/tickets/{ticket_id}/messages', json={'content': 'We will investigate'}).status_code == 201
    assert login(client, 'author@test.com').status_code == 200
    messages = client.get(f'/api/tickets/{ticket_id}').json['ticket']['messages']
    assert [m['content'] for m in messages] == ['We will investigate']
