import { useState, useEffect, FormEvent } from 'react';
import api from '../api/axios';
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

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [creating, setCreating] = useState(false);
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
    fetchUsers();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      await api.post('/admin/users', { email, password, role, full_name: fullName });
      setSuccess(`User "${fullName}" created successfully.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('student');
      fetchUsers();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
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
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create User Identity'}
            </button>
          </form>
        </div>
      )}

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