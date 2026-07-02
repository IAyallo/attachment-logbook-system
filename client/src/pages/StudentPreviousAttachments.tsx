import { useEffect, useState } from 'react';
import api from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentDashboard.css';

interface PreviousAttachmentRow {
  id: string;
  institution_name: string | null;
  host_supervisor_name: string | null;
  host_supervisor_designation: string | null;
  host_supervisor_email: string | null;
  host_supervisor_phone: string | null;
  faculty_supervisor_name: string | null;
  faculty_supervisor_email: string | null;
  faculty_date_allocated: string | null;
  attachment_type: string | null;
  attachment_period: string | null;
  hours_per_day: number | null;
  days_per_week: string[] | null;
  organisation_description: string | null;
  organisation_country: string | null;
  organisation_county: string | null;
  organisation_constituency: string | null;
  internship_objectives: string[] | null;
  internship_skills: string[] | null;
  internship_training_opportunities: string[] | null;
  host_score: number | null;
  faculty_score: number | null;
  report_score: number | null;
  total_grade: number | null;
  status_message: string | null;
  attachment_start: string | null;
  attachment_end: string | null;
  status: 'halted' | 'completed';
  halt_reason: string | null;
  created_at: string;
}

const StudentPreviousAttachments = () => {
  const [history, setHistory] = useState<PreviousAttachmentRow[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    api.get('/applications/previous').then((res) => {
      const rows = res.data.history || [];
      setHistory(rows);
      if (rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    }).catch((err) => {
      console.error('Failed to load previous attachments', err);
    });
  }, []);

  const selected = history.find((row) => row.id === selectedId) || null;

  return (
    <StudentLayout>
      <h1>My Attachments</h1>
      <p className="subtitle">Review your past attachments and full details for each cycle.</p>

      <div className="content-grid">
        <div className="card students-card">
          <h2>Attachments List</h2>
          <table className="students-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>PERIOD</th>
                <th>DATES</th>
                <th>ORGANISATION</th>
                <th>FACULTY SUPERVISOR</th>
                <th>HOST SUPERVISOR</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className={selectedId === row.id ? 'row-active' : ''}>
                  <td>{row.attachment_type || '—'}</td>
                  <td>{row.attachment_period || '—'}</td>
                  <td>
                    {row.attachment_start ? new Date(row.attachment_start).toLocaleDateString() : '—'} - {row.attachment_end ? new Date(row.attachment_end).toLocaleDateString() : '—'}
                  </td>
                  <td>{row.institution_name || '—'}</td>
                  <td>{row.faculty_supervisor_name || '—'}</td>
                  <td>{row.host_supervisor_name || '—'}</td>
                  <td>
                    <button className="btn-small" onClick={() => setSelectedId(row.id)}>View</button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">No previous attachments recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card assessment-card">
          {selected ? (
            <>
              <div className="assessment-badge">ATTACHMENT DETAILS</div>
              <h2>{selected.institution_name || 'Attachment'}</h2>
              <p className="assessment-subtitle">Status: {selected.status}</p>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Assessment Scores</div>
                <div className="criteria-subtitle">Faculty: {selected.faculty_score ?? '—'}</div>
                <div className="criteria-subtitle">Host: {selected.host_score ?? '—'}</div>
                <div className="criteria-subtitle">Report: {selected.report_score ?? '—'}</div>
                <div className="criteria-subtitle">Total Grade: {selected.total_grade ?? '—'}</div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Attachment Status</div>
                <div className="criteria-subtitle">{selected.status}</div>
                <div className="criteria-subtitle">{selected.status_message || selected.halt_reason || '—'}</div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Faculty Supervisor Details</div>
                <div className="criteria-subtitle">Name: {selected.faculty_supervisor_name || '—'}</div>
                <div className="criteria-subtitle">Email: {selected.faculty_supervisor_email || '—'}</div>
                <div className="criteria-subtitle">
                  Date Allocated: {selected.faculty_date_allocated ? new Date(selected.faculty_date_allocated).toLocaleString() : '—'}
                </div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Host Supervisor Details</div>
                <div className="criteria-subtitle">Name: {selected.host_supervisor_name || '—'}</div>
                <div className="criteria-subtitle">Designation: {selected.host_supervisor_designation || '—'}</div>
                <div className="criteria-subtitle">Email: {selected.host_supervisor_email || '—'}</div>
                <div className="criteria-subtitle">Phone: {selected.host_supervisor_phone || '—'}</div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Attachment Details</div>
                <div className="criteria-subtitle">Type: {selected.attachment_type || '—'}</div>
                <div className="criteria-subtitle">Period: {selected.attachment_period || '—'}</div>
                <div className="criteria-subtitle">
                  Start/End: {selected.attachment_start ? new Date(selected.attachment_start).toLocaleDateString() : '—'} - {selected.attachment_end ? new Date(selected.attachment_end).toLocaleDateString() : '—'}
                </div>
                <div className="criteria-subtitle">Hours Per Day: {selected.hours_per_day ?? '—'}</div>
                <div className="criteria-subtitle">
                  Days Per Week: {(selected.days_per_week || []).length > 0 ? (selected.days_per_week || []).join(', ') : '—'}
                </div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Organisation Details</div>
                <div className="criteria-subtitle">Name: {selected.institution_name || '—'}</div>
                <div className="criteria-subtitle">Description: {selected.organisation_description || '—'}</div>
                <div className="criteria-subtitle">Country: {selected.organisation_country || '—'}</div>
                <div className="criteria-subtitle">County: {selected.organisation_county || '—'}</div>
                <div className="criteria-subtitle">Constituency: {selected.organisation_constituency || '—'}</div>
              </div>

              <div className="criteria-panel">
                <div className="criteria-title">Attachment Description</div>
                <div className="criteria-subtitle">Internship Objectives: {(selected.internship_objectives || []).join('; ') || '—'}</div>
                <div className="criteria-subtitle">Internship Skills: {(selected.internship_skills || []).join('; ') || '—'}</div>
                <div className="criteria-subtitle">Training Opportunities: {(selected.internship_training_opportunities || []).join('; ') || '—'}</div>
              </div>
            </>
          ) : (
            <div className="empty-detail">Select an attachment to view details.</div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentPreviousAttachments;
