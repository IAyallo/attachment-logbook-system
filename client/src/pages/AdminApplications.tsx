import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface ApplicationRow {
  id: string;
  reg_number: string;
  programme: string;
  student_name: string;
  student_email: string;
  course: string;
  attachment_type: string;
  start_date: string;
  end_date: string;
  institution_mode: 'existing' | 'new';
  existing_institution_name: string | null;
  organisation_name: string | null;
  organisation_description: string | null;
  organisation_country: string | null;
  organisation_county: string | null;
  organisation_constituency: string | null;
  supervisor_name: string;
  supervisor_designation: string;
  supervisor_email: string;
  supervisor_phone: string;
  key_activities: string[];
  skills_to_develop: string[];
  training_opportunities: string[];
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

const AdminApplications = () => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [tempPassword, setTempPassword] = useState('Passw0rd!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadApplications = async () => {
    try {
      const res = await api.get('/applications/admin', { params: { status: statusFilter } });
      const rows = res.data.applications || [];
      setApplications(rows);
      if (!selectedId && rows.length > 0) {
        setSelectedId(rows[0].id);
      }
      if (selectedId && !rows.some((item: ApplicationRow) => item.id === selectedId)) {
        setSelectedId(rows[0]?.id || '');
      }
    } catch (err) {
      console.error('Failed to load applications', err);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  const selected = useMemo(
    () => applications.find((item) => item.id === selectedId) || null,
    [applications, selectedId],
  );

  const handleReview = async (e: FormEvent, decision: 'approved' | 'rejected') => {
    e.preventDefault();
    if (!selected) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.patch(`/applications/admin/${selected.id}/review`, {
        decision,
        admin_notes: adminNotes,
        temp_password: decision === 'approved' ? tempPassword : undefined,
      });

      const passwordInfo = res.data.temp_password_used
        ? ` Temporary host password: ${res.data.temp_password_used}`
        : '';

      setSuccess(`Application ${decision} successfully.${passwordInfo}`);
      setAdminNotes('');
      loadApplications();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Review action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="header-row">
        <div>
          <h1>Attachment Applications</h1>
          <p className="subtitle">Review student-submitted applications and approve onboarding workflow.</p>
        </div>
        <div style={{ minWidth: '240px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS FILTER</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'approved' | 'rejected' | 'all')}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="content-grid">
        <div className="card students-card">
          <h2>Applications ({applications.length})</h2>
          <table className="students-table">
            <thead>
              <tr>
                <th>REG NUMBER</th>
                <th>TYPE</th>
                <th>INSTITUTION MODE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((item) => (
                <tr key={item.id} className={selectedId === item.id ? 'row-active' : ''}>
                  <td>{item.reg_number}</td>
                  <td>{item.attachment_type}</td>
                  <td>{item.institution_mode}</td>
                  <td>
                    <span className={`badge ${item.status === 'approved' ? 'badge-approved' : item.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-small" onClick={() => setSelectedId(item.id)}>View</button>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No applications found for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card assessment-card">
          {selected ? (
            <form>
              <div className="assessment-badge">APPLICATION DETAILS</div>
              <h2>{selected.reg_number} - {selected.student_name}</h2>
              <p className="assessment-subtitle">{selected.student_email}</p>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Attachment</div>
                <div className="criteria-subtitle">
                  Course: {selected.course} | Type: {selected.attachment_type} | Period: {new Date(selected.start_date).toLocaleDateString()} - {new Date(selected.end_date).toLocaleDateString()}
                </div>
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Organisation Choice</div>
                <div className="criteria-subtitle">
                  {selected.institution_mode === 'existing'
                    ? `Existing institution: ${selected.existing_institution_name || 'N/A'}`
                    : `New institution proposal: ${selected.organisation_name || 'N/A'} (${selected.organisation_country || 'N/A'})`}
                </div>
                {selected.institution_mode === 'new' && (
                  <>
                    <div className="criteria-subtitle">
                      County: {selected.organisation_county || 'N/A'} | Constituency: {selected.organisation_constituency || 'N/A'}
                    </div>
                    <div className="criteria-subtitle">{selected.organisation_description || 'No organisation description provided.'}</div>
                  </>
                )}
              </div>

              <div className="criteria-panel" style={{ marginBottom: '14px' }}>
                <div className="criteria-title">Host Supervisor Proposed</div>
                <div className="criteria-subtitle">
                  {selected.supervisor_name} | {selected.supervisor_designation}
                </div>
                <div className="criteria-subtitle">
                  {selected.supervisor_email} | {selected.supervisor_phone}
                </div>
              </div>

              <div className="form-group">
                <label>KEY ACTIVITIES</label>
                <textarea rows={4} value={(selected.key_activities || []).join('\n')} readOnly />
              </div>
              <div className="form-group">
                <label>SKILLS TO DEVELOP</label>
                <textarea rows={4} value={(selected.skills_to_develop || []).join('\n')} readOnly />
              </div>
              <div className="form-group">
                <label>TRAINING OPPORTUNITIES</label>
                <textarea rows={3} value={(selected.training_opportunities || []).join('\n')} readOnly />
              </div>

              {selected.status === 'pending' && (
                <>
                  <div className="form-group">
                    <label>ADMIN NOTES</label>
                    <textarea
                      rows={3}
                      placeholder="Optional admin note for student"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>HOST TEMP PASSWORD (ON APPROVAL)</label>
                    <input
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Basic password for host onboarding"
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}

                  <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-primary" disabled={submitting} onClick={(e) => handleReview(e, 'approved')}>
                      {submitting ? 'Processing...' : 'Approve and Onboard'}
                    </button>
                    <button className="btn-small" disabled={submitting} onClick={(e) => handleReview(e, 'rejected')}>
                      Reject
                    </button>
                  </div>
                </>
              )}

              {selected.status !== 'pending' && (
                <div className="criteria-subtitle" style={{ marginTop: '8px' }}>
                  Already reviewed. Notes: {selected.admin_notes || '—'}
                </div>
              )}
            </form>
          ) : (
            <div className="empty-detail">Select an application to review.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminApplications;
