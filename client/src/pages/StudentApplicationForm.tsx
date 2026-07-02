import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api/axios';
import StudentLayout from '../components/StudentLayout';
import './StudentDashboard.css';

interface InstitutionOption {
  id: string;
  name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
}

interface ApplicationItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  course: string;
  attachment_type: string;
  start_date: string;
  end_date: string;
  admin_notes: string | null;
  created_at: string;
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StudentApplicationForm = () => {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  const [course, setCourse] = useState('');
  const [attachmentType, setAttachmentType] = useState('WBL');
  const [attachmentPeriod, setAttachmentPeriod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [daysPerWeek, setDaysPerWeek] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  const [institutionMode, setInstitutionMode] = useState<'existing' | 'new'>('existing');
  const [existingInstitutionId, setExistingInstitutionId] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [organisationDescription, setOrganisationDescription] = useState('');
  const [organisationCountry, setOrganisationCountry] = useState('Kenya');
  const [organisationCounty, setOrganisationCounty] = useState('');
  const [organisationConstituency, setOrganisationConstituency] = useState('');

  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorDesignation, setSupervisorDesignation] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [supervisorPhone, setSupervisorPhone] = useState('');

  const [keyActivities, setKeyActivities] = useState('');
  const [skillsToDevelop, setSkillsToDevelop] = useState('');
  const [trainingOpportunities, setTrainingOpportunities] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const [institutionsRes, myAppsRes] = await Promise.all([
        api.get('/applications/institutions'),
        api.get('/applications/my'),
      ]);

      setInstitutions(institutionsRes.data.institutions || []);
      setApplications(myAppsRes.data.applications || []);

      if (!existingInstitutionId && (institutionsRes.data.institutions || []).length > 0) {
        setExistingInstitutionId(institutionsRes.data.institutions[0].id);
      }
    } catch (err) {
      console.error('Failed to load application data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activePending = useMemo(
    () => applications.find((app) => app.status === 'pending'),
    [applications],
  );

  const toggleDay = (day: string) => {
    setDaysPerWeek((prev) => {
      if (prev.includes(day)) return prev.filter((item) => item !== day);
      return [...prev, day];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (activePending) {
      setError('You already have a pending application awaiting admin review.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/applications', {
        course,
        attachment_type: attachmentType,
        attachment_period: attachmentPeriod,
        start_date: startDate,
        end_date: endDate,
        hours_per_day: Number(hoursPerDay),
        days_per_week: daysPerWeek,
        institution_mode: institutionMode,
        existing_institution_id: institutionMode === 'existing' ? existingInstitutionId : undefined,
        organisation_name: institutionMode === 'new' ? organisationName : undefined,
        organisation_description: institutionMode === 'new' ? organisationDescription : undefined,
        organisation_country: institutionMode === 'new' ? organisationCountry : undefined,
        organisation_county: institutionMode === 'new' ? organisationCounty : undefined,
        organisation_constituency: institutionMode === 'new' ? organisationConstituency : undefined,
        supervisor_name: supervisorName,
        supervisor_designation: supervisorDesignation,
        supervisor_email: supervisorEmail,
        supervisor_phone: supervisorPhone,
        key_activities: keyActivities.split('\n').map((item) => item.trim()).filter(Boolean),
        skills_to_develop: skillsToDevelop.split('\n').map((item) => item.trim()).filter(Boolean),
        training_opportunities: trainingOpportunities.split('\n').map((item) => item.trim()).filter(Boolean),
      });

      setSuccess('Application submitted successfully and is pending admin approval.');
      setCourse('');
      setAttachmentPeriod('');
      setStartDate('');
      setEndDate('');
      setHoursPerDay('8');
      setSupervisorName('');
      setSupervisorDesignation('');
      setSupervisorEmail('');
      setSupervisorPhone('');
      setKeyActivities('');
      setSkillsToDevelop('');
      setTrainingOpportunities('');
      setOrganisationName('');
      setOrganisationDescription('');
      setOrganisationCountry('Kenya');
      setOrganisationCounty('');
      setOrganisationConstituency('');

      loadData();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <h1>Apply for Attachment</h1>
      <p className="subtitle">
        Submit your attachment application with host and institution details. All submissions require admin approval.
      </p>

      {activePending && (
        <div className="card" style={{ borderColor: 'var(--accent-orange)', marginBottom: '20px' }}>
          <div style={{ color: 'var(--accent-orange)', fontWeight: 600, fontSize: '13px' }}>
            Pending application in progress. Submit a new one after current review is completed.
          </div>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <h2>1. Attachment Details</h2>
        <div className="form-row">
          <div className="form-group">
            <label>COURSE</label>
            <input value={course} onChange={(e) => setCourse(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>ATTACHMENT TYPE</label>
            <select value={attachmentType} onChange={(e) => setAttachmentType(e.target.value)}>
              <option value="WBL">WBL</option>
              <option value="SBL">SBL</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>ATTACHMENT PERIOD</label>
            <input
              placeholder="e.g. May 2026 - Aug 2026"
              value={attachmentPeriod}
              onChange={(e) => setAttachmentPeriod(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>HOURS PER DAY</label>
            <input type="number" min={1} max={24} value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>START DATE</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>END DATE</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </div>

        <div className="form-group">
          <label>DAYS PER WEEK</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {weekDays.map((day) => (
              <label key={day} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={daysPerWeek.includes(day)}
                  onChange={() => toggleDay(day)}
                  style={{ marginRight: '6px' }}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <h2 style={{ marginTop: '22px' }}>2. Organisation Details</h2>
        <div className="form-group">
          <label>ORGANISATION OPTION</label>
          <select value={institutionMode} onChange={(e) => setInstitutionMode(e.target.value as 'existing' | 'new')}>
            <option value="existing">Use Approved Existing Institution</option>
            <option value="new">Propose New Institution (Pending Approval)</option>
          </select>
        </div>

        {institutionMode === 'existing' ? (
          <div className="form-group">
            <label>SELECT APPROVED INSTITUTION</label>
            <select value={existingInstitutionId} onChange={(e) => setExistingInstitutionId(e.target.value)} required>
              <option value="">Select institution</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>ORGANISATION NAME</label>
                <input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required={institutionMode === 'new'} />
              </div>
              <div className="form-group">
                <label>COUNTRY</label>
                <input value={organisationCountry} onChange={(e) => setOrganisationCountry(e.target.value)} required={institutionMode === 'new'} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>COUNTY</label>
                <input value={organisationCounty} onChange={(e) => setOrganisationCounty(e.target.value)} required={institutionMode === 'new'} />
              </div>
              <div className="form-group">
                <label>CONSTITUENCY</label>
                <input value={organisationConstituency} onChange={(e) => setOrganisationConstituency(e.target.value)} required={institutionMode === 'new'} />
              </div>
            </div>
            <div className="form-group">
              <label>ORGANISATION DESCRIPTION</label>
              <textarea rows={3} value={organisationDescription} onChange={(e) => setOrganisationDescription(e.target.value)} />
            </div>
          </>
        )}

        <h2 style={{ marginTop: '22px' }}>3. Host Supervisor Details</h2>
        <div className="form-row">
          <div className="form-group">
            <label>NAME</label>
            <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>DESIGNATION</label>
            <input value={supervisorDesignation} onChange={(e) => setSupervisorDesignation(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>EMAIL</label>
            <input type="email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>PHONE NUMBER</label>
            <input
              value={supervisorPhone}
              onChange={(e) => setSupervisorPhone(e.target.value)}
              pattern="07[0-9]{8}"
              title="Phone number must be in format 07XXXXXXXX"
              placeholder="0712345678"
              required
            />
          </div>
        </div>

        <h2 style={{ marginTop: '22px' }}>4. Attachment Description</h2>
        <div className="form-group">
          <label>KEY ACTIVITIES (4-5, ONE PER LINE)</label>
          <textarea rows={5} value={keyActivities} onChange={(e) => setKeyActivities(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>SKILLS TO DEVELOP (AT LEAST 4, ONE PER LINE)</label>
          <textarea rows={4} value={skillsToDevelop} onChange={(e) => setSkillsToDevelop(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>TRAINING OPPORTUNITIES (AT LEAST 2, ONE PER LINE)</label>
          <textarea rows={3} value={trainingOpportunities} onChange={(e) => setTrainingOpportunities(e.target.value)} required />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button type="submit" className="btn-primary" disabled={submitting || Boolean(activePending)}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>My Applications</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>COURSE</th>
              <th>TYPE</th>
              <th>PERIOD</th>
              <th>STATUS</th>
              <th>ADMIN NOTES</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>{app.course}</td>
                <td>{app.attachment_type}</td>
                <td>{new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${app.status === 'approved' ? 'badge-approved' : app.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                    {app.status}
                  </span>
                </td>
                <td>{app.admin_notes || '—'}</td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">No applications submitted yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StudentLayout>
  );
};

export default StudentApplicationForm;
