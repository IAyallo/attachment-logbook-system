import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import api from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import './AdminDashboard.css';

interface AssignmentRow {
  id: string;
  reg_number: string;
  programme: string;
  student_name: string;
  host_supervisor_id: string | null;
  host_supervisor_name: string | null;
  faculty_supervisor_id: string | null;
  faculty_supervisor_name: string | null;
}

interface HostOption {
  id: string;
  full_name: string;
  email: string;
  institution_name: string | null;
}

interface FacultyOption {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

interface DraftAssignment {
  host_supervisor_id: string;
  faculty_supervisor_id: string;
}

const AdminAssignments = () => {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [hostOptions, setHostOptions] = useState<HostOption[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftAssignment>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initializeDrafts = (assignmentRows: AssignmentRow[]) => {
    const nextDrafts: Record<string, DraftAssignment> = {};
    assignmentRows.forEach((row) => {
      nextDrafts[row.id] = {
        host_supervisor_id: row.host_supervisor_id || '',
        faculty_supervisor_id: row.faculty_supervisor_id || '',
      };
    });
    setDrafts(nextDrafts);
  };

  const fetchData = async () => {
    try {
      const [assignmentsRes, optionsRes] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/admin/assignment-options'),
      ]);

      const assignmentRows = assignmentsRes.data.assignments as AssignmentRow[];
      setRows(assignmentRows);
      initializeDrafts(assignmentRows);
      setHostOptions(optionsRes.data.host_supervisors || []);
      setFacultyOptions(optionsRes.data.faculty_supervisors || []);
    } catch (err) {
      console.error('Failed to fetch assignment data', err);
      setError('Failed to load assignments.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingCount = useMemo(() => {
    return rows.filter((row) => !row.host_supervisor_id || !row.faculty_supervisor_id).length;
  }, [rows]);

  const updateDraft = (
    studentId: string,
    field: keyof DraftAssignment,
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = event.target.value;
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const saveAssignment = async (studentId: string) => {
    const draft = drafts[studentId];
    if (!draft) return;

    setError('');
    setSuccess('');
    setSavingStudentId(studentId);

    try {
      await api.patch(`/admin/assignments/${studentId}`, {
        host_supervisor_id: draft.host_supervisor_id || null,
        faculty_supervisor_id: draft.faculty_supervisor_id || null,
      });

      setSuccess('Assignments updated successfully.');
      await fetchData();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to update assignments.');
    } finally {
      setSavingStudentId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="header-row">
        <div>
          <h1>Assignments</h1>
          <p className="subtitle">
            Assign host and faculty supervisors to students from one dedicated workflow.
          </p>
        </div>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="card stat-card">
          <div className="stat-label">TOTAL STUDENTS</div>
          <div className="stat-value">{rows.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">NEEDING ASSIGNMENT</div>
          <div className="stat-value stat-orange">{pendingCount}</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>STUDENT</th>
              <th>PROGRAMME</th>
              <th>HOST SUPERVISOR</th>
              <th>FACULTY SUPERVISOR</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{row.student_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{row.reg_number}</div>
                </td>
                <td>{row.programme}</td>
                <td>
                  <select
                    value={drafts[row.id]?.host_supervisor_id || ''}
                    onChange={(event) => updateDraft(row.id, 'host_supervisor_id', event)}
                  >
                    <option value="">Unassigned</option>
                    {hostOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.full_name} {option.institution_name ? `(${option.institution_name})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={drafts[row.id]?.faculty_supervisor_id || ''}
                    onChange={(event) => updateDraft(row.id, 'faculty_supervisor_id', event)}
                  >
                    <option value="">Unassigned</option>
                    {facultyOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.full_name} {option.department ? `(${option.department})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => saveAssignment(row.id)}
                    disabled={savingStudentId === row.id}
                  >
                    {savingStudentId === row.id ? 'Saving...' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">No students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminAssignments;
