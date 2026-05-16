import { Router } from "express";
import { db } from "../db.js";

export const coursesRouter = Router();

coursesRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM courses ORDER BY id DESC").all();
  res.json(rows);
});

coursesRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "课程不存在" });
  res.json(row);
});

coursesRouter.post("/", (req, res) => {
  const { code, name, credits, description } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: "课程代码必填" });
  if (!name?.trim()) return res.status(400).json({ error: "课程名称必填" });
  const c = credits != null ? Number(credits) : 2;
  if (Number.isNaN(c) || c <= 0) return res.status(400).json({ error: "学分须为正数" });
  try {
    const info = db
      .prepare(
        `INSERT INTO courses (code, name, credits, description)
         VALUES (@code, @name, @credits, @description)`
      )
      .run({
        code: code.trim(),
        name: name.trim(),
        credits: c,
        description: description?.trim() || null,
      });
    const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "课程代码已存在" });
    }
    throw e;
  }
});

coursesRouter.put("/:id", (req, res) => {
  const { code, name, credits, description } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: "课程代码必填" });
  if (!name?.trim()) return res.status(400).json({ error: "课程名称必填" });
  const c = credits != null ? Number(credits) : 2;
  if (Number.isNaN(c) || c <= 0) return res.status(400).json({ error: "学分须为正数" });
  try {
    const r = db
      .prepare(
        `UPDATE courses SET code=@code, name=@name, credits=@credits, description=@description WHERE id=@id`
      )
      .run({
        id: req.params.id,
        code: code.trim(),
        name: name.trim(),
        credits: c,
        description: description?.trim() || null,
      });
    if (r.changes === 0) return res.status(404).json({ error: "课程不存在" });
    const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
    res.json(row);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(400).json({ error: "课程代码已存在" });
    }
    throw e;
  }
});

coursesRouter.delete("/:id", (req, res) => {
  const r = db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "课程不存在" });
  res.status(204).send();
});
