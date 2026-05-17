import { Router } from "express";
import { pool } from "../db.js";

export const coursePlansRouter = Router();

function toMysqlDatetime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function classesForPlan(planId) {
  const [classes] = await pool.query(
    `SELECT c.id, c.class_code, c.enrollment_year, c.major, c.class_number
     FROM course_plan_classes pc
     JOIN classes c ON c.id = pc.class_id
     WHERE pc.course_plan_id = ?
     ORDER BY c.enrollment_year, c.major, c.class_number`,
    [planId]
  );
  return classes;
}

async function rowWithJoins(planId) {
  const [[row]] = await pool.query(
    `SELECT cp.*,
      c.code AS course_code, c.name AS course_name, c.credits,
      t.name AS teacher_name, t.department AS teacher_department
     FROM course_plans cp
     JOIN courses c ON c.id = cp.course_id
     LEFT JOIN teachers t ON t.id = cp.teacher_id
     WHERE cp.id = ?`,
    [planId]
  );
  if (row) {
    row.classes = await classesForPlan(planId);
  }
  return row;
}

coursePlansRouter.get("/", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*,
        c.code AS course_code, c.name AS course_name, c.credits,
        t.name AS teacher_name, t.department AS teacher_department,
        GROUP_CONCAT(DISTINCT cl.class_code ORDER BY cl.class_code SEPARATOR ', ') AS class_codes
       FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = cp.teacher_id
       LEFT JOIN course_plan_classes pc ON pc.course_plan_id = cp.id
       LEFT JOIN classes cl ON cl.id = pc.class_id
       GROUP BY cp.id
       ORDER BY cp.academic_year DESC, cp.semester, c.code`
    );
    // Parse class_codes into array for each plan
    const enriched = await Promise.all(
      rows.map(async (p) => ({
        ...p,
        class_codes: p.class_codes ? p.class_codes.split(", ") : [],
        classes: p.class_codes ? await classesForPlan(p.id) : [],
        enrollments: [],
      }))
    );
    res.json(enriched);
  } catch (e) { next(e); }
});

coursePlansRouter.get("/:id/enrollments", async (req, res, next) => {
  try {
    const [[plan]] = await pool.query("SELECT id FROM course_plans WHERE id = ?", [req.params.id]);
    if (!plan) return res.status(404).json({ error: "开课计划不存在" });
    const [rows] = await pool.query(
      `SELECT e.id, e.enrolled_at, s.id AS student_id, s.name AS student_name, s.student_no,
        s.class_id, cl.class_code, cl.enrollment_year AS class_year, cl.major AS class_major, cl.class_number
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN classes cl ON cl.id = s.class_id
       WHERE e.course_plan_id = ?
       ORDER BY s.student_no`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

coursePlansRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await rowWithJoins(req.params.id);
    if (!row) return res.status(404).json({ error: "开课计划不存在" });
    res.json(row);
  } catch (e) { next(e); }
});

coursePlansRouter.post("/", async (req, res, next) => {
  const { academic_year, semester, course_id, teacher_id, capacity, schedule_note, room, course_start_date, course_end_date, class_ids } = req.body;
  if (!academic_year?.trim()) return res.status(400).json({ error: "学年必填，如 2024-2025" });
  if (!semester?.trim()) return res.status(400).json({ error: "学期必填" });
  const cid = Number(course_id);
  if (!cid) return res.status(400).json({ error: "请选择课程" });
  const cap = capacity != null ? Number(capacity) : 40;
  if (Number.isNaN(cap) || cap < 1) return res.status(400).json({ error: "容量须为正整数" });
  let tid = teacher_id != null && teacher_id !== "" ? Number(teacher_id) : null;
  const clsIds = (class_ids || []).map(Number).filter((id) => id > 0);
  try {
    const [[course]] = await pool.query("SELECT id FROM courses WHERE id = ?", [cid]);
    if (!course) return res.status(400).json({ error: "课程不存在" });
    if (tid) {
      const [[t]] = await pool.query("SELECT id FROM teachers WHERE id = ?", [tid]);
      if (!t) return res.status(400).json({ error: "教师不存在" });
    }
    if (clsIds.length > 0) {
      for (const clid of clsIds) {
        const [[cl]] = await pool.query("SELECT id FROM classes WHERE id = ?", [clid]);
        if (!cl) return res.status(400).json({ error: `班级 ${clid} 不存在` });
      }
    }
    const sd = toMysqlDatetime(course_start_date);
    const ed = toMysqlDatetime(course_end_date);
    const [result] = await pool.query(
      `INSERT INTO course_plans (academic_year, semester, course_id, teacher_id, capacity, schedule_note, room, course_start_date, course_end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [academic_year.trim(), semester.trim(), cid, tid, cap, schedule_note?.trim() || null, room?.trim() || null, sd, ed]
    );
    // Insert class associations
    for (const clid of clsIds) {
      await pool.query("INSERT INTO course_plan_classes (course_plan_id, class_id) VALUES (?, ?)", [result.insertId, clid]);
    }
    const row = await rowWithJoins(result.insertId);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "该学年学期下此课程已排课" });
    next(e);
  }
});

