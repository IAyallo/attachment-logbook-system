import { useState, useEffect, FormEvent } from 'react';
import api from '../api/axios';
import SupervisorLayout from '../components/SupervisorLayout';
import './SupervisorDashboard.css';

interface StudentRow {
  id: string;
  reg_number: string;
  programme: string;
  approved_logs: string;
  pending_logs: string;
}

interface HostScore {
  calculated_average: number;
  graded_logs_count: number;
  override: { host_marks: string; host_comments: string } | null;
}

const HostStudentList = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [score, setScore] = useState<HostScore | null>(null);
  const [overrideMarks, setOverrideMarks] = useState('');
  const [overrideComments, setOverrideComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStudents = () => {
    api.get('/logs/my-students').then((res) => setStudents(res.data.students)).catch(console.error);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSelect = async (student: StudentRow) => {
    setSelected(student);
    setError('');
    setSuccess('');
    try {
      const res = await api.get(`/logs/host-score/${student.id}`);
      setScore(res.data);
      setOverrideMarks(res.data.override?.host_marks || res.data.calculated_average.toString());
      setOverrideComments(res.data.override?.host_comments || '');
    } catch (err) {
      console.error('Failed to fetch host score', err);
    }
  };

  const handleSaveScore = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.post(`/logs/host-score/${selected.id}`, {
        host_marks: parseFloat(overrideMarks),
        host_comments: overrideComments,
      });
      setSuccess('Host score finalized successfully.');
      handleSelect(selected);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to save score.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SupervisorLayout>
      <h1>Student List</h1>
      <p className="subtitle">Manage your assigned students and finalize their 20-credit host score.</p>

      <div className="approval-grid">
        <div className="queue-column">
          <div className="queue-header">STUDENTS ({students.length})</div>
          {students.map((s) => (
            <div
              key={s.id}
              className={`queue-card ${selected?.id === s.id ? 'queue-card-active' : ''}`}
              onClick={() => handleSelect(s)}
            >
              <div className="queue-card-top">
                <span className="queue-student">REG: {s.reg_number}</span>
              </div>
              <div className="queue-title">{s.programme}</div>
              <div className="queue-desc">
                {s.approved_logs} approved logs • {s.pending_logs} pending review
              </div>
            </div>
          ))}
          {students.length === 0 && <div className="empty-queue">No students assigned yet.</div>}
        </div>

        <div className="detail-column">
          {selected && score ? (
            <div className="card detail-card">
              <div className="detail-header">
                <div>
                  <h2>{selected.reg_number}</h2>
                  <div className="detail-meta">{selected.programme} • Host Supervisor Score (out of 20)</div>
                </div>
                <div className="detail-hours">
                  <div className="detail-hours-value">{score.calculated_average}</div>
                  <div className="detail-hours-label">auto-avg</div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-label">CALCULATION BASIS</div>
                <div className="detail-section-body">
                  Average of {score.graded_logs_count} approved log {score.graded_logs_count === 1 ? 'entry' : 'entries'}, each marked out of 20.
                  {score.override && (
                    <div style={{ marginTop: '8px', color: 'var(--accent-orange)' }}>
                      ⚠ Currently overridden to {score.override.host_marks}/20
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveScore} className="review-box">
                <div className="review-box-title">FINALIZE HOST SCORE</div>
                <div className="review-row">
                  <div className="form-group">
                    <label>COMMENTS</label>
                    <textarea
                      rows={3}
                      placeholder="Overall remarks on performance..."
                      value={overrideComments}
                      onChange={(e) => setOverrideComments(e.target.value)}
                    />
                  </div>
                  <div className="form-group marks-group">
                    <label>FINAL SCORE (0-20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={overrideMarks}
                      onChange={(e) => setOverrideMarks(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && (
                  <div style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '16px' }}>
                    ✓ {success}
                  </div>
                )}

                <button type="submit" className="btn-approve" style={{ width: '100%' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Finalize Score'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card detail-card empty-detail">
              Select a student to view and finalize their host score.
            </div>
          )}
        </div>
      </div>
    </SupervisorLayout>
  );
};

export default HostStudentList;