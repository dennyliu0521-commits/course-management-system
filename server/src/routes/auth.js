import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { createToken, authenticate } from "../middleware/auth.js";

export const authRouter = Router();

// POST /api/auth/login
authRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: "用户名和密码必填" });
  }
  try {
    const [[user]] = await pool.query(
      "SELECT id, username, password_hash, role, related_id, name FROM users WHERE username = ?",
      [username.trim()]
    );
    if (!user) return res.status(401).json({ error: "用户名或密码错误" });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "用户名或密码错误" });
    const token = createToken({
      id: user.id,
      username: user.username,
      role: user.role,
      relatedId: user.related_id,
      name: user.name,
    });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        relatedId: user.related_id,
        name: user.name,
      },
    });
  } catch (e) { next(e); }
});

// GET /api/auth/me — return current user info
authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const [[user]] = await pool.query(
      "SELECT id, username, role, related_id, name FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: "用户不存在" });
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      relatedId: user.related_id,
      name: user.name,
    });
  } catch (e) { next(e); }
});
