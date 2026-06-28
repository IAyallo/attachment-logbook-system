import { useState, useEffect, FormEvent } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './FacultyDashboard.css';

interface Student {
  id: string;
  reg_number: string;
  programme: string;
  attachment_start: string | null;
  attachment_end: string | null;
  assessment_id: string | null;
  assessment_status: string | null;
}

const FacultyDashboard = () => {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [marks, setMarks] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await api.get('/assessments/students');
      setStudents(res.data.students);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (student: Student) => {
    setSelected(student);
    setMarks('');
    setComments('');
    setError('');
    setSuccess('');
  };

  const handleSubmitAssessment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/assessments', {
        student_id: selected.id,
        form_type: 'mid_term',
        faculty_marks: parseFloat(marks),
        faculty_comments: comments,
      });
      setSuccess('Assessment submitted successfully.');
      fetchStudents();
    } catch (err: any) { //eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = students.filter((s) => s.assessment_status !== 'approved').length;
  const completedCount = students.filter((s) => s.assessment_status === 'approved').length;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
      <div className="user-card">
        <div className="user-avatar">📋</div>
        <div>
          <div className="user-name">{user?.full_name || user?.email}</div>
          <div className="user-role">{user?.department || 'Faculty Supervisor'}</div>
        </div>
      </div>

        <nav className="sidebar-nav">
          <div className="nav-item active">Evaluations</div>
        </nav>

        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="main-content">
        <h1>Faculty Evaluation Portal</h1>
        <p className="subtitle">Reviewing {students.length} active student attachments.</p>

        <div className="stats-row">
          <div className="card stat-card">
            <div className="stat-label">PENDING EVALUATIONS</div>
            <div className="stat-value stat-orange">{pendingCount}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">COMPLETED</div>
            <div className="stat-value stat-green">{completedCount}</div>
          </div>
        </div>

        <div className="content-grid">
          <div className="card students-card">
            <h2>My Students</h2>
            <table className="students-table">
              <thead>
                <tr>
                  <th>REG NUMBER</th>
                  <th>PROGRAMME</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className={selected?.id === s.id ? 'row-active' : ''}>
                    <td>{s.reg_number}</td>
                    <td>{s.programme}</td>
                    <td>
                      <span className={`badge ${s.assessment_status === 'approved' ? 'badge-approved' : 'badge-pending'}`}>
                        {s.assessment_status === 'approved' ? 'Evaluated' : 'Ready for Review'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-small" onClick={() => handleSelect(s)}>
                        Assess
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state">No students assigned yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card assessment-card">
            {selected ? (
              <form onSubmit={handleSubmitAssessment}>
                <div className="assessment-badge">FOCUSED EVALUATION</div>
                <h2>Assessment Form: {selected.reg_number}</h2>
                <p className="assessment-subtitle">{selected.programme} Attachment Programme</p>

                <div className="form-row">
                  <div className="form-group marks-group">
                    <label>FACULTY MARKS (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Enter score"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>FACULTY COMMENTS</label>
                  <textarea
                    rows={4}
                    placeholder="Provide qualitative feedback on technical progress and professional conduct..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-detail">Select a student to begin their assessment.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FacultyDashboard;