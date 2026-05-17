import { Router } from "express";
import { pool } from "../db.js";

export const teachersRouter = Router();

teachersRouter.get("/", async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM teachers ORDER BY id DESC");
    res.json(rows);
  } catch (e) { next(e); }
});

teachersRouter.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query("SELECT * FROM teachers WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "教师不存在" });
    res.json(row);
  } catch (e) { next(e); }
});

teachersRouter.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, department, title } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
    const [result] = await pool.query(
      `INSERT INTO teachers (name, email, phone, department, title) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email?.trim() || null, phone?.trim() || null, department?.trim() || null, title?.trim() || null]
    );
    const [[row]] = await pool.query("SELECT * FROM teachers WHERE id = ?", [result.insertId]);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

teachersRouter.put("/:id", async (req, res, next) => {
  try {
    const { name, email, phone, department, title } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
    const [result] = await pool.query(
      `UPDATE teachers SET name=?, email=?, phone=?, department=?, title=? WHERE id=?`,
      [name.trim(), email?.trim() || null, phone?.trim() || null, department?.trim() || null, title?.trim() || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "教师不存在" });
    const [[row]] = await pool.query("SELECT * FROM teachers WHERE id = ?", [req.params.id]);
    res.json(row);
  } catch (e) { next(e); }
});

teachersRouter.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM teachers WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "教师不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});
