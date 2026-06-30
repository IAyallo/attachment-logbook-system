import { useState, useEffect } from 'react';
import api from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentDashboard.css';

interface LogEntry {
  id: string;
  title: string;
  hours_logged: string;
  status: string;
  sync_status: string;
  entry_date: string;
}

const StudentSyncQueue = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const fetchEntries = () => {
    api.get('/logs').then((res) => setEntries(res.data.entries)).catch(console.error);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const pendingSync = entries.filter((e) => e.status === 'draft' || e.sync_status === 'pending');

  return (
    <StudentLayout>
      <h1>Sync Queue</h1>
      <p className="subtitle">Entries waiting to be submitted or synced with the server.</p>

      {pendingSync.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--accent-orange)', marginBottom: '20px' }}>
          <div style={{ color: 'var(--accent-orange)', fontWeight: 600, fontSize: '13px' }}>
            ⏳ {pendingSync.length} {pendingSync.length === 1 ? 'entry' : 'entries'} pending sync
          </div>
        </div>
      )}

      <div className="card activity-card">
        <table className="activity-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>TITLE</th>
              <th>HOURS</th>
              <th>STATUS</th>
              <th>SYNC STATUS</th>
            </tr>
          </thead>
          <tbody>
            {pendingSync.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.entry_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>{entry.title}</td>
                <td>{entry.hours_logged}</td>
                <td>
                  <span className="badge badge-draft">{entry.status}</span>
                </td>
                <td>
                  <span className="badge badge-pending">{entry.sync_status}</span>
                </td>
              </tr>
            ))}
            {pendingSync.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">✓ Everything is synced. No pending entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StudentLayout>
  );
};

export default StudentSyncQueue;