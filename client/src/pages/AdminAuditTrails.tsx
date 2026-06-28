import { useState, useEffect } from 'react';
import api from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface AuditTrail {
  id: string;
  action: string;
  change_detail: string;
  full_name: string;
  email: string;
  performed_at: string;
}

const AdminAuditTrails = () => {
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);

  useEffect(() => {
    api.get('/admin/audit-trails').then((res) => setAuditTrails(res.data.audit_trails)).catch(console.error);
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  return (
    <AdminLayout>
      <h1>Audit Trails</h1>
      <p className="subtitle">Complete history of system actions and approvals.</p>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ACTION</th>
              <th>DETAIL</th>
              <th>PERFORMED BY</th>
              <th>WHEN</th>
            </tr>
          </thead>
          <tbody>
            {auditTrails.map((trail) => (
              <tr key={trail.id}>
                <td>
                  <span className={`audit-action audit-${trail.action}`}>
                    {trail.action.toUpperCase()}
                  </span>
                </td>
                <td>{trail.change_detail}</td>
                <td>{trail.full_name} <br /><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{trail.email}</span></td>
                <td>{timeAgo(trail.performed_at)}</td>
              </tr>
            ))}
            {auditTrails.length === 0 && (
              <tr><td colSpan={4} className="empty-state">No activity recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminAuditTrails;