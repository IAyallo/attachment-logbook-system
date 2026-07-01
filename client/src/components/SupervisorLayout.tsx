import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/SupervisorDashboard.css';

const SupervisorLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="user-card">
          <div className="user-avatar">👔</div>
          <div>
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">{user?.job_title || 'Host Supervisor'}</div>
            {user?.institution_name && (
              <div className="user-institution">{user.institution_name}</div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/supervisor" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Pending Logs
          </NavLink>
          <NavLink to="/supervisor/students" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Student List
          </NavLink>
          <NavLink to="/supervisor/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Reports
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default SupervisorLayout;