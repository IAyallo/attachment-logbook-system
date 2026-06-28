import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/AdminDashboard.css';

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="user-card">
          <div className="user-avatar">🛡️</div>
          <div>
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">System Root</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/institutions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Institutions
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Users
          </NavLink>
          <NavLink to="/admin/audit-trails" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Audit Trails
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default AdminLayout;