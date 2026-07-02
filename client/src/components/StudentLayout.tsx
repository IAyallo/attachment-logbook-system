import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../pages/StudentDashboard.css";

const StudentLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="user-card">
          <div className="user-avatar">🎓</div>
          <div>
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">{user?.reg_number || "Student"}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/student"
            end
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/student/logs"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Daily Logs
          </NavLink>
          <NavLink
            to="/student/report"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Composite Report
          </NavLink>
          <NavLink
            to="/student/apply"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Apply for Attachment
          </NavLink>
          <NavLink
            to="/student/institutions"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Approved Institutions
          </NavLink>
          <NavLink
            to="/student/previous-attachments"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Previous Attachments
          </NavLink>
          <NavLink
            to="/student/notifications"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Notifications
          </NavLink>
          <NavLink
            to="/student/grade"
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            Final Grade
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default StudentLayout;
