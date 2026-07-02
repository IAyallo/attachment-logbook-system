const pool = require("../config/db");
const { createNotification } = require("../utils/notifications");

const categoryByProgramme = {
  WBL: [
    "WBL Backend Development",
    "WBL Frontend Development",
    "WBL QA & Testing",
    "WBL Documentation & Reporting",
    "WBL Workplace Professionalism",
    "WBL Project Management",
  ],
  SBL: [
    "SBL Community Engagement",
    "SBL Service Delivery",
    "SBL Stakeholder Communication",
    "SBL Civic Reflection",
    "SBL Social Impact Analysis",
    "SBL Documentation & Reporting",
  ],
};

// POST /api/logs — student creates a log entry
const createLog = async (req, res) => {
  const { title, description, hours_logged, entry_date, category } = req.body;
  const student_id = req.user.id;

  try {
    // Verify the user is a student
    const student = await pool.query(
      "SELECT id, programme FROM students WHERE user_id = $1",
      [student_id],
    );
    if (student.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only students can create log entries." });
    }

    const programme = student.rows[0].programme;
    const allowedLogCategories = categoryByProgramme[programme] || [];
    const normalizedCategory = category || allowedLogCategories[0];

    if (!allowedLogCategories.includes(normalizedCategory)) {
      return res.status(400).json({
        message: `Invalid category for ${programme}.`,
      });
    }

    const result = await pool.query(
      `INSERT INTO logbook_entries 
                (student_id, title, description, category, hours_logged, entry_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'draft')
             RETURNING *`,
      [
        student.rows[0].id,
        title,
        description,
        normalizedCategory,
        hours_logged,
        entry_date,
      ],
    );

    res.status(201).json({
      message: "Log entry created successfully.",
      entry: result.rows[0],
    });
  } catch (err) {
    console.error("Create log error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/logs — student views their own log entries
const getLogs = async (req, res) => {
  const user_id = req.user.id;

  try {
    const student = await pool.query(
      "SELECT id FROM students WHERE user_id = $1",
      [user_id],
    );
    if (student.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only students can view log entries." });
    }

    const result = await pool.query(
      `SELECT * FROM logbook_entries 
             WHERE student_id = $1 
             ORDER BY entry_date DESC`,
      [student.rows[0].id],
    );

    res.status(200).json({
      message: "Log entries retrieved.",
      count: result.rows.length,
      entries: result.rows,
    });
  } catch (err) {
    console.error("Get logs error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/logs/:id/submit — student submits a draft entry
const submitLog = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const student = await pool.query(
      "SELECT id FROM students WHERE user_id = $1",
      [user_id],
    );
    if (student.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only students can submit log entries." });
    }

    const result = await pool.query(
      `UPDATE logbook_entries 
             SET status = 'submitted', submitted_at = NOW()
             WHERE id = $1 AND student_id = $2 AND status = 'draft'
             RETURNING *`,
      [id, student.rows[0].id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Entry not found or already submitted." });
    }

    res.status(200).json({
      message: "Log entry submitted successfully.",
      entry: result.rows[0],
    });
  } catch (err) {
    console.error("Submit log error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
// GET /api/logs/pending — host supervisor views logs awaiting approval
const getPendingLogs = async (req, res) => {
  const user_id = req.user.id;

  try {
    const supervisor = await pool.query(
      "SELECT id FROM host_supervisors WHERE user_id = $1",
      [user_id],
    );
    if (supervisor.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only host supervisors can view pending logs." });
    }

    const result = await pool.query(
      `SELECT le.*, s.reg_number 
             FROM logbook_entries le
             JOIN students s ON le.student_id = s.id
             WHERE s.host_supervisor_id = $1
               AND le.status = 'submitted'
               AND (s.attachment_start IS NULL OR le.entry_date >= s.attachment_start)
               AND (s.attachment_end IS NULL OR le.entry_date <= s.attachment_end)
             ORDER BY le.submitted_at ASC`,
      [supervisor.rows[0].id],
    );

    res.status(200).json({
      message: "Pending log entries retrieved.",
      count: result.rows.length,
      entries: result.rows,
    });
  } catch (err) {
    console.error("Get pending logs error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/logs/:id/review — host supervisor approves or rejects a log
const reviewLog = async (req, res) => {
  const { id } = req.params;
  const { decision, feedback, marks } = req.body; // decision: 'approved' | 'rejected'
  const user_id = req.user.id;

  if (!["approved", "rejected"].includes(decision)) {
    return res
      .status(400)
      .json({ message: "Decision must be 'approved' or 'rejected'." });
  }

  try {
    const supervisor = await pool.query(
      "SELECT id FROM host_supervisors WHERE user_id = $1",
      [user_id],
    );
    if (supervisor.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only host supervisors can review logs." });
    }

    const result = await pool.query(
      `UPDATE logbook_entries le
             SET status = $1, feedback = $2, marks = $3, approved_by = $4, approved_at = NOW()
             FROM students s
             WHERE le.id = $5 
               AND le.student_id = s.id 
               AND s.host_supervisor_id = $4
               AND (s.attachment_start IS NULL OR le.entry_date >= s.attachment_start)
               AND (s.attachment_end IS NULL OR le.entry_date <= s.attachment_end)
               AND le.status = 'submitted'
             RETURNING le.*`,
      [decision, feedback || null, marks || null, supervisor.rows[0].id, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Entry not found or already reviewed." });
    }

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_trails (entry_id, actor_id, action, change_detail)
             VALUES ($1, $2, $3, $4)`,
      [id, user_id, decision, feedback || "No feedback provided"],
    );

    res.status(200).json({
      message: `Log entry ${decision} successfully.`,
      entry: result.rows[0],
    });

    const recipient = await pool.query(
      `SELECT u.id AS user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [result.rows[0].student_id],
    );

    if (recipient.rows.length > 0) {
      await createNotification({
        recipientId: recipient.rows[0].user_id,
        actorId: user_id,
        type: "log_review",
        title: decision === "approved" ? "Log Entry Approved" : "Log Entry Rejected",
        message:
          decision === "approved"
            ? `Your daily log \"${result.rows[0].title}\" was approved by your host supervisor.`
            : `Your daily log \"${result.rows[0].title}\" was rejected. Review feedback and resubmit.`,
      });
    }
  } catch (err) {
    console.error("Review log error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
// GET /api/logs/host-score/:studentId — calculate auto-average host score for a student
const getHostScore = async (req, res) => {
  const { studentId } = req.params;
  const user_id = req.user.id;

  try {
    const supervisor = await pool.query(
      "SELECT id FROM host_supervisors WHERE user_id = $1",
      [user_id],
    );
    if (supervisor.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only host supervisors can view this." });
    }

    // Confirm student belongs to this supervisor
    const studentCheck = await pool.query(
      `SELECT id, attachment_start, attachment_end
       FROM students
       WHERE id = $1 AND host_supervisor_id = $2`,
      [studentId, supervisor.rows[0].id],
    );
    if (studentCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "This student is not assigned to you." });
    }

    const attachmentStart = studentCheck.rows[0].attachment_start;
    const attachmentEnd = studentCheck.rows[0].attachment_end;

    // Average of all approved log marks (already stored as out-of-20 values)
    const avgResult = await pool.query(
      `SELECT 
                COALESCE(ROUND(AVG(marks), 2), 0) AS average_score,
                COUNT(*) AS graded_logs_count
             FROM logbook_entries
             WHERE student_id = $1
               AND status = 'approved'
               AND marks IS NOT NULL
               AND ($2::date IS NULL OR entry_date >= $2::date)
               AND ($3::date IS NULL OR entry_date <= $3::date)`,
      [studentId, attachmentStart, attachmentEnd],
    );

    // Check if supervisor already overrode this score
    const override = await pool.query(
      `SELECT host_marks, host_comments FROM assessment_forms 
             WHERE student_id = $1 AND form_type = 'host_score'`,
      [studentId],
    );

    res.status(200).json({
      calculated_average: parseFloat(avgResult.rows[0].average_score),
      graded_logs_count: parseInt(avgResult.rows[0].graded_logs_count),
      override: override.rows.length > 0 ? override.rows[0] : null,
    });
  } catch (err) {
    console.error("Get host score error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// POST /api/logs/host-score/:studentId — host supervisor overrides the final host score
const setHostScoreOverride = async (req, res) => {
  const { studentId } = req.params;
  const { host_marks, host_comments } = req.body;
  const user_id = req.user.id;

  if (host_marks < 0 || host_marks > 20) {
    return res
      .status(400)
      .json({ message: "Host marks must be between 0 and 20." });
  }

  try {
    const supervisor = await pool.query(
      "SELECT id FROM host_supervisors WHERE user_id = $1",
      [user_id],
    );
    if (supervisor.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only host supervisors can set this." });
    }

    const result = await pool.query(
      `INSERT INTO assessment_forms (student_id, host_supervisor_id, form_type, host_marks, host_comments, status, approved_at)
             VALUES ($1, $2, 'host_score', $3, $4, 'approved', NOW())
             ON CONFLICT (student_id, form_type)
             DO UPDATE SET
                host_marks = EXCLUDED.host_marks,
                host_comments = EXCLUDED.host_comments,
                host_supervisor_id = EXCLUDED.host_supervisor_id,
                status = 'approved',
                approved_at = NOW()
             RETURNING *`,
      [studentId, supervisor.rows[0].id, host_marks, host_comments],
    );

    res.status(200).json({
      message: "Host score finalized successfully.",
      assessment: result.rows[0],
    });

    const recipient = await pool.query(
      `SELECT u.id AS user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [studentId],
    );

    if (recipient.rows.length > 0) {
      await createNotification({
        recipientId: recipient.rows[0].user_id,
        actorId: user_id,
        type: "host_assessment",
        title: "Host Assessment Submitted",
        message: `Your host supervisor submitted your final host score (${host_marks}/20).`,
      });
    }
  } catch (err) {
    console.error("Set host score error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/logs/my-students — host supervisor views their assigned students
const getMyHostStudents = async (req, res) => {
  const user_id = req.user.id;

  try {
    const supervisor = await pool.query(
      "SELECT id FROM host_supervisors WHERE user_id = $1",
      [user_id],
    );
    if (supervisor.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Only host supervisors can view this." });
    }

    const result = await pool.query(
      `SELECT s.id, s.reg_number, s.programme,
                    u.phone_number,
                    COUNT(le.id) FILTER (WHERE le.status = 'approved') AS approved_logs,
                    COUNT(le.id) FILTER (WHERE le.status = 'submitted') AS pending_logs,
                    COALESCE(
                      ROUND(AVG(le.marks) FILTER (WHERE le.status = 'approved' AND le.marks IS NOT NULL), 2),
                      0
                    ) AS average_log_score,
                    COUNT(le.id) FILTER (WHERE le.status = 'approved' AND le.marks IS NOT NULL) AS graded_logs_count,
                    af.host_marks AS finalized_host_marks
             FROM students s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN logbook_entries le
               ON le.student_id = s.id
              AND (s.attachment_start IS NULL OR le.entry_date >= s.attachment_start)
              AND (s.attachment_end IS NULL OR le.entry_date <= s.attachment_end)
             LEFT JOIN assessment_forms af
               ON af.student_id = s.id
              AND af.form_type = 'host_score'
             WHERE s.host_supervisor_id = $1
             GROUP BY s.id, u.phone_number, af.host_marks
             ORDER BY s.reg_number ASC`,
      [supervisor.rows[0].id],
    );

    res.status(200).json({ students: result.rows });
  } catch (err) {
    console.error("Get my host students error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
// GET /api/logs/my-grade — student views their own final grade breakdown
const getMyGrade = async (req, res) => {
  const user_id = req.user.id;

  try {
    const student = await pool.query(
      "SELECT id, reg_number, programme FROM students WHERE user_id = $1",
      [user_id],
    );
    if (student.rows.length === 0) {
      return res.status(403).json({ message: "Only students can view this." });
    }

    const studentId = student.rows[0].id;

    const hostScore = await pool.query(
      `SELECT host_marks, host_comments
       FROM assessment_forms
       WHERE student_id = $1 AND form_type = 'host_score'`,
      [studentId],
    );
    const facultyScore = await pool.query(
      `SELECT faculty_marks, faculty_comments
       FROM assessment_forms
       WHERE student_id = $1 AND form_type = 'mid_term'`,
      [studentId],
    );
    const reportScore = await pool.query(
      `SELECT marks, faculty_comments
       FROM composite_reports
       WHERE student_id = $1 AND status = 'graded'`,
      [studentId],
    );

    const host = hostScore.rows[0]?.host_marks
      ? parseFloat(hostScore.rows[0].host_marks)
      : null;
    const faculty = facultyScore.rows[0]?.faculty_marks
      ? parseFloat(facultyScore.rows[0].faculty_marks)
      : null;
    const report = reportScore.rows[0]?.marks
      ? parseFloat(reportScore.rows[0].marks)
      : null;

    const total = (host || 0) + (faculty || 0) + (report || 0);
    const isComplete = host !== null && faculty !== null && report !== null;
    const hostReview = isComplete ? hostScore.rows[0]?.host_comments || null : null;
    const facultyReview = isComplete ? facultyScore.rows[0]?.faculty_comments || null : null;
    const reportReview = isComplete ? reportScore.rows[0]?.faculty_comments || null : null;

    res.status(200).json({
      student: {
        reg_number: student.rows[0].reg_number,
        programme: student.rows[0].programme,
      },
      breakdown: {
        host_score: host,
        faculty_score: faculty,
        report_score: report,
        total_grade: total,
        is_complete: isComplete,
        host_review: hostReview,
        faculty_review: facultyReview,
        report_review: reportReview,
      },
    });
  } catch (err) {
    console.error("Get my grade error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  createLog,
  getLogs,
  submitLog,
  getPendingLogs,
  reviewLog,
  getHostScore,
  setHostScoreOverride,
  getMyHostStudents,
  getMyGrade,
};
