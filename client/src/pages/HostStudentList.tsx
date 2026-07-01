import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import SupervisorLayout from '../components/SupervisorLayout';
import './SupervisorDashboard.css';
import './AdminDashboard.css';

interface StudentRow {
  id: string;
  reg_number: string;
  programme: string;
  approved_logs: string;
  pending_logs: string;
  average_log_score: string;
  graded_logs_count: string;
  finalized_host_marks: string | null;
}

const HostStudentList = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const navigate = useNavigate();

  const fetchStudents = () => {
    api.get('/logs/my-students').then((res) => setStudents(res.data.students)).catch(console.error);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <SupervisorLayout>
      <h1>Student List</h1>
      <p className="subtitle">Review student daily-log performance and assess each student using the full WBL/SBL host rubric.</p>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>REG NUMBER</th>
              <th>PROGRAMME</th>
              <th>LOG PERFORMANCE</th>
              <th>CURRENT HOST SCORE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.reg_number}</td>
                <td>{s.programme}</td>
                <td>
                  {parseFloat(s.average_log_score).toFixed(2)} / 20
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    from {s.graded_logs_count} graded logs
                  </div>
                </td>
                <td>
                  {s.finalized_host_marks !== null ? `${parseFloat(s.finalized_host_marks).toFixed(2)} / 20` : 'Not finalized'}
                </td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => navigate(`/supervisor/assess/${s.id}`)}
                  >
                    Assess
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">No students assigned yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SupervisorLayout>
  );
};

export default HostStudentList;