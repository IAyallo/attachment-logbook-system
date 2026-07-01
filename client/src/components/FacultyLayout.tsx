import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/FacultyDashboard.css';

const FacultyLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="user-card">
          <div className="user-avatar">📋</div>
          <div>
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">{user?.department || 'Faculty Supervisor'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/faculty" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            My Students
          </NavLink>
          <NavLink to="/faculty/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Composite Reports
          </NavLink>
          <NavLink to="/faculty/analytics" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Analytics Reports
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default FacultyLayout;