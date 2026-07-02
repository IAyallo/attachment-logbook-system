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

interface ChecklistCriterion {
  label: string;
  weight: number;
}

const reportCriteria: Record<string, ChecklistCriterion[]> = {
  WBL: [
    { label: 'Workplace context and role clarity', weight: 6 },
    { label: 'Evidence of assigned tasks and outputs', weight: 8 },
    { label: 'Application of programme learning outcomes', weight: 8 },
    { label: 'Professional practice and workplace conduct', weight: 8 },
    { label: 'Problem solving and critical reflection', weight: 8 },
    { label: 'Quality of report structure and writing', weight: 6 },
    { label: 'Referencing, evidence quality, and completeness', weight: 6 },
  ],
  SBL: [
    { label: 'Community context and need analysis', weight: 8 },
    { label: 'Service activity participation and contribution', weight: 8 },
    { label: 'Impact evidence on beneficiaries/community', weight: 8 },
    { label: 'Stakeholder communication and collaboration', weight: 7 },
    { label: 'Ethical practice and civic responsibility', weight: 7 },
    { label: 'Depth of reflection and personal learning', weight: 6 },
    { label: 'Report structure, writing, and references', weight: 6 },
  ],
};

const defaultReportCriteria = reportCriteria.WBL;

const FacultyReports = () => {
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [selected, setSelected] = useState<PendingReport | null>(null);
  const [ratings, setRatings] = useState<number[]>(Array.from({ length: 7 }, () => 3));
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
    setRatings(Array.from({ length: 7 }, () => 3));
    setComments('');
    setError('');
    setSuccess('');
  };

  const selectedCriteria = selected
    ? (reportCriteria[selected.programme] || defaultReportCriteria)
    : defaultReportCriteria;

  const checklistTotal = parseFloat(
    selectedCriteria
      .reduce((sum, item, index) => sum + ((ratings[index] || 1) / 5) * item.weight, 0)
      .toFixed(2),
  );

  const handleRatingChange = (index: number, value: string) => {
    const parsed = Number(value);
    const updated = [...ratings];
    updated[index] = Number.isNaN(parsed) ? 1 : parsed;
    setRatings(updated);
  };

  const buildChecklistSummary = () => {
    const lines = selectedCriteria.map((criterion, index) => {
      const rating = ratings[index] || 1;
      const contribution = (((rating / 5) * criterion.weight)).toFixed(2);
      return `${index + 1}. ${criterion.label} [Rating: ${rating}/5, Weight: ${criterion.weight}, Contribution: ${contribution}]`;
    });

    return [
      'Composite Report Scale Checklist Review',
      '',
      `Final Mark: ${checklistTotal}/50`,
      '',
      'Checklist Ratings:',
      ...lines,
      '',
      'Additional Review Comments:',
      comments.trim() || 'N/A',
    ].join('\n');
  };

  const handleGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setSuccess('');
    setGrading(true);

    try {
      if (!comments.trim()) {
        setError('Please provide additional review comments before submitting.');
        setGrading(false);
        return;
      }

      await api.patch(`/reports/${selected.id}/grade`, {
        marks: checklistTotal,
        faculty_comments: buildChecklistSummary(),
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

  const criteriaTotal = selectedCriteria.reduce((sum, item) => sum + item.weight, 0);

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

              <div className="criteria-panel" style={{ marginBottom: '16px' }}>
                <div className="criteria-title">
                  {selected.programme} Report Criteria ({criteriaTotal} Marks)
                </div>
                <div className="criteria-subtitle">
                  Rate each criterion on a 1-5 scale. Final report marks are auto-calculated out of 50.
                </div>
                <div className="criteria-list">
                  {selectedCriteria.map((item, index) => (
                    <div key={item.label} className="criteria-item" style={{ alignItems: 'flex-start' }}>
                      <span style={{ maxWidth: '70%' }}>{item.label}</span>
                      <span className="criteria-score" style={{ marginRight: '8px' }}>{item.weight}</span>
                      <select
                        value={ratings[index] || 1}
                        onChange={(e) => handleRatingChange(index, e.target.value)}
                        style={{ width: '88px' }}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '16px' }}>
                <div className="criteria-title">Auto-Calculated Report Marks</div>
                <div className="criteria-subtitle">Final marks: {checklistTotal}/50</div>
              </div>

              <div className="form-group">
                <label>ADDITIONAL REVIEW COMMENTS</label>
                <textarea
                  rows={4}
                  placeholder="Summarize key strengths, gaps, and recommendations for improvement..."
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