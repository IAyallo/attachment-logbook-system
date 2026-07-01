import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import api, { uploadApi } from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  reg_number: string | null;
}

interface BulkUploadResponse {
  message: string;
  created: UserRow[];
  failed: Array<{ email: string; reason: string }>;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [regNumber, setRegNumber] = useState('');
  const [programme, setProgramme] = useState('WBL');
  const [creating, setCreating] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResponse | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    try {
      await api.post('/admin/users', {
        email,
        password,
        role,
        full_name: fullName,
        reg_number: role === 'student' ? regNumber.trim() : undefined,
        programme: role === 'student' ? programme : undefined,
      });
      setSuccess(`User "${fullName}" created successfully.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('student');
      setRegNumber('');
      setProgramme('WBL');
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
      'full_name,email,password,role,reg_number,programme',
      'Jane Wanjiru,jane.wanjiru@strathmore.edu,Passw0rd!,student,138701,WBL',
      'Brian Otieno,brian.otieno@strathmore.edu,Passw0rd!,student,138702,SBL',
      'Peter Kamau,peter.kamau@hostcompany.com,Passw0rd!,host_supervisor,,',
      'Alice Njoroge,alice.njoroge@strathmore.edu,Passw0rd!,faculty_supervisor,,',
      'System Admin,admin@strathmore.edu,Passw0rd!,admin,,',
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
          Upload CSV in the same format as database/test_bulk_upload.csv.
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
              <th>ROLE</th>
              <th>JOINED</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name || '—'} {u.reg_number && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({u.reg_number})</span>}</td>
                <td>{u.email}</td>
                <td>{roleLabel(u.role)}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="empty-state">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;