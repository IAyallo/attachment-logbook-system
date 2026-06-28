import { useState, useEffect } from 'react';
import api from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface Overview {
  total_hours_logged: number;
  sync_success_rate: string;
  active_supervisors: number;
  total_institutions: number;
}

const AdminDashboard = () => {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api.get('/admin/overview').then((res) => setOverview(res.data)).catch(console.error);
  }, []);

  return (
    <AdminLayout>
      <h1>Administrator Overview</h1>
      <p className="subtitle">
        Managing {overview?.total_institutions ?? 0} institutions and active attachment cycles.
      </p>

      <div className="stats-row">
        <div className="card stat-card">
          <div className="stat-label">TOTAL HOURS LOGGED</div>
          <div className="stat-value">{overview?.total_hours_logged?.toLocaleString() ?? '—'}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">SYNC SUCCESS RATE</div>
          <div className="stat-value stat-green">{overview?.sync_success_rate ?? '—'}%</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">ACTIVE SUPERVISORS</div>
          <div className="stat-value">{overview?.active_supervisors ?? '—'}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">INSTITUTIONS</div>
          <div className="stat-value">{overview?.total_institutions ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <h2>Quick Navigation</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Use the sidebar to manage institutions, onboard users, or review the system audit trail.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;