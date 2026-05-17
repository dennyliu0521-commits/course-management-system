import { Router } from "express";
import { pool } from "../db.js";

export const studentsRouter = Router();

studentsRouter.get("/", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*,
        c.class_code, c.enrollment_year AS class_year, c.major AS class_major, c.class_number
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       ORDER BY s.id DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

studentsRouter.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT s.*,
        c.class_code, c.enrollment_year AS class_year, c.major AS class_major, c.class_number
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "学生不存在" });
    res.json(row);
  } catch (e) { next(e); }
});

studentsRouter.post("/", async (req, res, next) => {
  const { name, student_no, email, class_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
  if (!student_no?.trim()) return res.status(400).json({ error: "学号必填" });
  const cid = class_id != null && class_id !== "" ? Number(class_id) : null;
  try {
    if (cid) {
      const [[cls]] = await pool.query("SELECT id FROM classes WHERE id = ?", [cid]);
      if (!cls) return res.status(400).json({ error: "班级不存在" });
    }
    const [result] = await pool.query(
      `INSERT INTO students (name, student_no, email, class_id) VALUES (?, ?, ?, ?)`,
      [name.trim(), student_no.trim(), email?.trim() || null, cid]
    );
    const [[row]] = await pool.query(
      `SELECT s.*,
        c.class_code, c.enrollment_year AS class_year, c.major AS class_major, c.class_number
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "学号已存在" });
    next(e);
  }
});

studentsRouter.put("/:id", async (req, res, next) => {
  const { name, student_no, email, class_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
  if (!student_no?.trim()) return res.status(400).json({ error: "学号必填" });
  const cid = class_id != null && class_id !== "" ? Number(class_id) : null;
  try {
    if (cid) {
      const [[cls]] = await pool.query("SELECT id FROM classes WHERE id = ?", [cid]);
      if (!cls) return res.status(400).json({ error: "班级不存在" });
    }
    const [result] = await pool.query(
      `UPDATE students SET name=?, student_no=?, email=?, class_id=? WHERE id=?`,
      [name.trim(), student_no.trim(), email?.trim() || null, cid, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "学生不存在" });
    const [[row]] = await pool.query(
      `SELECT s.*,
        c.class_code, c.enrollment_year AS class_year, c.major AS class_major, c.class_number
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    res.json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "学号已存在" });
    next(e);
  }
});

studentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM students WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "学生不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});
