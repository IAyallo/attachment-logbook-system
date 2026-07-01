import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import FacultyLayout from '../components/FacultyLayout';
import './FacultyDashboard.css';

interface Student {
  id: string;
  reg_number: string;
  programme: string;
  attachment_start: string | null;
  attachment_end: string | null;
  assessment_id: string | null;
  assessment_status: string | null;
}

const rubricCriteria: Record<string, string[]> = {
  WBL: [
    'The student demonstrates meaningful progress toward achieving the Work-Based Learning objectives.',
    'The student is able to relate academic knowledge to workplace experiences.',
    'The student demonstrates critical thinking when discussing workplace tasks and challenges.',
    'The student maintains accurate and up-to-date internship documentation (e.g., logbook, reports).',
    'The student reflects on workplace experiences and identifies areas for personal and professional growth.',
    'The student demonstrates professionalism during interactions with the faculty supervisor and host organisation.',
    'The student understands the roles, expectations, and responsibilities within the host organisation.',
    'The student demonstrates ethical conduct and adherence to university and workplace policies.',
    'The student effectively communicates learning outcomes achieved during the placement.',
    'Overall, the student is making satisfactory progress in meeting the objectives of the Work-Based Learning programme.',
  ],
  SBL: [
    'The student demonstrates meaningful engagement with the community or partner organisation.',
    'The student effectively applies academic knowledge to address community needs.',
    'The student demonstrates critical reflection on the service experience.',
    'The student maintains complete and accurate Service-Based Learning documentation.',
    'The student demonstrates an understanding of the social issues addressed through the service activity.',
    'The student demonstrates professionalism and ethical conduct throughout the placement.',
    'The student communicates effectively with community partners and the faculty supervisor.',
    'The student demonstrates civic responsibility and respect for diversity within the community.',
    'The student is able to explain the impact of the service activity on both the community and their own learning.',
    'Overall, the student is achieving the intended Service-Based Learning outcomes.',
  ],
};

const openQuestions: Record<string, string[]> = {
  WBL: [
    'Based on your interactions with the student and host organisation, what evidence demonstrates that the student is achieving the intended learning outcomes?',
    'What recommendations would you make to improve the Work-Based Learning programme or strengthen its connection to the academic curriculum?',
    'Would you recommend this organisation for future Work-Based Learning placements? Please explain your response.',
    "Please provide any additional observations or comments regarding the student's learning experience.",
  ],
  SBL: [
    'What evidence indicates that the student has successfully integrated academic learning with community service?',
    'What improvements could be made to strengthen the Service-Based Learning experience for future students?',
    'Would you recommend this community partner for future Service-Based Learning placements? Please explain your response.',
    "Please provide any additional observations or comments regarding the student's engagement and learning.",
  ],
};

const FacultyAssessmentForm = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [ratings, setRatings] = useState<number[]>(Array.from({ length: 10 }, () => 3));
  const [answers, setAnswers] = useState<string[]>(Array.from({ length: 4 }, () => ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    api
      .get('/assessments/students')
      .then((res) => {
        if (!isMounted) return;

        const found = (res.data.students as Student[]).find((s) => s.id === studentId) || null;
        setStudent(found);
        setLoadingStudent(false);
      })
      .catch((err) => {
        console.error('Failed to load student for assessment', err);
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
  const criteria = useMemo(() => rubricCriteria[programme], [programme]);
  const questions = useMemo(() => openQuestions[programme], [programme]);

  const totalOutOf50 = ratings.reduce((sum, value) => sum + value, 0);
  const scoreOutOf30 = parseFloat(((totalOutOf50 / 50) * 30).toFixed(2));

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
      `${programme} Supervisor Evaluation`,
      '',
      `Calculated Score: ${scoreOutOf30}/30 (from ${totalOutOf50}/50 rubric score)`,
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
      await api.post('/assessments', {
        student_id: student.id,
        form_type: 'mid_term',
        faculty_marks: scoreOutOf30,
        faculty_comments: buildCommentsPayload(),
      });

      setSuccess('Assessment submitted successfully.');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStudent) {
    return (
      <FacultyLayout>
        <h1>Faculty Assessment Form</h1>
        <div className="card">
          <div className="empty-state">Loading assessment form...</div>
        </div>
      </FacultyLayout>
    );
  }

  if (!student) {
    return (
      <FacultyLayout>
        <h1>Faculty Assessment Form</h1>
        <div className="card">
          <div className="error-message" style={{ marginBottom: '12px' }}>
            Student not found or not assigned to you.
          </div>
          <button className="btn-primary" onClick={() => navigate('/faculty')}>
            Back to Students List
          </button>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="header-row">
        <div>
          <h1>{programme} Supervisor Evaluation</h1>
          <p className="subtitle">
            Student: {student.reg_number} | Criteria rated 1-5 and auto-converted to score out of 30.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/faculty')}>
          Back
        </button>
      </div>

      <form className="card" onSubmit={handleSubmit}>
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
          <div className="criteria-title">Calculated Faculty Marks</div>
          <div className="criteria-subtitle">
            Rubric total: {totalOutOf50}/50 | Submitted marks: {scoreOutOf30}/30
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
            {submitting ? 'Submitting...' : 'Submit Evaluation'}
          </button>
        </div>
      </form>
    </FacultyLayout>
  );
};

export default FacultyAssessmentForm;
