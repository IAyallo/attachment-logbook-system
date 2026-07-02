import { useState, useEffect } from 'react';
import api from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentGrade.css';

interface Breakdown {
  host_score: number | null;
  faculty_score: number | null;
  report_score: number | null;
  total_grade: number;
  is_complete: boolean;
  host_review: string | null;
  faculty_review: string | null;
  report_review: string | null;
}

interface GradeData {
  student: { reg_number: string; programme: string };
  breakdown: Breakdown;
}

const ScoreBar = ({ value, max, label }: { value: number | null; max: number; label: string }) => {
  const pct = value !== null ? (value / max) * 100 : 0;
  return (
    <div className="score-row">
      <div className="score-label">{label}</div>
      <div className="score-bar-wrapper">
        <div className="score-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="score-value">
        {value !== null ? `${value} / ${max}` : <span className="score-pending">Pending</span>}
      </div>
    </div>
  );
};

const StudentGrade = () => {
  const [data, setData] = useState<GradeData | null>(null);
  const [selectedReview, setSelectedReview] = useState<'host' | 'faculty' | 'report'>('host');

  useEffect(() => {
    api.get('/logs/my-grade').then((res) => setData(res.data)).catch(console.error);
  }, []);

  const getGradeLetter = (total: number) => {
    if (total >= 70) return { letter: 'A', label: 'Distinction', color: 'var(--accent-green)' };
    if (total >= 60) return { letter: 'B', label: 'Merit', color: 'var(--accent-blue)' };
    if (total >= 50) return { letter: 'C', label: 'Pass', color: 'var(--accent-orange)' };
    return { letter: 'F', label: 'Fail', color: 'var(--accent-red)' };
  };

  const grade = data ? getGradeLetter(data.breakdown.total_grade) : null;

  return (
    <StudentLayout>
      <h1>Final Grade</h1>
      <p className="subtitle">Your attachment grade breakdown across all three components.</p>

      {data ? (
        <>
          <div className="grade-header-grid">
            <div className="card grade-total-card">
              <div className="grade-total-label">TOTAL GRADE</div>
              <div className="grade-total-value" style={{ color: grade?.color }}>
                {data.breakdown.total_grade.toFixed(1)}
                <span className="grade-total-max"> / 100</span>
              </div>
              <div className="grade-letter" style={{ color: grade?.color }}>
                {grade?.letter} — {grade?.label}
              </div>
              {!data.breakdown.is_complete && (
                <div className="grade-incomplete">
                  ⚠ Some components are still pending — total will update when all are graded.
                </div>
              )}
            </div>

            <div className="card grade-info-card">
              <div className="grade-info-row">
                <span className="grade-info-label">REG NUMBER</span>
                <span>{data.student.reg_number}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">PROGRAMME</span>
                <span>{data.student.programme}</span>
              </div>
              <div className="grade-info-row">
                <span className="grade-info-label">STATUS</span>
                <span className={`badge ${data.breakdown.is_complete ? 'badge-approved' : 'badge-pending'}`}>
                  {data.breakdown.is_complete ? 'Complete' : 'In Progress'}
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h2>Grade Breakdown</h2>
            <p className="grade-breakdown-subtitle">Three components contribute to your final attachment grade.</p>

            <div className="scores-list">
              <ScoreBar
                label="Host Supervisor Score (Daily Logs)"
                value={data.breakdown.host_score}
                max={20}
              />
              <ScoreBar
                label="Faculty Assessment (Mid-term/Final)"
                value={data.breakdown.faculty_score}
                max={30}
              />
              <ScoreBar
                label="Composite Report"
                value={data.breakdown.report_score}
                max={50}
              />
            </div>

            <div className="total-row">
              <span>TOTAL</span>
              <span style={{ color: grade?.color, fontWeight: 700, fontSize: '20px' }}>
                {data.breakdown.total_grade.toFixed(1)} / 100
              </span>
            </div>
          </div>

          {data.breakdown.is_complete && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h2>Supervisor Reviews</h2>
              <p className="grade-breakdown-subtitle">
                Additional comments and checklist review details from your host and faculty supervisors.
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => setSelectedReview('host')}
                  style={{
                    background: selectedReview === 'host' ? 'var(--accent-blue)' : undefined,
                    color: selectedReview === 'host' ? '#fff' : undefined,
                  }}
                >
                  Host Review (20)
                </button>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => setSelectedReview('faculty')}
                  style={{
                    background: selectedReview === 'faculty' ? 'var(--accent-blue)' : undefined,
                    color: selectedReview === 'faculty' ? '#fff' : undefined,
                  }}
                >
                  Faculty Review (30)
                </button>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => setSelectedReview('report')}
                  style={{
                    background: selectedReview === 'report' ? 'var(--accent-blue)' : undefined,
                    color: selectedReview === 'report' ? '#fff' : undefined,
                  }}
                >
                  Report Review (50)
                </button>
              </div>

              <div className="form-group">
                <label>
                  {selectedReview === 'host'
                    ? 'HOST SUPERVISOR REVIEW (20 MARK FORM)'
                    : selectedReview === 'faculty'
                      ? 'FACULTY SUPERVISOR REVIEW (30 MARK FORM)'
                      : 'COMPOSITE REPORT REVIEW (50 MARK FORM)'}
                </label>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', lineHeight: 1.55 }}>
                  {selectedReview === 'host'
                    ? (data.breakdown.host_review || 'No host supervisor review comments provided.')
                    : selectedReview === 'faculty'
                      ? (data.breakdown.faculty_review || 'No faculty supervisor review comments provided.')
                      : (data.breakdown.report_review || 'No report review comments provided.')}
                </pre>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="empty-state">Loading grade data...</div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentGrade;