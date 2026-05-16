import { Router } from "express";
import { db } from "../db.js";

export const studentsRouter = Router();

studentsRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM students ORDER BY id DESC").all();
  res.json(rows);
});

studentsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM students WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "学生不存在" });
  res.json(row);
});

studentsRouter.post("/", (req, res) => {
  const { name, student_no, email, major, enrollment_year } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
  if (!student_no?.trim()) return res.status(400).json({ error: "学号必填" });
  try {
    const info = db
      .prepare(
        `INSERT INTO students (name, student_no, email, major, enrollment_year)
         VALUES (@name, @student_no, @email, @major, @enrollment_year)`
      )
      .run({
        name: name.trim(),
        student_no: student_no.trim(),
        email: email?.trim() || null,
        major: major?.trim() || null,
        enrollment_year: enrollment_year != null ? Number(enrollment_year) : null,
      });
    const row = db.prepare("SELECT * FROM students WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "学号已存在" });
    }
    throw e;
  }
});

studentsRouter.put("/:id", (req, res) => {
  const { name, student_no, email, major, enrollment_year } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
  if (!student_no?.trim()) return res.status(400).json({ error: "学号必填" });
  try {
    const r = db
      .prepare(
        `UPDATE students SET name=@name, student_no=@student_no, email=@email, major=@major, enrollment_year=@enrollment_year WHERE id=@id`
      )
      .run({
        id: req.params.id,
        name: name.trim(),
        student_no: student_no.trim(),
        email: email?.trim() || null,
        major: major?.trim() || null,
        enrollment_year: enrollment_year != null ? Number(enrollment_year) : null,
      });
    if (r.changes === 0) return res.status(404).json({ error: "学生不存在" });
    const row = db.prepare("SELECT * FROM students WHERE id = ?").get(req.params.id);
    res.json(row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "学号已存在" });
    }
    throw e;
  }
});

studentsRouter.delete("/:id", (req, res) => {
  const r = db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "学生不存在" });
  res.status(204).send();
});
