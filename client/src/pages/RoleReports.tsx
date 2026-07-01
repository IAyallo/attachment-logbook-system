import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import SupervisorLayout from '../components/SupervisorLayout';
import FacultyLayout from '../components/FacultyLayout';
import AdminLayout from '../components/AdminLayout';
import './StudentDashboard.css';

interface StudentOption {
  id: string;
  reg_number: string;
  programme: string;
}

interface WeeklyRow {
  week_start: string;
  total_hours: string;
  total_entries: string;
  approved_entries: string;
  submitted_entries: string;
  approval_rate: string;
}

interface CategoryRow {
  category: string;
  entries: string;
  total_hours: string;
  average_marks: string | null;
  approved_entries: string;
}

interface CategoryLog {
  id: string;
  entry_date: string;
  title: string;
  category: string;
  hours_logged: string;
  status: string;
  marks: string | null;
  reg_number: string;
}

const RoleReports = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [weeklyRows, setWeeklyRows] = useState<WeeklyRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [logs, setLogs] = useState<CategoryLog[]>([]);

  const role = user?.role || '';

  useEffect(() => {
    api.get('/reports/students').then((res) => setStudents(res.data.students)).catch(console.error);
  }, []);

  useEffect(() => {
    const params = selectedStudentId ? { studentId: selectedStudentId } : {};

    api.get('/reports/weekly', { params }).then((res) => setWeeklyRows(res.data.weekly)).catch(console.error);
    api.get('/reports/category-performance', { params }).then((res) => setCategoryRows(res.data.categories)).catch(console.error);
  }, [selectedStudentId]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedStudentId) params.studentId = selectedStudentId;
    if (selectedCategory !== 'All') params.category = selectedCategory;

    api.get('/reports/logs-by-category', { params }).then((res) => setLogs(res.data.logs)).catch(console.error);
  }, [selectedStudentId, selectedCategory]);

  const titleByRole: Record<string, string> = {
    host_supervisor: 'Student Performance Reports',
    faculty_supervisor: 'Attachment Reports',
    admin: 'System Reports',
  };

  const subtitleByRole: Record<string, string> = {
    host_supervisor: 'Weekly and category analytics for assigned students.',
    faculty_supervisor: 'Review weekly and category-based learning performance.',
    admin: 'Institution-wide weekly and category report analytics.',
  };

  const reportContent = (
    <>
      <h1>{titleByRole[role] || 'Reports'}</h1>
      <p className="subtitle">{subtitleByRole[role] || 'Generated on-demand from current logbook data.'}</p>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="form-row">
          <div className="form-group" style={{ maxWidth: '340px' }}>
            <label>STUDENT FILTER</label>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              <option value="">All Scoped Students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.reg_number} ({student.programme})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2>Detailed Weekly Report</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>WEEK START</th>
              <th>HOURS</th>
              <th>TOTAL LOGS</th>
              <th>APPROVED</th>
              <th>SUBMITTED</th>
              <th>APPROVAL RATE</th>
            </tr>
          </thead>
          <tbody>
            {weeklyRows.map((row) => (
              <tr key={row.week_start}>
                <td>{new Date(row.week_start).toLocaleDateString()}</td>
                <td>{row.total_hours}</td>
                <td>{row.total_entries}</td>
                <td>{row.approved_entries}</td>
                <td>{row.submitted_entries}</td>
                <td>{row.approval_rate}%</td>
              </tr>
            ))}
            {weeklyRows.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No weekly data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2>Category Performance</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>ENTRIES</th>
              <th>TOTAL HOURS</th>
              <th>AVG MARKS</th>
              <th>APPROVED</th>
            </tr>
          </thead>
          <tbody>
            {categoryRows.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.entries}</td>
                <td>{row.total_hours}</td>
                <td>{row.average_marks || '—'}</td>
                <td>{row.approved_entries}</td>
              </tr>
            ))}
            {categoryRows.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No category analytics available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Logs By Category</h2>
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>FILTER CATEGORY</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {categoryRows.map((row) => (
              <option key={row.category} value={row.category}>{row.category}</option>
            ))}
          </select>
        </div>

        <table className="activity-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>REG NUMBER</th>
              <th>TITLE</th>
              <th>CATEGORY</th>
              <th>HOURS</th>
              <th>STATUS</th>
              <th>MARKS</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.entry_date).toLocaleDateString()}</td>
                <td>{row.reg_number}</td>
                <td>{row.title}</td>
                <td>{row.category}</td>
                <td>{row.hours_logged}</td>
                <td>{row.status}</td>
                <td>{row.marks || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No logs available for this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  if (role === 'host_supervisor') {
    return <SupervisorLayout>{reportContent}</SupervisorLayout>;
  }

  if (role === 'faculty_supervisor') {
    return <FacultyLayout>{reportContent}</FacultyLayout>;
  }

  if (role === 'admin') {
    return <AdminLayout>{reportContent}</AdminLayout>;
  }

  return <StudentLayout>{reportContent}</StudentLayout>;
};

export default RoleReports;
