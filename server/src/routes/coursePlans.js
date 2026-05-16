import { Router } from "express";
import { db } from "../db.js";

export const coursePlansRouter = Router();

function rowWithJoins(planId) {
  return db
    .prepare(
      `SELECT cp.*,
        c.code AS course_code, c.name AS course_name, c.credits,
        t.name AS teacher_name, t.department AS teacher_department
       FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = cp.teacher_id
       WHERE cp.id = ?`
    )
    .get(planId);
}

coursePlansRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT cp.*,
        c.code AS course_code, c.name AS course_name, c.credits,
        t.name AS teacher_name, t.department AS teacher_department
       FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = cp.teacher_id
       ORDER BY cp.academic_year DESC, cp.semester, c.code`
    )
    .all();
  res.json(rows);
});

coursePlansRouter.get("/:id/enrollments", (req, res) => {
  const plan = db.prepare("SELECT id FROM course_plans WHERE id = ?").get(req.params.id);
  if (!plan) return res.status(404).json({ error: "开课计划不存在" });
  const rows = db
    .prepare(
      `SELECT e.id, e.enrolled_at, s.id AS student_id, s.name AS student_name, s.student_no, s.major
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.course_plan_id = ?
       ORDER BY s.student_no`
    )
    .all(req.params.id);
  res.json(rows);
});

coursePlansRouter.get("/:id", (req, res) => {
  const row = rowWithJoins(req.params.id);
  if (!row) return res.status(404).json({ error: "开课计划不存在" });
  res.json(row);
});

coursePlansRouter.post("/", (req, res) => {
  const { academic_year, semester, course_id, teacher_id, capacity, schedule_note, room } = req.body;
  if (!academic_year?.trim()) return res.status(400).json({ error: "学年必填，如 2024-2025" });
  if (!semester?.trim()) return res.status(400).json({ error: "学期必填" });
  const cid = Number(course_id);
  if (!cid) return res.status(400).json({ error: "请选择课程" });
  const cap = capacity != null ? Number(capacity) : 40;
  if (Number.isNaN(cap) || cap < 1) return res.status(400).json({ error: "容量须为正整数" });
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(cid);
  if (!course) return res.status(400).json({ error: "课程不存在" });
  let tid = teacher_id != null && teacher_id !== "" ? Number(teacher_id) : null;
  if (tid) {
    const t = db.prepare("SELECT id FROM teachers WHERE id = ?").get(tid);
    if (!t) return res.status(400).json({ error: "教师不存在" });
  } else tid = null;
  try {
    const info = db
      .prepare(
        `INSERT INTO course_plans (academic_year, semester, course_id, teacher_id, capacity, schedule_note, room)
         VALUES (@academic_year, @semester, @course_id, @teacher_id, @capacity, @schedule_note, @room)`
      )
      .run({
        academic_year: academic_year.trim(),
        semester: semester.trim(),
        course_id: cid,
        teacher_id: tid,
        capacity: cap,
        schedule_note: schedule_note?.trim() || null,
        room: room?.trim() || null,
      });
    const row = rowWithJoins(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "该学年学期下此课程已排课" });
    }
    throw e;
  }
});

coursePlansRouter.put("/:id", (req, res) => {
  const { academic_year, semester, course_id, teacher_id, capacity, schedule_note, room } = req.body;
  if (!academic_year?.trim()) return res.status(400).json({ error: "学年必填" });
  if (!semester?.trim()) return res.status(400).json({ error: "学期必填" });
  const cid = Number(course_id);
  if (!cid) return res.status(400).json({ error: "请选择课程" });
  const cap = capacity != null ? Number(capacity) : 40;
  if (Number.isNaN(cap) || cap < 1) return res.status(400).json({ error: "容量须为正整数" });
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(cid);
  if (!course) return res.status(400).json({ error: "课程不存在" });
  let tid = teacher_id != null && teacher_id !== "" ? Number(teacher_id) : null;
  if (tid) {
    const t = db.prepare("SELECT id FROM teachers WHERE id = ?").get(tid);
    if (!t) return res.status(400).json({ error: "教师不存在" });
  } else tid = null;
  try {
    const r = db
      .prepare(
        `UPDATE course_plans SET academic_year=@academic_year, semester=@semester, course_id=@course_id,
         teacher_id=@teacher_id, capacity=@capacity, schedule_note=@schedule_note, room=@room WHERE id=@id`
      )
      .run({
        id: req.params.id,
        academic_year: academic_year.trim(),
        semester: semester.trim(),
        course_id: cid,
        teacher_id: tid,
        capacity: cap,
        schedule_note: schedule_note?.trim() || null,
        room: room?.trim() || null,
      });
    if (r.changes === 0) return res.status(404).json({ error: "开课计划不存在" });
    const row = rowWithJoins(req.params.id);
    res.json(row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "该学年学期下此课程已排课" });
    }
    throw e;
  }
});

coursePlansRouter.post("/:id/enroll", (req, res) => {
  const planId = Number(req.params.id);
  const plan = db.prepare("SELECT id, capacity FROM course_plans WHERE id = ?").get(planId);
  if (!plan) return res.status(404).json({ error: "开课计划不存在" });
  const { student_id } = req.body;
  const sid = Number(student_id);
  if (!sid) return res.status(400).json({ error: "请选择学生" });
  const student = db.prepare("SELECT id FROM students WHERE id = ?").get(sid);
  if (!student) return res.status(400).json({ error: "学生不存在" });
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM enrollments WHERE course_plan_id = ?")
    .get(planId).n;
  if (count >= plan.capacity) return res.status(400).json({ error: "选课人数已满" });
  try {
    db.prepare(
      `INSERT INTO enrollments (student_id, course_plan_id) VALUES (?, ?)`
    ).run(sid, planId);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "该学生已选此课" });
    }
    throw e;
  }
  const row = db
    .prepare(
      `SELECT e.id, e.enrolled_at, s.id AS student_id, s.name AS student_name, s.student_no, s.major
       FROM enrollments e JOIN students s ON s.id = e.student_id
       WHERE e.course_plan_id = ? AND e.student_id = ?`
    )
    .get(planId, sid);
  res.status(201).json(row);
});

coursePlansRouter.delete("/:planId/enrollments/:enrollmentId", (req, res) => {
  const r = db
    .prepare("DELETE FROM enrollments WHERE id = ? AND course_plan_id = ?")
    .run(req.params.enrollmentId, req.params.planId);
  if (r.changes === 0) return res.status(404).json({ error: "选课记录不存在" });
  res.status(204).send();
});

coursePlansRouter.delete("/:id", (req, res) => {
  const r = db.prepare("DELETE FROM course_plans WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "开课计划不存在" });
  res.status(204).send();
});
