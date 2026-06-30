import { useState, useEffect } from 'react';
import api from '../api/axios';
import './SupervisorDashboard.css';
import SupervisorLayout from '../components/SupervisorLayout';

interface PendingEntry {
  id: string;
  title: string;
  description: string;
  hours_logged: string;
  entry_date: string;
  reg_number: string;
}

const SupervisorDashboard = () => {
  const [pendingLogs, setPendingLogs] = useState<PendingEntry[]>([]);
  const [selected, setSelected] = useState<PendingEntry | null>(null);
  const [feedback, setFeedback] = useState('');
  const [marks, setMarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      const res = await api.get('/logs/pending');
      setPendingLogs(res.data.entries);
      if (res.data.entries.length > 0 && !selected) {
        setSelected(res.data.entries[0]);
      }
    } catch (err) {
      console.error('Failed to fetch pending logs', err);
    }
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (entry: PendingEntry) => {
    setSelected(entry);
    setFeedback('');
    setMarks('');
    setError('');
  };

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!selected) return;
    setError('');
    setProcessing(true);

    try {
      await api.patch(`/logs/${selected.id}/review`, {
        decision,
        feedback,
        marks: marks ? parseFloat(marks) : null,
      });
      setSelected(null);
      setFeedback('');
      setMarks('');
      fetchPending();
    } catch (err: any) { //eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to process review.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SupervisorLayout>
        <div className="breadcrumb">DASHBOARD &gt; PENDING APPROVALS</div>
        <h1>Log Approval Queue</h1>
        <p className="subtitle">Reviewing {pendingLogs.length} pending daily logs.</p>

        <div className="approval-grid">
          <div className="queue-column">
            <div className="queue-header">QUEUE ({pendingLogs.length})</div>
            {pendingLogs.map((entry) => (
              <div
                key={entry.id}
                className={`queue-card ${selected?.id === entry.id ? 'queue-card-active' : ''}`}
                onClick={() => handleSelect(entry)}
              >
                <div className="queue-card-top">
                  <span className="queue-student">REG: {entry.reg_number}</span>
                  <span className="queue-date">{new Date(entry.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="queue-title">{entry.title}</div>
                <div className="queue-desc">{entry.description.slice(0, 80)}...</div>
                <div className="queue-hours">⏱ {entry.hours_logged} Hours Logged</div>
              </div>
            ))}
            {pendingLogs.length === 0 && (
              <div className="empty-queue">No pending logs to review.</div>
            )}
          </div>

          <div className="detail-column">
            {selected ? (
              <div className="card detail-card">
                <div className="detail-header">
                  <div>
                    <h2>{selected.title}</h2>
                    <div className="detail-meta">Submitted by REG: {selected.reg_number} • {new Date(selected.entry_date).toLocaleDateString()}</div>
                  </div>
                  <div className="detail-hours">
                    <div className="detail-hours-value">{selected.hours_logged}</div>
                    <div className="detail-hours-label">hrs</div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-label">ACTIVITY DESCRIPTION</div>
                  <div className="detail-section-body">{selected.description}</div>
                </div>

                <div className="review-box">
                  <div className="review-box-title">SUPERVISOR FEEDBACK & GRADING</div>

                  <div className="review-row">
                    <div className="form-group">
                      <label>SUPERVISOR FEEDBACK</label>
                      <textarea
                        rows={3}
                        placeholder="Provide constructive feedback on the log content..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>
                    <div className="form-group marks-group">
                      <label>MARKS (0-20)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="17"
                        value={marks}
                        onChange={(e) => setMarks(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <div className="review-actions">
                    <button
                      className="btn-approve"
                      disabled={processing}
                      onClick={() => handleReview('approved')}
                    >
                      ✓ Approve Log
                    </button>
                    <button
                      className="btn-reject"
                      disabled={processing}
                      onClick={() => handleReview('rejected')}
                    >
                      ✕ Reject & Request Edits
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card detail-card empty-detail">
                Select a log entry from the queue to review.
              </div>
            )}
          </div>
        </div>
      </SupervisorLayout>
  );
};

export default SupervisorDashboard;