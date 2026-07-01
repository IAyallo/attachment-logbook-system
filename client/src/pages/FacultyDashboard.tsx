import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import './FacultyDashboard.css';
import FacultyLayout from '../components/FacultyLayout';

interface Student {
  id: string;
  reg_number: string;
  programme: string;
  attachment_start: string | null;
  attachment_end: string | null;
  assessment_id: string | null;
  assessment_status: string | null;
}

const FacultyDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    api
      .get('/assessments/students')
      .then((res) => {
        if (isMounted) {
          setStudents(res.data.students);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch students', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = students.filter((s) => s.assessment_status !== 'approved').length;
  const completedCount = students.filter((s) => s.assessment_status === 'approved').length;

  return (
    <FacultyLayout>
        <h1>Faculty Evaluation Portal</h1>
        <p className="subtitle">Reviewing {students.length} active student attachments.</p>

        <div className="stats-row">
          <div className="card stat-card">
            <div className="stat-label">PENDING EVALUATIONS</div>
            <div className="stat-value stat-orange">{pendingCount}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">COMPLETED</div>
            <div className="stat-value stat-green">{completedCount}</div>
          </div>
        </div>

        <div className="content-grid">
          <div className="card students-card">
            <h2>My Students</h2>
            <table className="students-table">
              <thead>
                <tr>
                  <th>REG NUMBER</th>
                  <th>PROGRAMME</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.reg_number}</td>
                    <td>{s.programme}</td>
                    <td>
                      <span className={`badge ${s.assessment_status === 'approved' ? 'badge-approved' : 'badge-pending'}`}>
                        {s.assessment_status === 'approved' ? 'Evaluated' : 'Ready for Review'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-small"
                        onClick={() => navigate(`/faculty/assess/${s.id}`)}
                      >
                        Assess
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state">No students assigned yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card assessment-card">
            <div className="assessment-badge">ASSESSMENT FLOW</div>
            <h2>Question-Based Rubric Form</h2>
            <p className="assessment-subtitle">
              Click Assess for any student to open the full {`WBL/SBL`} rubric with scored criteria and open-ended questions.
            </p>
            <div className="criteria-panel">
              <div className="criteria-title">Scoring Logic</div>
              <div className="criteria-subtitle">
                Each criterion is rated 1-5 across 10 questions. The system auto-converts the total to a score out of 30.
              </div>
            </div>
            <div className="empty-detail" style={{ marginTop: '16px' }}>
              Select a student from the list and continue to their assessment form.
            </div>
          </div>
        </div>
      </FacultyLayout>
  );
};

export default FacultyDashboard;