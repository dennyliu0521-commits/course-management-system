import { Router } from "express";
import { pool } from "../db.js";

export const classesRouter = Router();

// List classes with student count
classesRouter.get("/", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(s.id) AS student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id
       ORDER BY c.enrollment_year DESC, c.major, c.class_number`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

classesRouter.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT c.*, COUNT(s.id) AS student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "班级不存在" });
    res.json(row);
  } catch (e) { next(e); }
});

classesRouter.post("/", async (req, res, next) => {
  const { enrollment_year, major, class_number } = req.body;
  if (!enrollment_year) return res.status(400).json({ error: "入学年份必填" });
  if (!major?.trim()) return res.status(400).json({ error: "专业必填" });
  if (!class_number?.trim()) return res.status(400).json({ error: "班级序号必填" });
  const year = Number(enrollment_year);
  const mj = major.trim();
  const cn = class_number.trim();
  // class_code = year_major_class_number
  const class_code = `${year}_${mj}_${cn}`;
  try {
    const [result] = await pool.query(
      `INSERT INTO classes (class_code, enrollment_year, major, class_number) VALUES (?, ?, ?, ?)`,
      [class_code, year, mj, cn]
    );
    const [[row]] = await pool.query(
      `SELECT c.*, COUNT(s.id) AS student_count
       FROM classes c LEFT JOIN students s ON s.class_id = c.id
       WHERE c.id = ? GROUP BY c.id`,
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "该班级已存在" });
    next(e);
  }
});

classesRouter.put("/:id", async (req, res, next) => {
  const { enrollment_year, major, class_number } = req.body;
  if (!enrollment_year) return res.status(400).json({ error: "入学年份必填" });
  if (!major?.trim()) return res.status(400).json({ error: "专业必填" });
  if (!class_number?.trim()) return res.status(400).json({ error: "班级序号必填" });
  const year = Number(enrollment_year);
  const mj = major.trim();
  const cn = class_number.trim();
  const class_code = `${year}_${mj}_${cn}`;
  try {
    const [result] = await pool.query(
      `UPDATE classes SET class_code=?, enrollment_year=?, major=?, class_number=? WHERE id=?`,
      [class_code, year, mj, cn, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "班级不存在" });
    const [[row]] = await pool.query(
      `SELECT c.*, COUNT(s.id) AS student_count
       FROM classes c LEFT JOIN students s ON s.class_id = c.id
       WHERE c.id = ? GROUP BY c.id`,
      [req.params.id]
    );
    res.json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "该班级已存在" });
    next(e);
  }
});

classesRouter.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM classes WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "班级不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});

// Get students by class
classesRouter.get("/:id/students", async (req, res, next) => {
  try {
    const [[cls]] = await pool.query("SELECT id FROM classes WHERE id = ?", [req.params.id]);
    if (!cls) return res.status(404).json({ error: "班级不存在" });
    const [rows] = await pool.query(
      "SELECT * FROM students WHERE class_id = ? ORDER BY student_no",
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});
