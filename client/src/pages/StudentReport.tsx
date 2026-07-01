import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import api, { uploadApi } from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentDashboard.css';

interface Report {
  id: string;
  file_name: string;
  status: string;
  marks: string | null;
  faculty_comments: string | null;
  submitted_at: string;
  graded_at: string | null;
}

interface WeeklyRow {
  week_start: string;
  total_hours: string;
  total_entries: string;
  approved_entries: string;
  submitted_entries: string;
  approval_rate: string;
}

interface CategoryRow {
  category: string;
  entries: string;
  total_hours: string;
  average_marks: string | null;
  approved_entries: string;
}

interface CategoryLog {
  id: string;
  entry_date: string;
  title: string;
  description: string;
  hours_logged: string;
  status: string;
  marks: string | null;
  category: string;
}

const StudentReport = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [categoryLogs, setCategoryLogs] = useState<CategoryLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchReport = () => {
    api.get('/reports/my-report').then((res) => setReport(res.data.report)).catch(console.error);
  };

  const fetchAnalytics = () => {
    api.get('/reports/weekly').then((res) => setWeeklyRows(res.data.weekly)).catch(console.error);
    api.get('/reports/category-performance').then((res) => setCategoryRows(res.data.categories)).catch(console.error);
  };

  const fetchLogsByCategory = (category: string) => {
    const params = category === 'All' ? {} : { category };
    api.get('/reports/logs-by-category', { params }).then((res) => setCategoryLogs(res.data.logs)).catch(console.error);
  };

  useEffect(() => {
    fetchReport();
    fetchAnalytics();
    fetchLogsByCategory('All');
  }, []);

  useEffect(() => {
    fetchLogsByCategory(selectedCategory);
  }, [selectedCategory]);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('report', file);

    try {
      await uploadApi.post('/reports/upload', formData);
      setSuccess('Composite report uploaded successfully.');
      setFile(null);
      fetchReport();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to upload report.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <StudentLayout>
      <h1>Composite Report</h1>
      <p className="subtitle">Submit your final attachment report and review your weekly/category performance analytics.</p>

      <div className="card">
        <h2>{report ? 'Replace Report' : 'Upload Report'}</h2>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>SELECT PDF FILE</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '16px' }}>
              ✓ {success}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {report && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2>Submission Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><strong>File:</strong> {report.file_name}</div>
            <div>
              <strong>Status:</strong>{' '}
              <span className={`badge ${report.status === 'graded' ? 'badge-approved' : 'badge-pending'}`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </div>
            <div><strong>Submitted:</strong> {new Date(report.submitted_at).toLocaleString()}</div>
            {report.status === 'graded' && (
              <>
                <div><strong>Marks:</strong> {report.marks} / 50</div>
                <div><strong>Faculty Comments:</strong> {report.faculty_comments}</div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Detailed Weekly Report</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>WEEK START</th>
              <th>HOURS</th>
              <th>TOTAL LOGS</th>
              <th>APPROVED</th>
              <th>SUBMITTED</th>
              <th>APPROVAL RATE</th>
            </tr>
          </thead>
          <tbody>
            {weeklyRows.map((row) => (
              <tr key={row.week_start}>
                <td>{new Date(row.week_start).toLocaleDateString()}</td>
                <td>{row.total_hours}</td>
                <td>{row.total_entries}</td>
                <td>{row.approved_entries}</td>
                <td>{row.submitted_entries}</td>
                <td>{row.approval_rate}%</td>
              </tr>
            ))}
            {weeklyRows.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No weekly data available yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Category Performance</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>ENTRIES</th>
              <th>TOTAL HOURS</th>
              <th>AVG MARKS</th>
              <th>APPROVED</th>
            </tr>
          </thead>
          <tbody>
            {categoryRows.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.entries}</td>
                <td>{row.total_hours}</td>
                <td>{row.average_marks || '—'}</td>
                <td>{row.approved_entries}</td>
              </tr>
            ))}
            {categoryRows.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No category data available yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Logs By Category</h2>
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>FILTER CATEGORY</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {categoryRows.map((row) => (
              <option key={row.category} value={row.category}>{row.category}</option>
            ))}
          </select>
        </div>

        <table className="activity-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>TITLE</th>
              <th>CATEGORY</th>
              <th>HOURS</th>
              <th>STATUS</th>
              <th>MARKS</th>
            </tr>
          </thead>
          <tbody>
            {categoryLogs.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.entry_date).toLocaleDateString()}</td>
                <td>{row.title}</td>
                <td>{row.category}</td>
                <td>{row.hours_logged}</td>
                <td>{row.status}</td>
                <td>{row.marks || '—'}</td>
              </tr>
            ))}
            {categoryLogs.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No logs found for this category.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </StudentLayout>
  );
};

export default StudentReport;