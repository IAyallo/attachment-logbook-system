const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { createNotification } = require('../utils/notifications');

const phoneRegex = /^07\d{8}$/;

const normalizeList = (value, minItems = 0) => {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

  if (list.length < minItems) return null;
  return list;
};

const getApprovedInstitutions = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, address, contact_person, contact_email, contact_phone
       FROM institutions
       ORDER BY name ASC`,
    );

    res.status(200).json({ institutions: result.rows });
  } catch (err) {
    console.error('Get approved institutions error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id],
    );

    if (student.rows.length === 0) {
      return res.status(403).json({ message: 'Only students can view applications.' });
    }

    const result = await pool.query(
      `SELECT aa.*, i.name AS approved_institution_name
       FROM attachment_applications aa
       LEFT JOIN institutions i ON aa.approved_institution_id = i.id
       WHERE aa.student_id = $1
       ORDER BY aa.created_at DESC`,
      [student.rows[0].id],
    );

    res.status(200).json({ applications: result.rows });
  } catch (err) {
    console.error('Get my applications error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getMyCurrentAttachment = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id],
    );

    if (student.rows.length === 0) {
      return res.status(403).json({ message: 'Only students can view current attachment details.' });
    }

    const current = await pool.query(
      `SELECT
          s.id AS student_id,
          s.reg_number,
          s.programme,
          s.attachment_start,
          s.attachment_end,
          i.id AS institution_id,
          i.name AS institution_name,
          i.address AS institution_address,
          i.contact_person AS institution_contact_person,
          i.contact_email AS institution_contact_email,
          i.contact_phone AS institution_contact_phone,
          hs.id AS host_supervisor_id,
          hu.full_name AS host_supervisor_name,
          hu.email AS host_supervisor_email,
          hu.phone_number AS host_supervisor_phone,
          hs.job_title AS host_supervisor_designation,
          fs.id AS faculty_supervisor_id,
          fu.full_name AS faculty_supervisor_name,
          fu.email AS faculty_supervisor_email,
          fu.phone_number AS faculty_supervisor_phone,
          fs.department AS faculty_department
       FROM students s
       LEFT JOIN institutions i ON s.institution_id = i.id
       LEFT JOIN host_supervisors hs ON s.host_supervisor_id = hs.id
       LEFT JOIN users hu ON hs.user_id = hu.id
       LEFT JOIN faculty_supervisors fs ON s.faculty_supervisor_id = fs.id
       LEFT JOIN users fu ON fs.user_id = fu.id
       WHERE s.id = $1`,
      [student.rows[0].id],
    );

    if (current.rows.length === 0) {
      return res.status(200).json({ current_attachment: null });
    }

    const latestApproved = await pool.query(
      `SELECT
          id,
          course,
          attachment_type,
          attachment_period,
          start_date,
          end_date,
          hours_per_day,
          days_per_week,
          institution_mode,
          organisation_name,
          organisation_description,
          organisation_country,
          organisation_county,
          organisation_constituency,
          supervisor_name,
          supervisor_designation,
          supervisor_email,
          supervisor_phone,
          reviewed_at
       FROM attachment_applications
       WHERE student_id = $1 AND status = 'approved'
       ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [student.rows[0].id],
    );

    res.status(200).json({
      current_attachment: {
        ...current.rows[0],
        latest_approved_application: latestApproved.rows[0] || null,
      },
    });
  } catch (err) {
    console.error('Get current attachment error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getMyPreviousAttachments = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id],
    );

    if (student.rows.length === 0) {
      return res.status(403).json({ message: 'Only students can view previous attachments.' });
    }

    const result = await pool.query(
      `SELECT sah.*,
              COALESCE(sah.organisation_name, i.name) AS institution_name,
              sah.host_supervisor_name,
              sah.faculty_supervisor_name
       FROM student_attachment_history sah
       LEFT JOIN institutions i ON sah.institution_id = i.id
       WHERE sah.student_id = $1
       ORDER BY sah.created_at DESC`,
      [student.rows[0].id],
    );

    res.status(200).json({ history: result.rows });
  } catch (err) {
    console.error('Get previous attachments error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const submitApplication = async (req, res) => {
  const {
    course,
    attachment_type,
    attachment_period,
    start_date,
    end_date,
    hours_per_day,
    days_per_week,
    institution_mode,
    existing_institution_id,
    organisation_name,
    organisation_description,
    organisation_country,
    organisation_county,
    organisation_constituency,
    supervisor_name,
    supervisor_designation,
    supervisor_email,
    supervisor_phone,
    key_activities,
    skills_to_develop,
    training_opportunities,
  } = req.body;

  try {
    const student = await pool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id],
    );

    if (student.rows.length === 0) {
      return res.status(403).json({ message: 'Only students can submit applications.' });
    }

    if (!['existing', 'new'].includes(institution_mode)) {
      return res.status(400).json({ message: 'Institution mode must be existing or new.' });
    }

    if (institution_mode === 'existing' && !existing_institution_id) {
      return res.status(400).json({ message: 'Select an existing institution.' });
    }

    if (institution_mode === 'new' && (!organisation_name || !organisation_country)) {
      return res.status(400).json({ message: 'Provide organisation name and country for new institution.' });
    }

    if (institution_mode === 'new' && (!organisation_county || !organisation_constituency)) {
      return res.status(400).json({ message: 'Provide county and constituency for new institution.' });
    }

    if (!supervisor_name || !supervisor_designation || !supervisor_email || !supervisor_phone) {
      return res.status(400).json({ message: 'All host supervisor details are required.' });
    }

    if (!phoneRegex.test(supervisor_phone)) {
      return res.status(400).json({ message: 'Supervisor phone must be in format 07XXXXXXXX.' });
    }

    const activities = normalizeList(key_activities, 4);
    const skills = normalizeList(skills_to_develop, 4);
    const trainings = normalizeList(training_opportunities, 2);

    if (!activities || !skills || !trainings) {
      return res.status(400).json({
        message:
          'Provide at least 4 key activities, 4 skills to develop, and 2 training opportunities.',
      });
    }

    if (institution_mode === 'existing') {
      const institution = await pool.query(
        'SELECT id FROM institutions WHERE id = $1',
        [existing_institution_id],
      );
      if (institution.rows.length === 0) {
        return res.status(400).json({ message: 'Selected institution does not exist.' });
      }
    }

    const pending = await pool.query(
      `SELECT id FROM attachment_applications
       WHERE student_id = $1 AND status = 'pending'
       LIMIT 1`,
      [student.rows[0].id],
    );

    if (pending.rows.length > 0) {
      return res.status(409).json({ message: 'You already have a pending application.' });
    }

    const result = await pool.query(
      `INSERT INTO attachment_applications (
          student_id,
          course,
          attachment_type,
          attachment_period,
          start_date,
          end_date,
          hours_per_day,
          days_per_week,
          institution_mode,
          existing_institution_id,
          organisation_name,
          organisation_description,
          organisation_country,
          organisation_county,
          organisation_constituency,
          supervisor_name,
          supervisor_designation,
          supervisor_email,
          supervisor_phone,
          key_activities,
          skills_to_develop,
          training_opportunities,
          status
       ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21::jsonb,$22::jsonb,'pending'
       )
       RETURNING *`,
      [
        student.rows[0].id,
        course,
        attachment_type,
        attachment_period,
        start_date,
        end_date,
        hours_per_day,
        JSON.stringify(days_per_week || []),
        institution_mode,
        institution_mode === 'existing' ? existing_institution_id : null,
        institution_mode === 'new' ? organisation_name : null,
        institution_mode === 'new' ? organisation_description || null : null,
        institution_mode === 'new' ? organisation_country : null,
        institution_mode === 'new' ? organisation_county : null,
        institution_mode === 'new' ? organisation_constituency : null,
        supervisor_name,
        supervisor_designation,
        supervisor_email,
        supervisor_phone,
        JSON.stringify(activities),
        JSON.stringify(skills),
        JSON.stringify(trainings),
      ],
    );

    res.status(201).json({
      message: 'Application submitted and awaiting approval.',
      application: result.rows[0],
    });
  } catch (err) {
    console.error('Submit application error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const getPendingApplications = async (req, res) => {
  const status = req.query.status || 'pending';

  try {
    const result = await pool.query(
      `SELECT aa.*, s.reg_number, s.programme, u.full_name AS student_name, u.email AS student_email,
              i.name AS existing_institution_name, ai.name AS approved_institution_name
       FROM attachment_applications aa
       JOIN students s ON aa.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN institutions i ON aa.existing_institution_id = i.id
       LEFT JOIN institutions ai ON aa.approved_institution_id = ai.id
       WHERE ($1::text = 'all' OR aa.status = $1::text)
       ORDER BY aa.created_at ASC`,
      [status],
    );

    res.status(200).json({ applications: result.rows });
  } catch (err) {
    console.error('Get pending applications error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const reviewApplication = async (req, res) => {
  const { id } = req.params;
  const { decision, admin_notes, temp_password } = req.body;
  const reviewerId = req.user.id;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const appRes = await client.query(
      `SELECT aa.*, s.user_id AS student_user_id, s.id AS student_id
       FROM attachment_applications aa
       JOIN students s ON aa.student_id = s.id
       WHERE aa.id = $1
       FOR UPDATE`,
      [id],
    );

    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Application not found.' });
    }

    const app = appRes.rows[0];

    if (app.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Application has already been reviewed.' });
    }

    let approvedInstitutionId = null;
    let onboardedHostSupervisorId = null;
    let tempPasswordUsed = null;

    if (decision === 'approved') {
      const currentStudent = await client.query(
        `SELECT institution_id, host_supervisor_id, faculty_supervisor_id, attachment_start, attachment_end
         FROM students
         WHERE id = $1
         FOR UPDATE`,
        [app.student_id],
      );

      const activeAttachment = currentStudent.rows[0];

      if (app.institution_mode === 'existing') {
        approvedInstitutionId = app.existing_institution_id;
      } else {
        const existingInstitution = await client.query(
          'SELECT id FROM institutions WHERE LOWER(name) = LOWER($1)',
          [app.organisation_name],
        );

        if (existingInstitution.rows.length > 0) {
          approvedInstitutionId = existingInstitution.rows[0].id;
        } else {
          const createdInstitution = await client.query(
            `INSERT INTO institutions (name, address, contact_person, contact_email, contact_phone)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              app.organisation_name,
              app.organisation_description || null,
              app.supervisor_name,
              app.supervisor_email,
              app.supervisor_phone,
            ],
          );
          approvedInstitutionId = createdInstitution.rows[0].id;
        }
      }

      const existingUser = await client.query(
        'SELECT id, role FROM users WHERE email = $1',
        [app.supervisor_email],
      );

      let hostUserId = null;

      if (existingUser.rows.length > 0) {
        if (existingUser.rows[0].role !== 'host_supervisor') {
          await client.query('ROLLBACK');
          return res.status(409).json({
            message: 'Supervisor email already belongs to a non-host account. Use another email.',
          });
        }
        hostUserId = existingUser.rows[0].id;
      } else {
        tempPasswordUsed = temp_password || 'Passw0rd!';
        const passwordHash = await bcrypt.hash(tempPasswordUsed, 10);

        const createdUser = await client.query(
          `INSERT INTO users (email, password_hash, role, full_name, phone_number)
           VALUES ($1, $2, 'host_supervisor', $3, $4)
           RETURNING id`,
          [app.supervisor_email, passwordHash, app.supervisor_name, app.supervisor_phone],
        );

        hostUserId = createdUser.rows[0].id;
      }

      const hostSupervisor = await client.query(
        `SELECT id FROM host_supervisors WHERE user_id = $1`,
        [hostUserId],
      );

      if (hostSupervisor.rows.length > 0) {
        onboardedHostSupervisorId = hostSupervisor.rows[0].id;

        await client.query(
          `UPDATE host_supervisors
           SET institution_id = $1,
               job_title = $2
           WHERE id = $3`,
          [approvedInstitutionId, app.supervisor_designation, onboardedHostSupervisorId],
        );
      } else {
        const createdHost = await client.query(
          `INSERT INTO host_supervisors (user_id, institution_id, department, job_title)
           VALUES ($1, $2, NULL, $3)
           RETURNING id`,
          [hostUserId, approvedInstitutionId, app.supervisor_designation],
        );

        onboardedHostSupervisorId = createdHost.rows[0].id;
      }

      const hasExistingAttachment = Boolean(activeAttachment?.institution_id);
      const attachmentStillActive =
        hasExistingAttachment &&
        (!activeAttachment.attachment_end || new Date(activeAttachment.attachment_end) >= new Date());

      const previousApprovedApplication = await client.query(
        `SELECT *
         FROM attachment_applications
         WHERE student_id = $1
           AND status = 'approved'
           AND id <> $2
         ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [app.student_id, app.id],
      );

      let hostProfile = null;
      if (activeAttachment?.host_supervisor_id) {
        const host = await client.query(
          `SELECT u.full_name, hs.job_title, u.email, u.phone_number
           FROM host_supervisors hs
           JOIN users u ON hs.user_id = u.id
           WHERE hs.id = $1`,
          [activeAttachment.host_supervisor_id],
        );
        hostProfile = host.rows[0] || null;
      }

      let facultyProfile = null;
      if (activeAttachment?.faculty_supervisor_id) {
        const faculty = await client.query(
          `SELECT u.full_name, u.email
           FROM faculty_supervisors fs
           JOIN users u ON fs.user_id = u.id
           WHERE fs.id = $1`,
          [activeAttachment.faculty_supervisor_id],
        );
        facultyProfile = faculty.rows[0] || null;
      }

      const hostScoreRes = await client.query(
        `SELECT host_marks
         FROM assessment_forms
         WHERE student_id = $1 AND form_type = 'host_score'
         ORDER BY approved_at DESC NULLS LAST, submitted_at DESC
         LIMIT 1`,
        [app.student_id],
      );

      const facultyScoreRes = await client.query(
        `SELECT faculty_marks
         FROM assessment_forms
         WHERE student_id = $1 AND form_type = 'mid_term'
         ORDER BY approved_at DESC NULLS LAST, submitted_at DESC
         LIMIT 1`,
        [app.student_id],
      );

      const reportScoreRes = await client.query(
        `SELECT marks
         FROM composite_reports
         WHERE student_id = $1 AND status = 'graded'
         ORDER BY graded_at DESC NULLS LAST, submitted_at DESC
         LIMIT 1`,
        [app.student_id],
      );

      const hostScore = hostScoreRes.rows[0]?.host_marks ? parseFloat(hostScoreRes.rows[0].host_marks) : null;
      const facultyScore = facultyScoreRes.rows[0]?.faculty_marks ? parseFloat(facultyScoreRes.rows[0].faculty_marks) : null;
      const reportScore = reportScoreRes.rows[0]?.marks ? parseFloat(reportScoreRes.rows[0].marks) : null;
      const totalGrade = (hostScore || 0) + (facultyScore || 0) + (reportScore || 0);

      const previousApp = previousApprovedApplication.rows[0] || null;

      if (hasExistingAttachment) {
        await client.query(
          `INSERT INTO student_attachment_history (
              student_id,
              institution_id,
              host_supervisor_id,
              attachment_start,
              attachment_end,
              attachment_type,
              attachment_period,
              hours_per_day,
              days_per_week,
              organisation_name,
              organisation_description,
              organisation_country,
              organisation_county,
              organisation_constituency,
              internship_objectives,
              internship_skills,
              internship_training_opportunities,
              host_supervisor_name,
              host_supervisor_designation,
              host_supervisor_email,
              host_supervisor_phone,
              faculty_supervisor_name,
              faculty_supervisor_email,
              faculty_date_allocated,
              host_score,
              faculty_score,
              report_score,
              total_grade,
              status_message,
              status,
              halt_reason,
              replaced_by_application_id
           ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9::jsonb,
              $10, $11, $12, $13, $14,
              $15::jsonb, $16::jsonb, $17::jsonb,
              $18, $19, $20, $21,
              $22, $23, $24,
              $25, $26, $27, $28,
              $29,
              $30, $31, $32
           )`,
          [
            app.student_id,
            activeAttachment.institution_id,
            activeAttachment.host_supervisor_id,
            activeAttachment.attachment_start,
            activeAttachment.attachment_end,
            previousApp?.attachment_type || null,
            previousApp?.attachment_period || null,
            previousApp?.hours_per_day || null,
            JSON.stringify(previousApp?.days_per_week || []),
            previousApp?.organisation_name || null,
            previousApp?.organisation_description || null,
            previousApp?.organisation_country || null,
            previousApp?.organisation_county || null,
            previousApp?.organisation_constituency || null,
            JSON.stringify(previousApp?.key_activities || []),
            JSON.stringify(previousApp?.skills_to_develop || []),
            JSON.stringify(previousApp?.training_opportunities || []),
            hostProfile?.full_name || null,
            hostProfile?.job_title || null,
            hostProfile?.email || null,
            hostProfile?.phone_number || null,
            facultyProfile?.full_name || null,
            facultyProfile?.email || null,
            previousApp?.reviewed_at || null,
            hostScore,
            facultyScore,
            reportScore,
            totalGrade,
            attachmentStillActive
              ? 'Attachment halted because a new approved attachment replaced it.'
              : 'Attachment archived as completed before new attachment onboarding.',
            attachmentStillActive ? 'halted' : 'completed',
            attachmentStillActive
              ? 'Automatically halted because a new attachment application was approved.'
              : 'Recorded as completed before new attachment onboarding.',
            app.id,
          ],
        );
      }

      // Start a clean attachment cycle: clear prior records tied to the student.
      await client.query('DELETE FROM logbook_entries WHERE student_id = $1', [app.student_id]);
      await client.query('DELETE FROM assessment_forms WHERE student_id = $1', [app.student_id]);
      await client.query('DELETE FROM composite_reports WHERE student_id = $1', [app.student_id]);
      await client.query('DELETE FROM offline_sync_queue WHERE student_id = $1', [app.student_id]);
      await client.query('DELETE FROM notifications WHERE recipient_id = $1', [app.student_user_id]);

      await client.query(
        `UPDATE students
         SET institution_id = $1,
             host_supervisor_id = $2
             ,attachment_start = $3
             ,attachment_end = $4
         WHERE id = $5`,
        [
          approvedInstitutionId,
          onboardedHostSupervisorId,
          app.start_date,
          app.end_date,
          app.student_id,
        ],
      );
    }

    const reviewed = await client.query(
      `UPDATE attachment_applications
       SET status = $1,
           admin_notes = $2,
           reviewed_by = $3,
           reviewed_at = NOW(),
           approved_institution_id = $4,
           onboarded_host_supervisor_id = $5
       WHERE id = $6
       RETURNING *`,
      [
        decision,
        admin_notes || null,
        reviewerId,
        approvedInstitutionId,
        onboardedHostSupervisorId,
        id,
      ],
    );

    await client.query('COMMIT');

    await createNotification({
      recipientId: app.student_user_id,
      actorId: reviewerId,
      type: 'application_reviewed',
      title: decision === 'approved' ? 'Attachment Application Approved' : 'Attachment Application Rejected',
      message:
        decision === 'approved'
          ? 'Your attachment application has been approved. Your institution and host supervisor have been onboarded.'
          : `Your attachment application was rejected.${admin_notes ? ` Note: ${admin_notes}` : ''}`,
    });

    res.status(200).json({
      message: `Application ${decision} successfully.`,
      application: reviewed.rows[0],
      temp_password_used: tempPasswordUsed,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Review application error:', err);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getApprovedInstitutions,
  getMyApplications,
  getMyCurrentAttachment,
  getMyPreviousAttachments,
  submitApplication,
  getPendingApplications,
  reviewApplication,
};
