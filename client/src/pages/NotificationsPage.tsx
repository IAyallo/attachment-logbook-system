import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import SupervisorLayout from '../components/SupervisorLayout';
import FacultyLayout from '../components/FacultyLayout';
import AdminLayout from '../components/AdminLayout';
import './StudentDashboard.css';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const content = (
    <>
      <div className="header-row">
        <div>
          <h1>Notifications</h1>
          <p className="subtitle">Unread: {unreadCount}</p>
        </div>
        <button className="btn-primary" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark All Read
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">No notifications yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>STATUS</th>
                <th>TITLE</th>
                <th>MESSAGE</th>
                <th>TIME</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`badge ${item.is_read ? 'badge-approved' : 'badge-pending'}`}>
                      {item.is_read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td>{item.title}</td>
                  <td>{item.message}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td>
                    {!item.is_read && (
                      <button className="btn-small" onClick={() => markRead(item.id)}>
                        Mark Read
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  if (user?.role === 'student') return <StudentLayout>{content}</StudentLayout>;
  if (user?.role === 'host_supervisor') return <SupervisorLayout>{content}</SupervisorLayout>;
  if (user?.role === 'faculty_supervisor') return <FacultyLayout>{content}</FacultyLayout>;
  return <AdminLayout>{content}</AdminLayout>;
};

export default NotificationsPage;
