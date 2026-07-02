import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import api from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface Institution {
  id: string;
  name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string | null;
  assigned_students: string;
}

const AdminInstitutions = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchInstitutions = async () => {
    try {
      const res = await api.get('/admin/institutions');
      setInstitutions(res.data.institutions);
    } catch (err) {
      console.error('Failed to fetch institutions', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    api
      .get('/admin/institutions')
      .then((res) => {
        if (isMounted) {
          setInstitutions(res.data.institutions);
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
    setCreating(true);

    try {
      await api.post('/admin/institutions', {
        name,
        address,
        contact_person: contactPerson,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
      setName('');
      setAddress('');
      setContactPerson('');
      setContactEmail('');
      setContactPhone('');
      setShowForm(false);
      fetchInstitutions();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to register institution.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="header-row">
        <div>
          <h1>Institutions</h1>
          <p className="subtitle">Authorize and manage participating organizations.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Register Institution'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>Register New Institution</h2>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>INSTITUTION NAME</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>ADDRESS</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>CONTACT PERSON</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div className="form-group">
                <label>CONTACT EMAIL</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>CONTACT PHONE</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 0712345678"
                  pattern="07[0-9]{8}"
                  title="Phone number must be in format 07XXXXXXXX"
                  required
                />
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Registering...' : 'Register Institution'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>INSTITUTION NAME</th>
              <th>CONTACT</th>
              <th>ASSIGNED STUDENTS</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst) => (
              <tr key={inst.id}>
                <td>
                  <div className="inst-name">{inst.name}</div>
                  <div className="inst-address">{inst.address}</div>
                </td>
                <td>
                  {inst.contact_person}
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{inst.contact_email}</span>
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{inst.contact_phone || '—'}</span>
                </td>
                <td>{inst.assigned_students}</td>
              </tr>
            ))}
            {institutions.length === 0 && (
              <tr><td colSpan={3} className="empty-state">No institutions registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminInstitutions;