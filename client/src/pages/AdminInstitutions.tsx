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

interface EditableInstitution {
  id: string;
  name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
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
  const [success, setSuccess] = useState('');
  const [editingInstitution, setEditingInstitution] = useState<EditableInstitution | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingInstitutionId, setDeletingInstitutionId] = useState<string | null>(null);

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
    setSuccess('');
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
      setSuccess(`Institution "${name}" registered successfully.`);
      fetchInstitutions();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to register institution.');
    } finally {
      setCreating(false);
    }
  };

  const openEditInstitution = (institution: Institution) => {
    setEditingInstitution({
      id: institution.id,
      name: institution.name || '',
      address: institution.address || '',
      contact_person: institution.contact_person || '',
      contact_email: institution.contact_email || '',
      contact_phone: institution.contact_phone || '',
    });
    setError('');
    setSuccess('');
  };

  const closeEditInstitution = () => {
    setEditingInstitution(null);
  };

  const handleSaveInstitutionEdit = async () => {
    if (!editingInstitution) return;
    setError('');
    setSuccess('');

    if (!editingInstitution.name.trim()) {
      setError('Institution name is required.');
      return;
    }

    if (!editingInstitution.contact_phone.trim()) {
      setError('Contact phone is required.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.patch(`/admin/institutions/${editingInstitution.id}`, {
        name: editingInstitution.name.trim(),
        address: editingInstitution.address.trim(),
        contact_person: editingInstitution.contact_person.trim(),
        contact_email: editingInstitution.contact_email.trim(),
        contact_phone: editingInstitution.contact_phone.trim(),
      });
      setSuccess(res.data?.message || 'Institution updated successfully.');
      setEditingInstitution(null);
      fetchInstitutions();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to update institution.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInstitution = async (institution: Institution) => {
    const confirmed = window.confirm(`Delete institution "${institution.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setDeletingInstitutionId(institution.id);

    try {
      const res = await api.delete(`/admin/institutions/${institution.id}`);
      setSuccess(res.data?.message || 'Institution deleted successfully.');
      fetchInstitutions();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to delete institution.');
    } finally {
      setDeletingInstitutionId(null);
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
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Registering...' : 'Register Institution'}
            </button>
          </form>
        </div>
      )}

      {!showForm && error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}
      {!showForm && success && <div className="success-message" style={{ marginBottom: '12px' }}>{success}</div>}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>INSTITUTION NAME</th>
              <th>CONTACT</th>
              <th>ASSIGNED STUDENTS</th>
              <th>ACTIONS</th>
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
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn-small" onClick={() => openEditInstitution(inst)}>
                      Edit
                    </button>
                    <button
                      className="btn-small"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => handleDeleteInstitution(inst)}
                      disabled={deletingInstitutionId === inst.id}
                    >
                      {deletingInstitutionId === inst.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {institutions.length === 0 && (
              <tr><td colSpan={4} className="empty-state">No institutions registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingInstitution && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2>Edit Institution</h2>
          <div className="form-row">
            <div className="form-group">
              <label>INSTITUTION NAME</label>
              <input
                type="text"
                value={editingInstitution.name}
                onChange={(e) => setEditingInstitution((prev) => prev ? { ...prev, name: e.target.value } : prev)}
              />
            </div>
            <div className="form-group">
              <label>ADDRESS</label>
              <input
                type="text"
                value={editingInstitution.address}
                onChange={(e) => setEditingInstitution((prev) => prev ? { ...prev, address: e.target.value } : prev)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>CONTACT PERSON</label>
              <input
                type="text"
                value={editingInstitution.contact_person}
                onChange={(e) => setEditingInstitution((prev) => prev ? { ...prev, contact_person: e.target.value } : prev)}
              />
            </div>
            <div className="form-group">
              <label>CONTACT EMAIL</label>
              <input
                type="email"
                value={editingInstitution.contact_email}
                onChange={(e) => setEditingInstitution((prev) => prev ? { ...prev, contact_email: e.target.value } : prev)}
              />
            </div>
            <div className="form-group">
              <label>CONTACT PHONE</label>
              <input
                type="text"
                value={editingInstitution.contact_phone}
                onChange={(e) => setEditingInstitution((prev) => prev ? { ...prev, contact_phone: e.target.value } : prev)}
                placeholder="e.g. 0712345678"
                pattern="07[0-9]{8}"
                title="Phone number must be in format 07XXXXXXXX"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-primary" onClick={handleSaveInstitutionEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}
              onClick={closeEditInstitution}
              disabled={savingEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInstitutions;