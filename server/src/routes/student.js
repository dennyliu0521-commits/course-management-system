import { Router } from "express";
import { pool } from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const studentRouter = Router();
studentRouter.use(authenticate, authorize("student"));

// GET /api/student/my-schedule — required + elective courses for this student
studentRouter.get("/my-schedule", async (req, res, next) => {
  try {
    const studentId = req.user.relatedId;
    // Get student's class
    const [[student]] = await pool.query("SELECT class_id FROM students WHERE id = ?", [studentId]);
    const classId = student?.class_id;

    // Required courses (via class association, status='approved')
    let requiredPlans = [];
    if (classId) {
      [requiredPlans] = await pool.query(
        `SELECT cp.*, c.code AS course_code, c.name AS course_name, c.credits, c.type AS course_type,
          t.name AS teacher_name, '必修' AS source_type
         FROM course_plans cp
         JOIN courses c ON c.id = cp.course_id
         LEFT JOIN teachers t ON t.id = cp.teacher_id
         JOIN course_plan_classes pc ON pc.course_plan_id = cp.id AND pc.class_id = ?
         WHERE cp.status = 'approved' AND c.type = '必修'
         ORDER BY cp.course_start_date`,
        [classId]
      );
    }

    // Elective courses (student enrolled, regardless of approval)
    const [electivePlans] = await pool.query(
      `SELECT cp.*, c.code AS course_code, c.name AS course_name, c.credits, c.type AS course_type,
        t.name AS teacher_name, '选修' AS source_type,
        e.id AS enrollment_id, e.approval_status
       FROM enrollments e
       JOIN course_plans cp ON cp.id = e.course_plan_id
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = cp.teacher_id
       WHERE e.student_id = ?
       ORDER BY cp.course_start_date`,
      [studentId]
    );

    res.json({ required: requiredPlans, elective: electivePlans });
  } catch (e) { next(e); }
});

// GET /api/student/my-grades — grades for this student
studentRouter.get("/my-grades", async (req, res, next) => {
  try {
    const studentId = req.user.relatedId;
    const [rows] = await pool.query(
      `SELECT g.score, g.comment, g.created_at,
        c.code AS course_code, c.name AS course_name, c.credits,
        t.name AS teacher_name
       FROM grades g
       JOIN course_plans cp ON cp.id = g.course_plan_id
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       WHERE g.student_id = ?
       ORDER BY g.created_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/student/available-electives — elective courses student can choose (not yet enrolled)
studentRouter.get("/available-electives", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, c.code AS course_code, c.name AS course_name, c.credits,
        t.name AS teacher_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_plan_id = cp.id) AS enrolled_count
       FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = cp.teacher_id
       WHERE c.type = '选修' AND cp.status = 'approved'
       ORDER BY cp.course_start_date`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/student/enroll — enroll in an elective course (pending approval)
studentRouter.post("/enroll", async (req, res, next) => {
  const studentId = req.user.relatedId;
  const { course_plan_id } = req.body;
  const planId = Number(course_plan_id);
  if (!planId) return res.status(400).json({ error: "请选择课程" });
  try {
    const [[plan]] = await pool.query(
      `SELECT cp.id, cp.capacity, c.type FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       WHERE cp.id = ? AND cp.status = 'approved'`,
      [planId]
    );
    if (!plan) return res.status(404).json({ error: "课程不存在或未被批准" });
    if (plan.type !== "选修") return res.status(400).json({ error: "只能选选修课" });
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM enrollments WHERE course_plan_id = ?", [planId]);
    if (n >= plan.capacity) return res.status(400).json({ error: "选课人数已满" });
    await pool.query(
      "INSERT INTO enrollments (student_id, course_plan_id, approval_status) VALUES (?, ?, 'pending')",
      [studentId, planId]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "已经选过该课程" });
    next(e);
  }
});

// DELETE /api/student/enroll/:planId — drop an elective
studentRouter.delete("/enroll/:planId", async (req, res, next) => {
  const studentId = req.user.relatedId;
  try {
    const [result] = await pool.query(
      "DELETE FROM enrollments WHERE student_id = ? AND course_plan_id = ?",
      [studentId, req.params.planId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "选课记录不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});
