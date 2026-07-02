import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import api, { uploadApi } from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  reg_number: string | null;
  institution_name?: string | null;
}

interface InstitutionOption {
  id: string;
  name: string;
}

interface BulkUploadResponse {
  message: string;
  created: UserRow[];
  failed: Array<{ email: string; reason: string }>;
}

interface ResetTarget {
  id: string;
  label: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [regNumber, setRegNumber] = useState('');
  const [programme, setProgramme] = useState('WBL');
  const [institutionId, setInstitutionId] = useState('');
  const [creating, setCreating] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResponse | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    api
      .get('/admin/users')
      .then((res) => {
        if (isMounted) {
          setUsers(res.data.users);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch users', err);
      });

    api
      .get('/admin/institutions')
      .then((res) => {
        if (isMounted) {
          setInstitutions(res.data.institutions || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch institutions', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    if (role === 'student' && !regNumber.trim()) {
      setError('Admission/registration number is required for students.');
      setCreating(false);
      return;
    }

    if (role === 'student' && !institutionId) {
      setError('Institution is required for students.');
      setCreating(false);
      return;
    }

    try {
      await api.post('/admin/users', {
        email,
        password,
        role,
        full_name: fullName,
        phone_number: phoneNumber.trim() || undefined,
        reg_number: role === 'student' ? regNumber.trim() : undefined,
        programme: role === 'student' ? programme : undefined,
        institution_id: role === 'student' ? institutionId : undefined,
      });
      setSuccess(`User "${fullName}" created successfully.`);
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
      setRole('student');
      setRegNumber('');
      setProgramme('WBL');
      setInstitutionId('');
      fetchUsers();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkUpload = async (e: FormEvent) => {
    e.preventDefault();
    setBulkError('');
    setBulkSuccess('');
    setBulkResult(null);

    if (!csvFile) {
      setBulkError('Select a CSV file first.');
      return;
    }

    setUploadingCsv(true);

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);

      const res = await uploadApi.post<BulkUploadResponse>('/admin/users/bulk-upload', formData);
      setBulkResult(res.data);
      setBulkSuccess(res.data.message);
      setCsvFile(null);
      fetchUsers();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setBulkError(err.response?.data?.message || 'Bulk upload failed.');
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      'full_name,email,password,role,phone_number,institution_name,reg_number,programme',
      'Jane Wanjiru,jane.wanjiru@strathmore.edu,Passw0rd!,student,0712345678,Kenya Revenue Authority,138701,WBL',
      'Brian Otieno,brian.otieno@strathmore.edu,Passw0rd!,student,0712345679,Nairobi Hospital,138702,SBL',
      'Peter Kamau,peter.kamau@hostcompany.com,Passw0rd!,host_supervisor,0712345680,,',
      'Alice Njoroge,alice.njoroge@strathmore.edu,Passw0rd!,faculty_supervisor,0712345681,,',
      'System Admin,admin@strathmore.edu,Passw0rd!,admin,0712345682,,',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bulk_users_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      student: 'Student',
      host_supervisor: 'Host Supervisor',
      faculty_supervisor: 'Faculty Supervisor',
      admin: 'Administrator',
    };
    return map[role] || role;
  };
  
  const openResetPasswordDialog = (userId: string, userLabel: string) => {
    setResetTarget({ id: userId, label: userLabel });
    setResetPassword('');
    setError('');
    setSuccess('');
  };

  const closeResetPasswordDialog = () => {
    setResetTarget(null);
    setResetPassword('');
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;

    if (!resetPassword.trim()) {
      setError('Temporary password is required.');
      return;
    }

    if (resetPassword.trim().length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return;
    }

    setError('');
    setSuccess('');
    setResettingPassword(true);

    try {
      const response = await api.patch(`/admin/users/${resetTarget.id}/reset-password`, {
        temporary_password: resetPassword.trim(),
      });
      setSuccess(response.data.message || 'Password reset successfully.');
      closeResetPasswordDialog();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="header-row">
        <div>
          <h1>Users</h1>
          <p className="subtitle">Manage all registered users across the system.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Create User Identity'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>Onboard New User</h2>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>FULL NAME</label>
                <input type="text" placeholder="e.g. Marcus Aurelius" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>ROLE ASSIGNMENT</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="host_supervisor">Host Supervisor</option>
                  <option value="faculty_supervisor">Faculty Supervisor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>EMAIL</label>
                <input type="email" placeholder="user@strathmore.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>PHONE NUMBER</label>
                <input
                  type="text"
                  placeholder="e.g. 0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  pattern="07[0-9]{8}"
                  title="Phone number must be in format 07XXXXXXXX"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>TEMPORARY PASSWORD</label>
                <input type="text" placeholder="Set a temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            {role === 'student' && (
              <div className="form-row">
                <div className="form-group">
                  <label>ADMISSION/REG NUMBER</label>
                  <input
                    type="text"
                    placeholder="e.g. 138701"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>PROGRAMME</label>
                  <select value={programme} onChange={(e) => setProgramme(e.target.value)}>
                    <option value="WBL">WBL</option>
                    <option value="SBL">SBL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>INSTITUTION</label>
                  <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required>
                    <option value="">Select institution</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create User Identity'}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2>Bulk Upload Users (CSV)</h2>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          Upload CSV in the same format as database/test_bulk_upload.csv. Phone numbers must use 07XXXXXXXX.
        </p>

        <form onSubmit={handleBulkUpload}>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>CSV FILE</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={handleDownloadTemplate}>
                Download Template
              </button>
              <button type="submit" className="btn-primary" disabled={uploadingCsv}>
                {uploadingCsv ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          </div>

          {bulkError && <div className="error-message" style={{ marginTop: '12px' }}>{bulkError}</div>}
          {bulkSuccess && <div className="success-message" style={{ marginTop: '12px' }}>{bulkSuccess}</div>}
        </form>

        {bulkResult && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Created: {bulkResult.created.length} | Failed: {bulkResult.failed.length}
            </div>

            {bulkResult.failed.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>EMAIL</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResult.failed.map((row, index) => (
                    <tr key={`${row.email}-${index}`}>
                      <td>{row.email}</td>
                      <td>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>ROLE</th>
              <th>INSTITUTION</th>
              <th>JOINED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name || '—'} {u.reg_number && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({u.reg_number})</span>}</td>
                <td>{u.email}</td>
                <td>{u.phone_number || '—'}</td>
                <td>{roleLabel(u.role)}</td>
                <td>{u.institution_name || '—'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => openResetPasswordDialog(u.id, u.full_name || u.email)}
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2>Reset Password</h2>
          <p className="subtitle" style={{ marginBottom: '12px' }}>
            Set a temporary password for <strong>{resetTarget.label}</strong>.
          </p>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>TEMPORARY PASSWORD</label>
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleResetPassword}
              disabled={resettingPassword}
            >
              {resettingPassword ? 'Resetting...' : 'Confirm Reset'}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}
              onClick={closeResetPasswordDialog}
              disabled={resettingPassword}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;