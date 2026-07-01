const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// GET /api/admin/overview — dashboard stats
const getOverview = async (req, res) => {
  try {
    const totalHours = await pool.query(
      `SELECT COALESCE(SUM(hours_logged), 0) AS total FROM logbook_entries WHERE status = 'approved'`,
    );

    const syncStats = await pool.query(
      `SELECT 
                COUNT(*) FILTER (WHERE sync_status = 'synced') AS synced,
                COUNT(*) AS total
             FROM logbook_entries`,
    );

    const activeSupervisors = await pool.query(
      `SELECT COUNT(*) AS count FROM host_supervisors`,
    );

    const institutionCount = await pool.query(
      `SELECT COUNT(*) AS count FROM institutions`,
    );

    const synced = parseInt(syncStats.rows[0].synced);
    const total = parseInt(syncStats.rows[0].total);
    const syncRate = total > 0 ? ((synced / total) * 100).toFixed(2) : "100.00";

    res.status(200).json({
      total_hours_logged: parseFloat(totalHours.rows[0].total),
      sync_success_rate: syncRate,
      active_supervisors: parseInt(activeSupervisors.rows[0].count),
      total_institutions: parseInt(institutionCount.rows[0].count),
    });
  } catch (err) {
    console.error("Get overview error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/admin/institutions
const getInstitutions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, 
                COUNT(DISTINCT s.id) AS assigned_students
             FROM institutions i
             LEFT JOIN students s ON s.institution_id = i.id
             GROUP BY i.id
             ORDER BY i.registered_at DESC`,
    );

    res.status(200).json({ institutions: result.rows });
  } catch (err) {
    console.error("Get institutions error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// POST /api/admin/institutions — register a new institution
const createInstitution = async (req, res) => {
  const { name, address, contact_person, contact_email } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO institutions (name, address, contact_person, contact_email)
             VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, address, contact_person, contact_email],
    );

    res.status(201).json({
      message: "Institution registered successfully.",
      institution: result.rows[0],
    });
  } catch (err) {
    console.error("Create institution error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// POST /api/admin/users — onboard a new user (any role)
const createUser = async (req, res) => {
  const { email, password, role, full_name, reg_number, programme } = req.body;

  if (role === "student" && !reg_number) {
    return res
      .status(400)
      .json({ message: "Registration number is required for students." });
  }
  if (role === "student" && !["WBL", "SBL"].includes(programme)) {
    return res.status(400).json({ message: "Programme must be WBL or SBL." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Email already registered." });
    }

    if (role === "student") {
      const existingReg = await client.query(
        "SELECT id FROM students WHERE reg_number = $1",
        [reg_number],
      );
      if (existingReg.rows.length > 0) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ message: "Registration number already in use." });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name`,
      [email, password_hash, role, full_name],
    );

    const user = userResult.rows[0];
    let student = null;

    if (role === "student") {
      const studentResult = await client.query(
        `INSERT INTO students (user_id, reg_number, programme)
         VALUES ($1, $2, $3) RETURNING reg_number, programme`,
        [user.id, reg_number, programme],
      );
      student = studentResult.rows[0];
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "User created successfully.",
      user: { ...user, ...(student || {}) },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create user error:", err);
    res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
};
// GET /api/admin/audit-trails — recent activity feed
const getAuditTrails = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT at.*, u.full_name, u.email
             FROM audit_trails at
             JOIN users u ON at.actor_id = u.id
             ORDER BY at.performed_at DESC
             LIMIT 20`,
    );

    res.status(200).json({ audit_trails: result.rows });
  } catch (err) {
    console.error("Get audit trails error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
// GET /api/admin/users — list all users with role-specific info
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
                    s.reg_number, 
                    hs.job_title AS host_job_title,
                    fs.department AS faculty_department
             FROM users u
             LEFT JOIN students s ON s.user_id = u.id
             LEFT JOIN host_supervisors hs ON hs.user_id = u.id
             LEFT JOIN faculty_supervisors fs ON fs.user_id = u.id
             ORDER BY u.created_at DESC`,
    );

    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/admin/final-grade/:studentId — full grade breakdown for a student
const getFinalGrade = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Host score (out of 20) — from assessment_forms with form_type = 'host_score'
    const hostScore = await pool.query(
      `SELECT host_marks FROM assessment_forms WHERE student_id = $1 AND form_type = 'host_score'`,
      [studentId],
    );

    // Faculty assessment score (out of 30) — from assessment_forms with form_type = 'mid_term'
    const facultyScore = await pool.query(
      `SELECT faculty_marks FROM assessment_forms WHERE student_id = $1 AND form_type = 'mid_term'`,
      [studentId],
    );

    // Composite report score (out of 50)
    const reportScore = await pool.query(
      `SELECT marks FROM composite_reports WHERE student_id = $1 AND status = 'graded'`,
      [studentId],
    );

    const student = await pool.query(
      `SELECT reg_number, programme FROM students WHERE id = $1`,
      [studentId],
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

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

    res.status(200).json({
      student: student.rows[0],
      breakdown: {
        host_score: host,
        faculty_score: faculty,
        report_score: report,
        total_grade: total,
        is_complete: isComplete,
      },
    });
  } catch (err) {
    console.error("Get final grade error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
const { parse } = require("csv-parse/sync");
const fs = require("fs");

// POST /api/admin/users/bulk — bulk create users from CSV
const bulkCreateUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded." });
  }

  const allowedRoles = ["student", "host_supervisor", "faculty_supervisor", "admin"];
  const normalizeProgramme = (value) => (value || "").trim().toUpperCase();

  let fileContent = "";
  const results = { created: [], failed: [] };
  const client = await pool.connect();

  try {
    fileContent = fs.readFileSync(req.file.path, "utf8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for (const record of records) {
      const full_name = record.full_name?.trim() || null;
      const email = record.email?.trim().toLowerCase();
      const password = record.password;
      const role = record.role?.trim();
      const reg_number = record.reg_number?.trim();
      const programme = normalizeProgramme(record.programme);

      if (!email || !password || !role) {
        results.failed.push({
          email: email || "unknown",
          reason: "Missing required fields",
        });
        continue;
      }

      if (!allowedRoles.includes(role)) {
        results.failed.push({
          email,
          reason: `Invalid role '${role}'.`,
        });
        continue;
      }

      if (role === "student") {
        if (!reg_number) {
          results.failed.push({
            email,
            reason: "Missing registration number for student.",
          });
          continue;
        }

        if (!["WBL", "SBL"].includes(programme)) {
          results.failed.push({
            email,
            reason: "Programme must be WBL or SBL for student.",
          });
          continue;
        }
      }

      try {
        await client.query("BEGIN");

        const existing = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [email],
        );
        if (existing.rows.length > 0) {
          await client.query("ROLLBACK");
          results.failed.push({ email, reason: "Email already registered" });
          continue;
        }

        if (role === "student") {
          const existingReg = await client.query(
            "SELECT id FROM students WHERE reg_number = $1",
            [reg_number],
          );
          if (existingReg.rows.length > 0) {
            await client.query("ROLLBACK");
            results.failed.push({ email, reason: "Registration number already in use" });
            continue;
          }
        }

        const password_hash = await bcrypt.hash(password, 10);
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, role, full_name)
                     VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name`,
          [email, password_hash, role, full_name || null],
        );

        const createdUser = userResult.rows[0];

        if (role === "student") {
          const studentResult = await client.query(
            `INSERT INTO students (user_id, reg_number, programme)
             VALUES ($1, $2, $3)
             RETURNING reg_number, programme`,
            [createdUser.id, reg_number, programme],
          );

          await client.query("COMMIT");
          results.created.push({
            ...createdUser,
            ...studentResult.rows[0],
          });
          continue;
        }

        await client.query("COMMIT");
        results.created.push(createdUser);
      } catch (err) {
        await client.query("ROLLBACK");
        results.failed.push({ email, reason: "Database error" });
      }
    }

    res.status(201).json({
      message: `Bulk upload complete. ${results.created.length} created, ${results.failed.length} failed.`,
      created: results.created,
      failed: results.failed,
    });
  } catch (err) {
    console.error("Bulk create users error:", err);
    res.status(500).json({ message: "Failed to parse CSV file." });
  } finally {
    client.release();
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// GET /api/admin/assignment-options — fetch host/faculty supervisor options
const getAssignmentOptions = async (req, res) => {
  try {
    const hosts = await pool.query(
      `SELECT hs.id, u.full_name, u.email, i.name AS institution_name
       FROM host_supervisors hs
       JOIN users u ON hs.user_id = u.id
       LEFT JOIN institutions i ON hs.institution_id = i.id
       ORDER BY u.full_name ASC`,
    );

    const faculty = await pool.query(
      `SELECT fs.id, u.full_name, u.email, fs.department
       FROM faculty_supervisors fs
       JOIN users u ON fs.user_id = u.id
       ORDER BY u.full_name ASC`,
    );

    res.status(200).json({
      host_supervisors: hosts.rows,
      faculty_supervisors: faculty.rows,
    });
  } catch (err) {
    console.error("Get assignment options error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/admin/assignments — list students and their current supervisor assignments
const getAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          s.id,
          s.reg_number,
          s.programme,
          su.full_name AS student_name,
          s.host_supervisor_id,
          hu.full_name AS host_supervisor_name,
          s.faculty_supervisor_id,
          fu.full_name AS faculty_supervisor_name
       FROM students s
       JOIN users su ON s.user_id = su.id
       LEFT JOIN host_supervisors hs ON s.host_supervisor_id = hs.id
       LEFT JOIN users hu ON hs.user_id = hu.id
       LEFT JOIN faculty_supervisors fs ON s.faculty_supervisor_id = fs.id
       LEFT JOIN users fu ON fs.user_id = fu.id
       ORDER BY s.reg_number ASC`,
    );

    res.status(200).json({ assignments: result.rows });
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/admin/assignments/:studentId — assign/reassign student supervisors
const updateAssignment = async (req, res) => {
  const { studentId } = req.params;
  const { host_supervisor_id, faculty_supervisor_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const student = await client.query(
      `SELECT id FROM students WHERE id = $1`,
      [studentId],
    );

    if (student.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Student not found." });
    }

    if (host_supervisor_id) {
      const host = await client.query(
        `SELECT id FROM host_supervisors WHERE id = $1`,
        [host_supervisor_id],
      );
      if (host.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Invalid host supervisor selected." });
      }
    }

    if (faculty_supervisor_id) {
      const faculty = await client.query(
        `SELECT id FROM faculty_supervisors WHERE id = $1`,
        [faculty_supervisor_id],
      );
      if (faculty.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Invalid faculty supervisor selected." });
      }
    }

    const result = await client.query(
      `UPDATE students
       SET host_supervisor_id = $1,
           faculty_supervisor_id = $2
       WHERE id = $3
       RETURNING id, reg_number, programme, host_supervisor_id, faculty_supervisor_id`,
      [host_supervisor_id || null, faculty_supervisor_id || null, studentId],
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "Student assignments updated successfully.",
      assignment: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update assignment error:", err);
    res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
};

module.exports = {
  getOverview,
  getInstitutions,
  createInstitution,
  createUser,
  getAuditTrails,
  getUsers,
  getFinalGrade,
  bulkCreateUsers,
  getAssignmentOptions,
  getAssignments,
  updateAssignment,
};
