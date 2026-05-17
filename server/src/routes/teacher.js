import { Router } from "express";
import { pool } from "../db.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const teacherRouter = Router();
teacherRouter.use(authenticate, authorize("teacher"));

// GET /api/teacher/my-plans — teacher's own course plans with classes and enrollment count
teacherRouter.get("/my-plans", async (req, res, next) => {
  try {
    const teacherId = req.user.relatedId;
    const [rows] = await pool.query(
      `SELECT cp.*,
        c.code AS course_code, c.name AS course_name, c.credits, c.type AS course_type,
        GROUP_CONCAT(DISTINCT cl.class_code ORDER BY cl.class_code SEPARATOR ', ') AS class_codes,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_plan_id = cp.id) AS enrolled_count
       FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN course_plan_classes pc ON pc.course_plan_id = cp.id
       LEFT JOIN classes cl ON cl.id = pc.class_id
       WHERE cp.teacher_id = ?
       GROUP BY cp.id
       ORDER BY cp.course_start_date DESC`,
      [teacherId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// PUT /api/teacher/plans/:id/status — approve or reject a course plan
teacherRouter.put("/plans/:id/status", async (req, res, next) => {
  const { status } = req.body; // 'approved' | 'rejected'
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "状态值无效" });
  }
  try {
    const teacherId = req.user.relatedId;
    const [[plan]] = await pool.query("SELECT id, teacher_id FROM course_plans WHERE id = ?", [req.params.id]);
    if (!plan) return res.status(404).json({ error: "开课计划不存在" });
    if (plan.teacher_id !== teacherId) return res.status(403).json({ error: "只能操作自己的课程" });
    await pool.query("UPDATE course_plans SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ id: Number(req.params.id), status });
  } catch (e) { next(e); }
});

// GET /api/teacher/grades — list grades given by this teacher
teacherRouter.get("/grades", async (req, res, next) => {
  try {
    const teacherId = req.user.relatedId;
    const [rows] = await pool.query(
      `SELECT g.*, s.name AS student_name, s.student_no,
        c.code AS course_code, c.name AS course_name
       FROM grades g
       JOIN students s ON s.id = g.student_id
       JOIN course_plans cp ON cp.id = g.course_plan_id
       JOIN courses c ON c.id = cp.course_id
       WHERE g.teacher_id = ?
       ORDER BY g.created_at DESC`,
      [teacherId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/teacher/grades — create or update a grade
teacherRouter.post("/grades", async (req, res, next) => {
  const { student_id, course_plan_id, score, comment } = req.body;
  if (!student_id || !course_plan_id) return res.status(400).json({ error: "学生和课程计划必选" });
  const teacherId = req.user.relatedId;
  try {
    // Verify the course plan belongs to this teacher
    const [[plan]] = await pool.query("SELECT id FROM course_plans WHERE id = ? AND teacher_id = ?", [course_plan_id, teacherId]);
    if (!plan) return res.status(403).json({ error: "只能给自己教授的课程评分" });
    // Verify student is enrolled
    const [[enr]] = await pool.query("SELECT id FROM enrollments WHERE student_id = ? AND course_plan_id = ?", [student_id, course_plan_id]);
    if (!enr) return res.status(400).json({ error: "该学生未选此课程" });
    // Upsert grade
    const [[existing]] = await pool.query(
      "SELECT id FROM grades WHERE student_id = ? AND course_plan_id = ? AND teacher_id = ?",
      [student_id, course_plan_id, teacherId]
    );
    if (existing) {
      await pool.query("UPDATE grades SET score = ?, comment = ? WHERE id = ?",
        [score != null ? Number(score) : null, comment?.trim() || null, existing.id]);
    } else {
      await pool.query("INSERT INTO grades (student_id, course_plan_id, teacher_id, score, comment) VALUES (?, ?, ?, ?, ?)",
        [student_id, course_plan_id, teacherId, score != null ? Number(score) : null, comment?.trim() || null]);
    }
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/teacher/plan/:planId/students — enrolled students for grading
teacherRouter.get("/plan/:planId/students", async (req, res, next) => {
  try {
    const teacherId = req.user.relatedId;
    const [[plan]] = await pool.query("SELECT id FROM course_plans WHERE id = ? AND teacher_id = ?",
      [req.params.planId, teacherId]);
    if (!plan) return res.status(403).json({ error: "只能查看自己课程的选课名单" });
    const [rows] = await pool.query(
      `SELECT e.id AS enrollment_id, s.id AS student_id, s.name AS student_name, s.student_no,
        cl.class_code,
        g.id AS grade_id, g.score, g.comment
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN classes cl ON cl.id = s.class_id
       LEFT JOIN grades g ON g.student_id = s.id AND g.course_plan_id = e.course_plan_id AND g.teacher_id = ?
       WHERE e.course_plan_id = ?
       ORDER BY s.student_no`,
      [teacherId, req.params.planId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});
