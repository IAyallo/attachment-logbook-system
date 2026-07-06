const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { createNotification } = require("../utils/notifications");

const phoneRegex = /^07\d{8}$/;

// GET /api/admin/overview — dashboard stats
const getOverview = async (req, res) => {
  try {
    const totalHours = await pool.query(
      `SELECT COALESCE(SUM(le.hours_logged), 0) AS total
       FROM logbook_entries le
       JOIN students s ON le.student_id = s.id
       WHERE le.status = 'approved'
         AND (s.attachment_start IS NULL OR le.entry_date >= s.attachment_start)
         AND (s.attachment_end IS NULL OR le.entry_date <= s.attachment_end)`,
    );

    const activeSupervisors = await pool.query(
      `SELECT COUNT(*) AS count FROM host_supervisors`,
    );

    const institutionCount = await pool.query(
      `SELECT COUNT(*) AS count FROM institutions`,
    );

    res.status(200).json({
      total_hours_logged: parseFloat(totalHours.rows[0].total),
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
  const { name, address, contact_person, contact_email, contact_phone } = req.body;

  if (!contact_phone || !phoneRegex.test(contact_phone)) {
    return res.status(400).json({
      message: "Institution contact phone is required and must be in format 07XXXXXXXX.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO institutions (name, address, contact_person, contact_email, contact_phone)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, address, contact_person, contact_email, contact_phone],
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

// PATCH /api/admin/institutions/:institutionId — update institution details
const updateInstitution = async (req, res) => {
  const { institutionId } = req.params;
  const { name, address, contact_person, contact_email, contact_phone } = req.body;

  if (contact_phone && !phoneRegex.test(contact_phone)) {
    return res.status(400).json({
      message: "Institution contact phone must be in format 07XXXXXXXX.",
    });
  }

  const nextName = typeof name === "string" ? name.trim() : "";
  if (name !== undefined && !nextName) {
    return res.status(400).json({ message: "Institution name cannot be empty." });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM institutions WHERE id = $1",
      [institutionId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Institution not found." });
    }

    const result = await pool.query(
      `UPDATE institutions
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           contact_person = COALESCE($3, contact_person),
           contact_email = COALESCE($4, contact_email),
           contact_phone = COALESCE($5, contact_phone)
       WHERE id = $6
       RETURNING *`,
      [
        name !== undefined ? nextName : null,
        address !== undefined ? address : null,
        contact_person !== undefined ? contact_person : null,
        contact_email !== undefined ? contact_email : null,
        contact_phone !== undefined ? contact_phone : null,
        institutionId,
      ],
    );

    return res.status(200).json({
      message: "Institution updated successfully.",
      institution: result.rows[0],
    });
  } catch (err) {
    console.error("Update institution error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/admin/institutions/:institutionId — remove an institution
const deleteInstitution = async (req, res) => {
  const { institutionId } = req.params;

  try {
    const existing = await pool.query(
      "SELECT id, name FROM institutions WHERE id = $1",
      [institutionId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Institution not found." });
    }

    const [studentsUsing, hostsUsing] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM students WHERE institution_id = $1", [institutionId]),
      pool.query("SELECT COUNT(*)::int AS count FROM host_supervisors WHERE institution_id = $1", [institutionId]),
    ]);

    const studentCount = studentsUsing.rows[0].count;
    const hostCount = hostsUsing.rows[0].count;

    if (studentCount > 0 || hostCount > 0) {
      return res.status(400).json({
        message: `Cannot delete institution. It is still linked to ${studentCount} student(s) and ${hostCount} host supervisor profile(s).`,
      });
    }

    await pool.query("DELETE FROM institutions WHERE id = $1", [institutionId]);

    return res.status(200).json({
      message: `Institution '${existing.rows[0].name}' deleted successfully.`,
    });
  } catch (err) {
    console.error("Delete institution error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// POST /api/admin/users — onboard a new user (any role)
const createUser = async (req, res) => {
  const { email, password, role, full_name, phone_number, reg_number, programme, institution_id } = req.body;

  if (!phone_number || !phoneRegex.test(phone_number)) {
    return res.status(400).json({
      message: "Phone number is required and must be in format 07XXXXXXXX.",
    });
  }

  if (role === "student" && !reg_number) {
    return res
      .status(400)
      .json({ message: "Registration number is required for students." });
  }
  if (role === "student" && !["WBL", "SBL"].includes(programme)) {
    return res.status(400).json({ message: "Programme must be WBL or SBL." });
  }
  if (role === "student" && !institution_id) {
    return res.status(400).json({ message: "Institution is required for students." });
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
      const institutionCheck = await client.query(
        "SELECT id FROM institutions WHERE id = $1",
        [institution_id],
      );
      if (institutionCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Invalid institution selected." });
      }

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
      `INSERT INTO users (email, password_hash, role, full_name, phone_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, full_name, phone_number`,
      [email, password_hash, role, full_name, phone_number || null],
    );

    const user = userResult.rows[0];
    let student = null;

    if (role === "student") {
      const studentResult = await client.query(
        `INSERT INTO students (user_id, institution_id, reg_number, programme)
         VALUES ($1, $2, $3, $4) RETURNING reg_number, programme, institution_id`,
        [user.id, institution_id, reg_number, programme],
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
      `SELECT u.id, u.email, u.full_name, u.phone_number, u.role, u.created_at,
            s.reg_number,
            s.programme,
            s.institution_id,
              i.name AS institution_name,
                    hs.job_title AS host_job_title,
                    fs.department AS faculty_department
             FROM users u
             LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN institutions i ON s.institution_id = i.id
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

// PATCH /api/admin/users/:userId — update user profile
const updateUser = async (req, res) => {
  const { userId } = req.params;
  const {
    email,
    full_name,
    phone_number,
    role,
    reg_number,
    programme,
    institution_id,
  } = req.body;

  if (phone_number && !phoneRegex.test(phone_number)) {
    return res.status(400).json({
      message: "Phone number must be in format 07XXXXXXXX.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `SELECT u.id, u.email, u.role, u.full_name, u.phone_number,
              s.id AS student_id, s.reg_number, s.programme, s.institution_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (existingUser.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found." });
    }

    const current = existingUser.rows[0];

    if (role && role !== current.role) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Changing user role is not supported." });
    }

    if (email && email !== current.email) {
      const duplicateEmail = await client.query(
        "SELECT id FROM users WHERE email = $1 AND id <> $2",
        [email, userId],
      );
      if (duplicateEmail.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Email already registered." });
      }
    }

    const nextUser = await client.query(
      `UPDATE users
       SET email = COALESCE($1, email),
           full_name = COALESCE($2, full_name),
           phone_number = COALESCE($3, phone_number),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, role, full_name, phone_number, created_at`,
      [
        email !== undefined ? email : null,
        full_name !== undefined ? full_name : null,
        phone_number !== undefined ? phone_number : null,
        userId,
      ],
    );

    if (current.role === "student") {
      const nextRegNumber = reg_number !== undefined ? reg_number : current.reg_number;
      const nextProgramme = programme !== undefined ? programme : current.programme;
      const nextInstitutionId = institution_id !== undefined ? institution_id : current.institution_id;

      if (!nextRegNumber) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Registration number is required for students." });
      }

      if (!nextInstitutionId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Institution is required for students." });
      }

      if (!nextProgramme || !["WBL", "SBL"].includes(nextProgramme)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Programme must be WBL or SBL." });
      }

      if (nextRegNumber !== current.reg_number) {
        const duplicateReg = await client.query(
          "SELECT id FROM students WHERE reg_number = $1 AND user_id <> $2",
          [nextRegNumber, userId],
        );
        if (duplicateReg.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Registration number already in use." });
        }
      }

      const institutionExists = await client.query(
        "SELECT id FROM institutions WHERE id = $1",
        [nextInstitutionId],
      );
      if (institutionExists.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Invalid institution selected." });
      }

      await client.query(
        `UPDATE students
         SET reg_number = $1,
             programme = $2,
             institution_id = $3
         WHERE user_id = $4`,
        [nextRegNumber, nextProgramme, nextInstitutionId, userId],
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "User updated successfully.",
      user: nextUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update user error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
};

// DELETE /api/admin/users/:userId — remove user account
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  if (req.user?.id === userId) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  try {
    const existing = await pool.query(
      "SELECT id, email, full_name FROM users WHERE id = $1",
      [userId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    return res.status(200).json({
      message: `User '${existing.rows[0].full_name || existing.rows[0].email}' deleted successfully.`,
    });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({
        message: "Cannot delete user because related records depend on this account.",
      });
    }
    console.error("Delete user error:", err);
    return res.status(500).json({ message: "Server error." });
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
      const phone_number = record.phone_number?.trim() || null;
      const institution_name = record.institution_name?.trim();
      const reg_number = record.reg_number?.trim();
      const programme = normalizeProgramme(record.programme);

      if (!email || !password || !role) {
        results.failed.push({
          email: email || "unknown",
          reason: "Missing required fields",
        });
        continue;
      }

      if (!phone_number || !phoneRegex.test(phone_number)) {
        results.failed.push({
          email,
          reason: "Phone number is required and must be in format 07XXXXXXXX.",
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
        if (!institution_name) {
          results.failed.push({
            email,
            reason: "Missing institution_name for student.",
          });
          continue;
        }

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

        let resolvedInstitutionId = null;
        if (role === "student") {
          const institution = await client.query(
            "SELECT id FROM institutions WHERE LOWER(name) = LOWER($1)",
            [institution_name],
          );
          if (institution.rows.length === 0) {
            await client.query("ROLLBACK");
            results.failed.push({ email, reason: `Institution '${institution_name}' not found` });
            continue;
          }
          resolvedInstitutionId = institution.rows[0].id;
        }

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
          `INSERT INTO users (email, password_hash, role, full_name, phone_number)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, full_name, phone_number`,
          [email, password_hash, role, full_name || null, phone_number],
        );

        const createdUser = userResult.rows[0];

        if (role === "student") {
          const studentResult = await client.query(
            `INSERT INTO students (user_id, institution_id, reg_number, programme)
             VALUES ($1, $2, $3, $4)
             RETURNING reg_number, programme, institution_id`,
            [createdUser.id, resolvedInstitutionId, reg_number, programme],
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

// PATCH /api/admin/users/:userId/reset-password — admin resets user password
const resetUserPassword = async (req, res) => {
  const { userId } = req.params;
  const { temporary_password } = req.body;
  const actorId = req.user.id;

  if (!temporary_password || temporary_password.trim().length < 8) {
    return res.status(400).json({
      message: "Temporary password is required and must be at least 8 characters.",
    });
  }

  try {
    const targetUser = await pool.query(
      "SELECT id, email, full_name, role FROM users WHERE id = $1",
      [userId],
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const password_hash = await bcrypt.hash(temporary_password.trim(), 10);

    await pool.query(
      "UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2",
      [password_hash, userId],
    );

    await createNotification({
      recipientId: userId,
      actorId,
      type: "password_reset",
      title: "Password Reset",
      message: "Your password was reset by admin. Use your temporary password and then update it.",
    });

    res.status(200).json({
      message: `Password reset successfully for ${targetUser.rows[0].full_name || targetUser.rows[0].email}.`,
    });
  } catch (err) {
    console.error("Reset user password error:", err);
    res.status(500).json({ message: "Server error." });
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
  const { faculty_supervisor_id } = req.body;
  const actorId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const student = await client.query(
      `SELECT s.id, s.reg_number, u.id AS student_user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [studentId],
    );

    if (student.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Student not found." });
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
       SET faculty_supervisor_id = $1
       WHERE id = $2
       RETURNING id, reg_number, programme, host_supervisor_id, faculty_supervisor_id`,
      [faculty_supervisor_id || null, studentId],
    );

    let facultyUserId = null;

    if (faculty_supervisor_id) {
      const facultyUser = await client.query(
        `SELECT user_id FROM faculty_supervisors WHERE id = $1`,
        [faculty_supervisor_id],
      );
      facultyUserId = facultyUser.rows[0]?.user_id || null;
    }

    await client.query("COMMIT");

    await createNotification({
      recipientId: student.rows[0].student_user_id,
      actorId,
      type: "assignment_updated",
      title: "Supervisor Assignments Updated",
      message: `Your faculty supervisor assignment was updated by admin (${student.rows[0].reg_number}).`,
    });

    if (facultyUserId) {
      await createNotification({
        recipientId: facultyUserId,
        actorId,
        type: "student_assigned",
        title: "Student Assigned",
        message: `A new student (${student.rows[0].reg_number}) was assigned to you as faculty supervisor.`,
      });
    }

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
  updateInstitution,
  deleteInstitution,
  createUser,
  getAuditTrails,
  getUsers,
  updateUser,
  deleteUser,
  getFinalGrade,
  bulkCreateUsers,
  resetUserPassword,
  getAssignmentOptions,
  getAssignments,
  updateAssignment,
};
