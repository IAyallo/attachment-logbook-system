import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { AxiosError } from 'axios';
import api from '../api/axios';
import FacultyLayout from '../components/FacultyLayout.tsx';
import './FacultyDashboard.css';

interface PendingReport {
  id: string;
  file_name: string;
  file_path: string;
  reg_number: string;
  programme: string;
  submitted_at: string;
}

const reportCriteria: Record<string, Array<{ label: string; marks: number }>> = {
  WBL: [
    { label: 'Technical depth and practical relevance', marks: 20 },
    { label: 'Evidence of workplace learning outcomes', marks: 15 },
    { label: 'Analysis, reflection, and recommendations', marks: 15 },
  ],
  SBL: [
    { label: 'Service-learning impact and stakeholder value', marks: 20 },
    { label: 'Process evidence and quality of implementation', marks: 15 },
    { label: 'Reflection, ethics, and sustainability insights', marks: 15 },
  ],
};

const defaultReportCriteria = reportCriteria.WBL;

const FacultyReports = () => {
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [selected, setSelected] = useState<PendingReport | null>(null);
  const [marks, setMarks] = useState('');
  const [comments, setComments] = useState('');
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchReports = () => {
    api.get('/reports/pending').then((res) => setReports(res.data.reports)).catch(console.error);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSelect = (report: PendingReport) => {
    setSelected(report);
    setMarks('');
    setComments('');
    setError('');
    setSuccess('');
  };

  const handleGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setSuccess('');
    setGrading(true);

    try {
      await api.patch(`/reports/${selected.id}/grade`, {
        marks: parseFloat(marks),
        faculty_comments: comments,
      });
      setSuccess('Report graded successfully.');
      setSelected(null);
      fetchReports();
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || 'Failed to grade report.');
    } finally {
      setGrading(false);
    }
  };

  const selectedCriteria = selected
    ? (reportCriteria[selected.programme] || defaultReportCriteria)
    : defaultReportCriteria;
  const criteriaTotal = selectedCriteria.reduce((sum, item) => sum + item.marks, 0);

  return (
    <FacultyLayout>
      <h1>Composite Reports</h1>
      <p className="subtitle">Grade student composite reports (worth 50 credits).</p>

      <div className="content-grid">
        <div className="card students-card">
          <h2>Pending Reports ({reports.length})</h2>
          <table className="students-table">
            <thead>
              <tr>
                <th>REG NUMBER</th>
                <th>FILE</th>
                <th>SUBMITTED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className={selected?.id === r.id ? 'row-active' : ''}>
                  <td>{r.reg_number}</td>
                  <td>📄 {r.file_name}</td>
                  <td>{new Date(r.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-small" onClick={() => handleSelect(r)}>
                      Grade
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={4} className="empty-state">No reports pending review.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card assessment-card">
          {selected ? (
            <form onSubmit={handleGrade}>
              <div className="assessment-badge">GRADING REPORT</div>
              <h2>{selected.reg_number}</h2>
              <p className="assessment-subtitle">{selected.file_name} • {selected.programme}</p>

              <a
                href={`http://localhost:3000/${selected.file_path.replace(/\\/g, '/')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-blue)', fontSize: '13px', display: 'block', marginBottom: '20px' }}
              >
                📄 View {selected.file_name}  
            </a>

              <div className="form-row">
                <div className="form-group marks-group">
                  <label>REPORT MARKS (0-50)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="Enter score"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '16px' }}>
                <div className="criteria-title">
                  {selected.programme} Report Criteria ({criteriaTotal} Marks)
                </div>
                <div className="criteria-subtitle">
                  Score holistically, then assign the final report mark out of 50.
                </div>
                <div className="criteria-list">
                  {selectedCriteria.map((item) => (
                    <div key={item.label} className="criteria-item">
                      <span>{item.label}</span>
                      <span className="criteria-score">{item.marks}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>FACULTY COMMENTS</label>
                <textarea
                  rows={4}
                  placeholder="Provide feedback on the report's depth, structure, and reflection quality..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && (
                <div style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '16px' }}>
                  ✓ {success}
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={grading}>
                  {grading ? 'Submitting...' : 'Submit Grade'}
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-detail">Select a report from the list to grade it.</div>
          )}
        </div>
      </div>
    </FacultyLayout>
  );
};

export default FacultyReports;