coursePlansRouter.put("/:id", async (req, res, next) => {
  const { academic_year, semester, course_id, teacher_id, capacity, schedule_note, room, course_start_date, course_end_date, class_ids } = req.body;
  if (!academic_year?.trim()) return res.status(400).json({ error: "学年必填" });
  if (!semester?.trim()) return res.status(400).json({ error: "学期必填" });
  const cid = Number(course_id);
  if (!cid) return res.status(400).json({ error: "请选择课程" });
  const cap = capacity != null ? Number(capacity) : 40;
  if (Number.isNaN(cap) || cap < 1) return res.status(400).json({ error: "容量须为正整数" });
  let tid = teacher_id != null && teacher_id !== "" ? Number(teacher_id) : null;
  const clsIds = (class_ids || []).map(Number).filter((id) => id > 0);
  try {
    const [[course]] = await pool.query("SELECT id FROM courses WHERE id = ?", [cid]);
    if (!course) return res.status(400).json({ error: "课程不存在" });
    if (tid) {
      const [[t]] = await pool.query("SELECT id FROM teachers WHERE id = ?", [tid]);
      if (!t) return res.status(400).json({ error: "教师不存在" });
    }
    if (clsIds.length > 0) {
      for (const clid of clsIds) {
        const [[cl]] = await pool.query("SELECT id FROM classes WHERE id = ?", [clid]);
        if (!cl) return res.status(400).json({ error: `班级 ${clid} 不存在` });
      }
    }
    const sd = toMysqlDatetime(course_start_date);
    const ed = toMysqlDatetime(course_end_date);
    const [result] = await pool.query(
      `UPDATE course_plans SET academic_year=?, semester=?, course_id=?, teacher_id=?, capacity=?, schedule_note=?, room=?, course_start_date=?, course_end_date=? WHERE id=?`,
      [academic_year.trim(), semester.trim(), cid, tid, cap, schedule_note?.trim() || null, room?.trim() || null, sd, ed, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "开课计划不存在" });
    // Replace class associations
    await pool.query("DELETE FROM course_plan_classes WHERE course_plan_id = ?", [req.params.id]);
    for (const clid of clsIds) {
      await pool.query("INSERT INTO course_plan_classes (course_plan_id, class_id) VALUES (?, ?)", [req.params.id, clid]);
    }
    const row = await rowWithJoins(req.params.id);
    res.json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "该学年学期下此课程已排课" });
    next(e);
  }
});

coursePlansRouter.post("/:id/enroll", async (req, res, next) => {
  const planId = Number(req.params.id);
  const { student_id } = req.body;
  const sid = Number(student_id);
  if (!sid) return res.status(400).json({ error: "请选择学生" });
  try {
    const [[plan]] = await pool.query("SELECT id, capacity FROM course_plans WHERE id = ?", [planId]);
    if (!plan) return res.status(404).json({ error: "开课计划不存在" });
    const [[student]] = await pool.query(
      `SELECT s.id, s.class_id FROM students s WHERE s.id = ?`,
      [sid]
    );
    if (!student) return res.status(400).json({ error: "学生不存在" });
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM enrollments WHERE course_plan_id = ?", [planId]);
    if (n >= plan.capacity) return res.status(400).json({ error: "选课人数已满" });
    await pool.query("INSERT INTO enrollments (student_id, course_plan_id) VALUES (?, ?)", [sid, planId]);
    const [[row]] = await pool.query(
      `SELECT e.id, e.enrolled_at, s.id AS student_id, s.name AS student_name, s.student_no,
        s.class_id, cl.class_code, cl.enrollment_year AS class_year, cl.major AS class_major, cl.class_number
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN classes cl ON cl.id = s.class_id
       WHERE e.course_plan_id = ? AND e.student_id = ?`,
      [planId, sid]
    );
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "该学生已选此课" });
    next(e);
  }
});

coursePlansRouter.delete("/:planId/enrollments/:enrollmentId", async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM enrollments WHERE id = ? AND course_plan_id = ?",
      [req.params.enrollmentId, req.params.planId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "选课记录不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});

coursePlansRouter.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM course_plans WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "开课计划不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});
