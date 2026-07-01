import { useState, useEffect } from 'react';
import api from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentDashboard.css';

interface LogEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  hours_logged: string;
  status: string;
  sync_status: string;
  entry_date: string;
  feedback: string | null;
  marks: string | null;
}

const StudentLogs = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    api.get('/logs').then((res) => setEntries(res.data.entries)).catch(console.error);
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'badge-draft',
      submitted: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
    };
    return map[status] || 'badge-draft';
  };

  return (
    <StudentLayout>
      <h1>Daily Logs</h1>
      <p className="subtitle">Full history of your attachment log entries.</p>

      <div className="card activity-card">
        <table className="activity-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>TITLE</th>
                <th>CATEGORY</th>
              <th>DESCRIPTION</th>
              <th>HOURS</th>
              <th>STATUS</th>
              <th>FEEDBACK</th>
              <th>MARKS</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.entry_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>{entry.title}</td>
                <td>{entry.category || 'General'}</td>
                <td style={{ maxWidth: '280px' }}>{entry.description}</td>
                <td>{entry.hours_logged}</td>
                <td>
                  <span className={`badge ${statusBadge(entry.status)}`}>
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </span>
                </td>
                <td>{entry.feedback || '—'}</td>
                <td>{entry.marks || '—'}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">No log entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StudentLayout>
  );
};

export default StudentLogs;