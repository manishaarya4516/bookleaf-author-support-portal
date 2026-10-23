
import { useCallback, useEffect, useState } from "react";

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function TicketCard({ ticket, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card w-100 text-start border-0 shadow-sm mb-3 ${
        selected ? "border-start border-primary border-4" : ""
      }`}
    >
      <div className="card-body">
        <div className="d-flex justify-content-between gap-2">
          <strong>
            #{ticket.id} — {ticket.subject}
          </strong>
          <span className="badge text-bg-light align-self-start">
            {ticket.status}
          </span>
        </div>

        <div className="text-secondary small mt-2">
          {ticket.author_name || ticket.book_id || "General inquiry"}
        </div>

        <p className="small text-secondary mt-2 mb-2">
          {ticket.description}
        </p>

        <div className="small">
          <span className="me-3">{ticket.category}</span>
          <span>{ticket.priority}</span>
        </div>
      </div>
    </button>
  );
}

function MessageHistory({ ticket, admin }) {
  const messages = ticket?.messages || [];

  return (
    <div className="mt-4">
      <h6 className="fw-bold mb-3">Conversation History</h6>

      {messages.length === 0 ? (
        <div className="text-secondary small border rounded p-3">
          No replies yet.
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {messages
            .filter((message) => admin || !message.is_internal)
            .map((message) => (
              <div
                key={message.id}
                className={`rounded p-3 ${
                  message.is_internal
                    ? "bg-warning-subtle border border-warning"
                    : "bg-light border"
                }`}
              >
                <div className="d-flex justify-content-between gap-2 mb-2">
                  <strong className="small">
                    {message.sender_name ||
                      message.sender_id ||
                      "BookLeaf Support"}
                  </strong>

                  {message.is_internal && (
                    <span className="badge text-bg-warning">
                      Internal Note
                    </span>
                  )}
                </div>

                <div style={{ whiteSpace: "pre-wrap" }}>
                  {message.content}
                </div>

                <div className="text-secondary small mt-2">
                  {message.created_at
                    ? new Date(message.created_at).toLocaleString()
                    : ""}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function AuthorTickets() {
  const [tickets, setTickets] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [bookId, setBookId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/tickets");
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();

    api("/books")
      .then((data) => setBooks(data.books || []))
      .catch((err) => setError(err.message));

    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const data = await api(`/tickets/${selectedId}`);
        if (active) setDetail(data.ticket);
      } catch (err) {
        if (active) setError(err.message);
      }
    };

    load();
    const timer = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);

  async function submitTicket(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await api("/tickets", {
        method: "POST",
        body: JSON.stringify({
          book_id: bookId || null,
          subject,
          description,
        }),
      });

      setSubject("");
      setDescription("");
      setBookId("");

      setNotice(`Ticket #${data.ticket.id} created successfully.`);
      setSelectedId(data.ticket.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="fw-bold">Support Tickets</h3>
      <p className="text-secondary">
        Contact BookLeaf support and track your requests.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Create Support Ticket</h5>

              <form onSubmit={submitTicket}>
                <label className="form-label">Related book</label>

                <select
                  className="form-select mb-3"
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                >
                  <option value="">General inquiry</option>

                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>

                <label className="form-label">Subject</label>

                <input
                  className="form-control mb-3"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  required
                />

                <label className="form-label">Description</label>

                <textarea
                  className="form-control mb-3"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={10000}
                  required
                />

                <label className="form-label">
                  Attachment (UI only)
                </label>

                <input
                  type="file"
                  className="form-control mb-2"
                  disabled
                />

                <div className="small text-secondary mb-3">
                  File uploads are not enabled in this demo.
                </div>

                <button
                  className="btn btn-primary w-100"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <h5 className="fw-bold mb-3">
            My Tickets ({tickets.length})
          </h5>

          {tickets.length === 0 && (
            <div className="alert alert-light">
              You have not submitted any tickets.
            </div>
          )}

          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              selected={selectedId === ticket.id}
              onClick={() => setSelectedId(ticket.id)}
            />
          ))}

          {detail && (
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between">
                  <h5 className="fw-bold">
                    Ticket #{detail.id}
                  </h5>

                  <button
                    className="btn-close"
                    aria-label="Close ticket details"
                    onClick={() => setSelectedId(null)}
                  />
                </div>

                <h6>{detail.subject}</h6>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {detail.description}
                </p>

                <div className="small text-secondary">
                  Status: <strong>{detail.status}</strong>
                </div>

                <MessageHistory ticket={detail} admin={false} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    category: "",
    priority: "",
    from_date: "",
    to_date: "",
  });

  const [status, setStatus] = useState("Open");
  const [category, setCategory] = useState("General Inquiry");
  const [priority, setPriority] = useState("Medium");
  const [assigned, setAssigned] = useState(false);

  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/admin/tickets");
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();

    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const loadDetail = useCallback(async (id) => {
    try {
      const data = await api(`/tickets/${id}`);
      setDetail(data.ticket);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }

    loadDetail(selectedId);

    const timer = setInterval(() => {
      loadDetail(selectedId);
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedId, loadDetail]);

  function selectTicket(ticket) {
    setSelectedId(ticket.id);
    setStatus(ticket.status);
    setCategory(ticket.category);
    setPriority(ticket.priority);
    setAssigned(Boolean(ticket.assigned_admin_id));

    setDraft("");
    setSuggestion(null);
    setNotice("");
    setError("");
  }

  async function saveTicket() {
    if (selectedId === null) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api(`/tickets/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          category,
          priority,
          assign_to_me: assigned,
        }),
      });

      setNotice("Ticket updated successfully.");
      await refresh();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateAI() {
    if (selectedId === null) return;

    setLoadingAI(true);
    setError("");
    setNotice("");

    try {
      const data = await api(
        `/admin/tickets/${selectedId}/ai-suggest`,
        { method: "POST" }
      );

      const result = data.suggestion;

      setSuggestion(result);
      setDraft(result?.draft_response || "");
      setInternal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAI(false);
    }
  }

  async function sendReply() {
    if (selectedId === null || !draft.trim()) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api(`/tickets/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: draft.trim(),
          is_internal: internal,
        }),
      });

      setDraft("");
      setSuggestion(null);

      setNotice(
        internal
          ? "Internal note saved. Authors cannot see it."
          : "Reply sent successfully."
      );

      await loadDetail(selectedId);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const visibleTickets = tickets.filter((ticket) => {
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.category && ticket.category !== filters.category) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;

    const created = ticket.created_at?.slice(0, 10);

    if (filters.from_date && created < filters.from_date) return false;
    if (filters.to_date && created > filters.to_date) return false;

    return true;
  });

  function filterField(label, key, options) {
    return (
      <div className="col-md-4">
        <label className="form-label small">{label}</label>

        <select
          className="form-select form-select-sm"
          value={filters[key]}
          onChange={(e) =>
            setFilters((current) => ({
              ...current,
              [key]: e.target.value,
            }))
          }
        >
          <option value="">All</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <h3 className="fw-bold">Admin Ticket Dashboard</h3>

      <p className="text-secondary">
        Manage support requests and AI-assisted responses.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="row g-3 mb-4">
        {[
          ["Total Tickets", tickets.length],
          ["Open Tickets", tickets.filter((t) => t.status === "Open").length],
          [
            "High / Critical",
            tickets.filter((t) =>
              ["High", "Critical"].includes(t.priority)
            ).length,
          ],
        ].map(([label, value]) => (
          <div className="col-md-4" key={label}>
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-secondary">{label}</div>
                <h2 className="fw-bold mb-0">{value}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold">Filter Tickets</h6>

          <div className="row g-3">
            {filterField("Status", "status", STATUSES)}
            {filterField("Category", "category", CATEGORIES)}
            {filterField("Priority", "priority", PRIORITIES)}

            <div className="col-md-4">
              <label className="form-label small">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.from_date}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    from_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.to_date}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    to_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() =>
                  setFilters({
                    status: "",
                    category: "",
                    priority: "",
                    from_date: "",
                    to_date: "",
                  })
                }
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <h5 className="fw-bold mb-3">
            Ticket Queue ({visibleTickets.length})
          </h5>

          {visibleTickets.length === 0 && (
            <div className="alert alert-light">
              No tickets match the selected filters.
            </div>
          )}

          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              selected={selectedId === ticket.id}
              onClick={() => selectTicket(ticket)}
            />
          ))}
        </div>

        <div className="col-lg-7">
          {selectedId === null ? (
            <div className="alert alert-light border">
              Select a ticket to manage it.
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-bold">
                  Manage Ticket #{selectedId}
                </h5>

                {detail && (
                  <>
                    <div className="text-secondary small mb-2">
                      {detail.author_name || detail.author_id}
                    </div>

                    <h6>{detail.subject}</h6>

                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {detail.description}
                    </p>
                  </>
                )}

                <hr />

                <h6 className="fw-bold">Ticket Settings</h6>

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label small">Status</label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {STATUSES.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small">Category</label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small">Priority</label>
                    <select
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      {PRIORITIES.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="assignToMe"
                    checked={assigned}
                    onChange={(e) => setAssigned(e.target.checked)}
                  />

                  <label
                    className="form-check-label"
                    htmlFor="assignToMe"
                  >
                    Assign ticket to me
                  </label>
                </div>

                <button
                  className="btn btn-outline-primary"
                  onClick={saveTicket}
                  disabled={saving}
                >
                  Save Ticket Changes
                </button>

                <hr className="my-4" />

                <h6 className="fw-bold">AI Assistant</h6>

                <button
                  className="btn btn-primary mb-3"
                  onClick={generateAI}
                  disabled={loadingAI}
                >
                  <i className="bi bi-stars me-2" />
                  {loadingAI
                    ? "Generating AI Suggestion..."
                    : "Generate AI Suggestion"}
                </button>

                {suggestion && (
                  <div className="alert alert-info">
                    <strong>Suggested Category:</strong>{" "}
                    {suggestion.category}
                    <br />
                    <strong>Suggested Priority:</strong>{" "}
                    {suggestion.priority}

                    <div className="mt-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          if (CATEGORIES.includes(suggestion.category)) {
                            setCategory(suggestion.category);
                          }
                          if (PRIORITIES.includes(suggestion.priority)) {
                            setPriority(suggestion.priority);
                          }
                        }}
                      >
                        Apply AI Classification to Form
                      </button>
                    </div>

                    <div className="small mt-2">
                      Click Save Ticket Changes to persist the
                      classification.
                    </div>
                  </div>
                )}

                <h6 className="fw-bold mt-3">
                  Reply / Internal Note
                </h6>

                <textarea
                  className="form-control mb-3"
                  rows={7}
                  maxLength={10000}
                  placeholder="Write a reply or generate an AI draft..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="internalNote"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                  />

                  <label
                    className="form-check-label"
                    htmlFor="internalNote"
                  >
                    Internal note (hidden from authors)
                  </label>
                </div>

                <button
                  className={`btn ${
                    internal ? "btn-warning" : "btn-success"
                  }`}
                  disabled={saving || !draft.trim()}
                  onClick={sendReply}
                >
                  {saving
                    ? "Saving..."
                    : internal
                    ? "Save Internal Note"
                    : "Send Reply to Author"}
                </button>

                {detail && (
                  <MessageHistory ticket={detail} admin={true} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
