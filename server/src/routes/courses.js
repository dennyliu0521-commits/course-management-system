import { Router } from "express";
import { pool } from "../db.js";

export const coursesRouter = Router();

coursesRouter.get("/", async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM courses ORDER BY id DESC");
    res.json(rows);
  } catch (e) { next(e); }
});

coursesRouter.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query("SELECT * FROM courses WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "课程不存在" });
    res.json(row);
  } catch (e) { next(e); }
});

coursesRouter.post("/", async (req, res, next) => {
  const { code, name, credits, description, type } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: "课程代码必填" });
  if (!name?.trim()) return res.status(400).json({ error: "课程名称必填" });
  const c = credits != null ? Number(credits) : 2;
  if (Number.isNaN(c) || c <= 0) return res.status(400).json({ error: "学分须为正数" });
  const t = type === "选修" ? "选修" : "必修";
  try {
    const [result] = await pool.query(
      `INSERT INTO courses (code, name, credits, description, type) VALUES (?, ?, ?, ?, ?)`,
      [code.trim(), name.trim(), c, description?.trim() || null, t]
    );
    const [[row]] = await pool.query("SELECT * FROM courses WHERE id = ?", [result.insertId]);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "课程代码已存在" });
    next(e);
  }
});

coursesRouter.put("/:id", async (req, res, next) => {
  const { code, name, credits, description, type } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: "课程代码必填" });
  if (!name?.trim()) return res.status(400).json({ error: "课程名称必填" });
  const c = credits != null ? Number(credits) : 2;
  if (Number.isNaN(c) || c <= 0) return res.status(400).json({ error: "学分须为正数" });
  const t = type === "选修" ? "选修" : "必修";
  try {
    const [result] = await pool.query(
      `UPDATE courses SET code=?, name=?, credits=?, description=?, type=? WHERE id=?`,
      [code.trim(), name.trim(), c, description?.trim() || null, t, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "课程不存在" });
    const [[row]] = await pool.query("SELECT * FROM courses WHERE id = ?", [req.params.id]);
    res.json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "课程代码已存在" });
    next(e);
  }
});

coursesRouter.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM courses WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "课程不存在" });
    res.status(204).send();
  } catch (e) { next(e); }
});
