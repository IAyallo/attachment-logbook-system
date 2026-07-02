import { useEffect, useState } from 'react';
import api from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentDashboard.css';

interface InstitutionRow {
  id: string;
  name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
}

const StudentInstitutions = () => {
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);

  useEffect(() => {
    api.get('/applications/institutions').then((res) => {
      setInstitutions(res.data.institutions || []);
    }).catch((err) => {
      console.error('Failed to load institutions', err);
    });
  }, []);

  return (
    <StudentLayout>
      <h1>Approved Institutions</h1>
      <p className="subtitle">Browse all approved existing institutions available for attachment applications.</p>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>INSTITUTION</th>
              <th>ADDRESS</th>
              <th>CONTACT PERSON</th>
              <th>CONTACT EMAIL</th>
              <th>CONTACT PHONE</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst) => (
              <tr key={inst.id}>
                <td>{inst.name}</td>
                <td>{inst.address || '—'}</td>
                <td>{inst.contact_person || '—'}</td>
                <td>{inst.contact_email || '—'}</td>
                <td>{inst.contact_phone || '—'}</td>
              </tr>
            ))}
            {institutions.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">No approved institutions available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StudentLayout>
  );
};

export default StudentInstitutions;
