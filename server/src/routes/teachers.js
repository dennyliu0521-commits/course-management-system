import { Router } from "express";
import { db } from "../db.js";

export const teachersRouter = Router();

teachersRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM teachers ORDER BY id DESC").all();
  res.json(rows);
});

teachersRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM teachers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "教师不存在" });
  res.json(row);
});

teachersRouter.post("/", (req, res) => {
  const { name, email, phone, department, title } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
  const info = db
    .prepare(
      `INSERT INTO teachers (name, email, phone, department, title)
       VALUES (@name, @email, @phone, @department, @title)`
    )
    .run({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      department: department?.trim() || null,
      title: title?.trim() || null,
    });
  const row = db.prepare("SELECT * FROM teachers WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

teachersRouter.put("/:id", (req, res) => {
  const { name, email, phone, department, title } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "姓名必填" });
  const r = db
    .prepare(
      `UPDATE teachers SET name=@name, email=@email, phone=@phone, department=@department, title=@title WHERE id=@id`
    )
    .run({
      id: req.params.id,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      department: department?.trim() || null,
      title: title?.trim() || null,
    });
  if (r.changes === 0) return res.status(404).json({ error: "教师不存在" });
  const row = db.prepare("SELECT * FROM teachers WHERE id = ?").get(req.params.id);
  res.json(row);
});

teachersRouter.delete("/:id", (req, res) => {
  const r = db.prepare("DELETE FROM teachers WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "教师不存在" });
  res.status(204).send();
});
