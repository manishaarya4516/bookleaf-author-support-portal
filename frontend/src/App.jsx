
import { AuthorTickets, AdminTickets } from "./TicketPages.jsx";
import { useEffect, useState } from "react";

const API = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("priya.sharma@email.com");
  const [password, setPassword] = useState("Author@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page d-flex align-items-center justify-content-center p-3">
      <div className="card shadow-sm border-0 login-card">
        <div className="card-body p-4 p-md-5">
          <div className="brand-icon mb-3">
            <i className="bi bi-book-half" />
          </div>
          <h2 className="fw-bold mb-1">BookLeaf</h2>
          <p className="text-secondary mb-4">
            Author Support & Communication Portal
          </p>

          <h5 className="fw-semibold">Welcome back</h5>
          <p className="text-secondary small">
            Sign in to manage your books and support requests.
          </p>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={submit}>
            <label className="form-label fw-medium">Email address</label>
            <input
              className="form-control mb-3"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className="form-label fw-medium">Password</label>
            <input
              className="form-control mb-4"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button className="btn btn-primary w-100 py-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="demo-hint mt-4">
            <strong>Demo accounts</strong>
            <div className="mt-2">
              <button
                className="btn btn-sm btn-outline-secondary me-2 mb-2"
                onClick={() => {
                  setEmail("priya.sharma@email.com");
                  setPassword("Author@12345");
                }}
              >
                Author
              </button>
              <button
                className="btn btn-sm btn-outline-secondary mb-2"
                onClick={() => {
                  setEmail("admin@bookleaf.demo");
                  setPassword("Admin@12345");
                }}
              >
                Administrator
              </button>
            </div>
            <small className="text-secondary">
              Demo credentials are for local testing only.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

function Books({ user }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    request("/books")
      .then((data) => {
        if (active) setBooks(data.books || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currency = (value) =>
    value == null
      ? "—"
      : `₹${Number(value).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}`;

  return (
    <>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">My Books</h3>
        <p className="text-secondary">
          Welcome, {user.name}. View your published and in-production books.
        </p>
      </div>

      {loading && <div className="alert alert-info">Loading books...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card stat-card">
                <div className="card-body">
                  <span className="text-secondary">Total books</span>
                  <h2 className="fw-bold mt-2">{books.length}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card stat-card">
                <div className="card-body">
                  <span className="text-secondary">Copies sold</span>
                  <h2 className="fw-bold mt-2">
                    {books
                      .reduce((sum, book) => sum + Number(book.total_copies_sold || 0), 0)
                      .toLocaleString("en-IN")}
                  </h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card stat-card">
                <div className="card-body">
                  <span className="text-secondary">Pending royalties</span>
                  <h2 className="fw-bold mt-2">
                    {currency(
                      books.reduce(
                        (sum, book) => sum + Number(book.royalty_pending || 0),
                        0
                      )
                    )}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {books.map((book) => (
              <div className="col-lg-6" key={book.id}>
                <div className="card book-card h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between gap-2">
                      <div>
                        <h5 className="fw-bold mb-1">{book.title}</h5>
                        <span className="text-secondary small">
                          {book.genre || "Genre not specified"}
                        </span>
                      </div>
                      <span className="badge text-bg-light align-self-start">
                        {book.status}
                      </span>
                    </div>

                    <hr />

                    <div className="row g-3 small">
                      <div className="col-6">
                        <span className="text-secondary d-block">ISBN</span>
                        <strong>{book.isbn || "Pending"}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary d-block">MRP</span>
                        <strong>{currency(book.mrp)}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary d-block">Copies sold</span>
                        <strong>{book.total_copies_sold ?? 0}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary d-block">
                          Royalties earned
                        </span>
                        <strong>{currency(book.total_royalty_earned)}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary d-block">
                          Royalties paid
                        </span>
                        <strong>{currency(book.royalty_paid)}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary d-block">
                          Royalties pending
                        </span>
                        <strong>{currency(book.royalty_pending)}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary d-block">
                          Publication date
                        </span>
                        <strong>{book.publication_date || "Not yet published"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("books");

  async function logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setUser(null);
    setPage("books");
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <i className="bi bi-book-half me-2" />
          BookLeaf
        </div>

        <div className="sidebar-caption">
          {user.role === "admin" ? "ADMINISTRATION" : "AUTHOR PORTAL"}
        </div>

        {/* AUTHOR NAVIGATION */}
        {user.role === "author" ? (
          <>
            <button
              className={`nav-button ${page === "books" ? "active" : ""}`}
              onClick={() => setPage("books")}
            >
              <i className="bi bi-journal-bookmark me-2" />
              My Books
            </button>

            <button
              className={`nav-button ${page === "tickets" ? "active" : ""}`}
              onClick={() => setPage("tickets")}
            >
              <i className="bi bi-chat-left-text me-2" />
              Support Tickets
            </button>
          </>
        ) : (
          /* ADMIN NAVIGATION */
          <button
            className="nav-button active"
            onClick={() => setPage("admin")}
          >
            <i className="bi bi-inboxes me-2" />
            Admin Dashboard
          </button>
        )}

        {/* SIDEBAR FOOTER */}
        <div className="sidebar-bottom">
          <div className="small mb-2">{user.name}</div>

          <button
            className="btn btn-outline-light btn-sm w-100"
            onClick={logout}
          >
            <i className="bi bi-box-arrow-right me-2" />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {user.role === "author" ? (
          page === "books" ? (
            <Books user={user} />
          ) : (
            <AuthorTickets />
          )
        ) : (
          <AdminTickets />
        )}
      </main>
    </div>
  );
}
