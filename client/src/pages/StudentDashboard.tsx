import { useState, useEffect, FormEvent } from "react";
import api from "../api/axios";
import "./StudentDashboard.css";
import StudentLayout from '../components/StudentLayout';

interface LogEntry {
  id: string;
  title: string;
  description: string;
  hours_logged: string;
  status: string;
  sync_status: string;
  entry_date: string;
  feedback: string | null;
  marks: string | null;
}

const StudentDashboard = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    try {
      const res = await api.get("/logs");
      setEntries(res.data.entries);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  useEffect(() => {
    fetchLogs(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.post("/logs", {
        title,
        description,
        hours_logged: parseFloat(hours),
        entry_date: new Date().toISOString().split("T")[0],
      });
      setTitle("");
      setHours("");
      setDescription("");
      fetchLogs();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || "Failed to create log entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLog = async (id: string) => {
    try {
      await api.patch(`/logs/${id}/submit`);
      fetchLogs();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      alert(err.response?.data?.message || "Failed to submit log.");
    }
  };

  const totalHours = entries
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + parseFloat(e.hours_logged), 0);

  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const submittedCount = entries.filter((e) => e.status !== "draft").length;
  const approvalRate =
    submittedCount > 0 ? Math.round((approvedCount / submittedCount) * 100) : 0;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "badge-draft",
      submitted: "badge-pending",
      approved: "badge-approved",
      rejected: "badge-rejected",
    };
    return map[status] || "badge-draft";
  };

  return (
    <StudentLayout>
        <h1>Student Workspace</h1>
        <p className="subtitle">
          Manage your industrial attachment progress and daily submissions.
        </p>

        <div className="content-grid">
          <div className="card new-log-card">
            <h2>New Daily Log</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>ACTIVITY TITLE</label>
                  <input
                    type="text"
                    placeholder="e.g. Database Migration"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group hours-group">
                  <label>HOURS LOGGED</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="4.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ACTIVITY DESCRIPTION</label>
                <textarea
                  rows={4}
                  placeholder="Describe what you worked on..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "▷ Submit Log"}
                </button>
              </div>
            </form>
          </div>

          <div className="stats-column">
            <div className="card stat-card">
              <div className="stat-label">TOTAL HOURS</div>
              <div className="stat-value">{totalHours.toFixed(1)}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">APPROVAL RATE</div>
              <div className="stat-value stat-green">{approvalRate}%</div>
            </div>
          </div>
        </div>

        <div className="card activity-card">
          <h2>Recent Activity</h2>
          <table className="activity-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>TITLE</th>
                <th>HOURS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {new Date(entry.entry_date).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td>{entry.title}</td>
                  <td>{entry.hours_logged}</td>
                  <td>
                    <span className={`badge ${statusBadge(entry.status)}`}>
                      {entry.status.charAt(0).toUpperCase() +
                        entry.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    {entry.status === "draft" && (
                      <button
                        className="btn-small"
                        onClick={() => handleSubmitLog(entry.id)}
                      >
                        Submit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No log entries yet. Create your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </StudentLayout>
  );
};

export default StudentDashboard;
