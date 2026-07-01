import { useState, useEffect, FormEvent } from 'react';
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

const StudentReport = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchReport = () => {
    api.get('/reports/my-report').then((res) => setReport(res.data.report)).catch(console.error);
  };

  useEffect(() => {
    fetchReport();
  }, []);

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
      <p className="subtitle">Submit your final attachment report (worth 50 credits).</p>

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
    </StudentLayout>
  );
};

export default StudentReport;