import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import SupervisorLayout from '../components/SupervisorLayout';
import './SupervisorDashboard.css';
import './FacultyDashboard.css';

interface HostStudentRow {
  id: string;
  reg_number: string;
  programme: string;
  approved_logs: string;
  pending_logs: string;
  average_log_score: string;
  graded_logs_count: string;
  finalized_host_marks: string | null;
}

const hostRubricCriteria: Record<string, string[]> = {
  WBL: [
    'Demonstrates growth in professional and career-related skills.',
    'Produces work that is accurate, timely, and of good quality.',
    'Communicates effectively with colleagues, supervisors, and clients.',
    'Demonstrates punctuality, reliability, and good time management.',
    'Shows initiative by identifying and solving workplace challenges.',
    'Accepts and applies feedback to improve performance.',
    'Works collaboratively and contributes positively to the workplace team.',
    'Demonstrates professionalism, ethical conduct, and respect in the workplace.',
    'Understands assigned responsibilities and performs them with minimal supervision.',
    'Applies knowledge and skills acquired through university studies to workplace tasks.',
  ],
  SBL: [
    'Demonstrates commitment to serving the community or organisation.',
    'Participates actively in service activities and assigned responsibilities.',
    'Communicates respectfully and effectively with community members and stakeholders.',
    'Demonstrates dependability by attending activities consistently and meeting agreed commitments.',
    'Shows initiative in identifying community needs and contributing solutions.',
    'Accepts feedback and uses it to improve service delivery.',
    'Works collaboratively with community members, staff, and fellow students.',
    'Demonstrates empathy, respect for diversity, and cultural sensitivity.',
    'Applies academic knowledge to address real community challenges.',
    'Reflects a strong sense of civic responsibility and ethical service.',
  ],
};

const hostOpenQuestions: Record<string, string[]> = {
  WBL: [
    'What professional or technical skills has the student developed during the placement?',
    'In your opinion, what additional knowledge or competencies should the university incorporate into its curriculum to better prepare students for industry?',
    'Would you consider hosting another Work-Based Learning student in the future? Please explain your response.',
    "Please share any additional comments or recommendations regarding the student's performance or the Work-Based Learning programme.",
  ],
  SBL: [
    'What meaningful contributions has the student made to your organisation or community during the service period?',
    'What knowledge, skills, or attitudes would better prepare future students for effective community engagement?',
    'Would you recommend your organisation as a Service-Based Learning placement partner for future students? Please explain your response.',
    "Please provide any additional comments, observations, or suggestions regarding the student's service and the Service-Based Learning programme.",
  ],
};

const HostAssessmentForm = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<HostStudentRow | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [ratings, setRatings] = useState<number[]>(Array.from({ length: 10 }, () => 3));
  const [answers, setAnswers] = useState<string[]>(Array.from({ length: 4 }, () => ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    api
      .get('/logs/my-students')
      .then((res) => {
        if (!isMounted) return;

        const found = (res.data.students as HostStudentRow[]).find((s) => s.id === studentId) || null;
        setStudent(found);
        setLoadingStudent(false);
      })
      .catch((err) => {
        console.error('Failed to load student for host assessment', err);
        if (isMounted) {
          setError('Failed to load student details.');
          setLoadingStudent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const programme = (student?.programme === 'SBL' ? 'SBL' : 'WBL') as 'WBL' | 'SBL';
  const criteria = useMemo(() => hostRubricCriteria[programme], [programme]);
  const questions = useMemo(() => hostOpenQuestions[programme], [programme]);

  const totalOutOf50 = ratings.reduce((sum, value) => sum + value, 0);
  const suggestedOutOf20 = parseFloat(((totalOutOf50 / 50) * 20).toFixed(2));
  const averageLogScore = student ? parseFloat(student.average_log_score || '0') : 0;
  const gradedLogsCount = student ? parseInt(student.graded_logs_count || '0', 10) : 0;

  const handleRatingChange = (index: number, value: string) => {
    const parsed = Number(value);
    const updated = [...ratings];
    updated[index] = Number.isNaN(parsed) ? 1 : parsed;
    setRatings(updated);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const buildCommentsPayload = () => {
    const criteriaLines = criteria
      .map((criterion, index) => `${index + 1}. ${criterion} [${ratings[index]}/5]`)
      .join('\n');

    const questionLines = questions
      .map((question, index) => `${index + 1}. ${question}\nResponse: ${answers[index] || 'N/A'}`)
      .join('\n\n');

    return [
      `${programme} Host Supervisor Evaluation`,
      '',
      `Suggested Host Score: ${suggestedOutOf20}/20 (from ${totalOutOf50}/50 rubric score)`,
      `Daily Log Average Reference: ${averageLogScore}/20 (from ${gradedLogsCount} graded logs)`,
      '',
      'Performance Criteria Ratings (1-5):',
      criteriaLines,
      '',
      'Open-Ended Responses:',
      questionLines,
    ].join('\n');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setError('');
    setSuccess('');

    const hasBlankAnswer = answers.some((answer) => !answer.trim());
    if (hasBlankAnswer) {
      setError('Please answer all open-ended questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/logs/host-score/${student.id}`, {
        host_marks: suggestedOutOf20,
        host_comments: buildCommentsPayload(),
      });

      setSuccess('Host assessment submitted successfully.');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to submit host assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStudent) {
    return (
      <SupervisorLayout>
        <h1>Host Supervisor Assessment</h1>
        <div className="card">
          <div className="empty-state">Loading assessment form...</div>
        </div>
      </SupervisorLayout>
    );
  }

  if (!student) {
    return (
      <SupervisorLayout>
        <h1>Host Supervisor Assessment</h1>
        <div className="card">
          <div className="error-message" style={{ marginBottom: '12px' }}>
            Student not found or not assigned to you.
          </div>
          <button className="btn-primary" onClick={() => navigate('/supervisor/students')}>
            Back to Students List
          </button>
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="header-row">
        <div>
          <h1>{programme} Host Supervisor Evaluation</h1>
          <p className="subtitle">
            Student: {student.reg_number} | This rubric suggests a fair host score out of 20.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/supervisor/students')}>
          Back
        </button>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="assessment-badge">DAILY LOG PERFORMANCE CONTEXT</div>
        <div className="criteria-panel" style={{ marginBottom: '20px' }}>
          <div className="criteria-title">Average Daily Log Performance</div>
          <div className="criteria-subtitle">
            {averageLogScore}/20 from {gradedLogsCount} approved logs with marks.
          </div>
          {student.finalized_host_marks && (
            <div className="criteria-subtitle" style={{ marginBottom: 0 }}>
              Existing finalized host score: {student.finalized_host_marks}/20
            </div>
          )}
        </div>

        <div className="assessment-badge">PERFORMANCE CRITERIA (RATE 1-5)</div>

        <div className="criteria-list" style={{ marginBottom: '20px' }}>
          {criteria.map((criterion, index) => (
            <div key={criterion} className="criteria-item" style={{ alignItems: 'flex-start' }}>
              <span style={{ maxWidth: '78%' }}>{index + 1}. {criterion}</span>
              <select
                value={ratings[index]}
                onChange={(e) => handleRatingChange(index, e.target.value)}
                style={{ width: '88px' }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
          ))}
        </div>

        <div className="criteria-panel" style={{ marginBottom: '20px' }}>
          <div className="criteria-title">Calculated Host Marks</div>
          <div className="criteria-subtitle">
            Rubric total: {totalOutOf50}/50 | Suggested host score: {suggestedOutOf20}/20
          </div>
        </div>

        <div className="assessment-badge">OPEN-ENDED QUESTIONS</div>
        {questions.map((question, index) => (
          <div className="form-group" key={question}>
            <label>{index + 1}. {question}</label>
            <textarea
              rows={4}
              value={answers[index]}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              required
            />
          </div>
        ))}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Host Evaluation'}
          </button>
        </div>
      </form>
    </SupervisorLayout>
  );
};

export default HostAssessmentForm;
