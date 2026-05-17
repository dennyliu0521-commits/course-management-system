import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, pool } from "./db.js";
import { authenticate, authorize } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { teachersRouter } from "./routes/teachers.js";
import { studentsRouter } from "./routes/students.js";
import { coursesRouter } from "./routes/courses.js";
import { coursePlansRouter } from "./routes/coursePlans.js";
import { calendarRouter } from "./routes/calendar.js";
import { classesRouter } from "./routes/classes.js";
import { teacherRouter } from "./routes/teacher.js";
import { studentRouter } from "./routes/student.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../../client/dist");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Public routes
app.use("/api/auth", authRouter);

// Admin-only routes (protected)
app.use("/api/teachers", authenticate, authorize("admin"), teachersRouter);
app.use("/api/students", authenticate, authorize("admin"), studentsRouter);
app.use("/api/courses", authenticate, authorize("admin"), coursesRouter);
app.use("/api/course-plans", authenticate, authorize("admin"), coursePlansRouter);
app.use("/api/classes", authenticate, authorize("admin"), classesRouter);
app.use("/api/calendar", authenticate, calendarRouter);

// Teacher routes
app.use("/api/teacher", teacherRouter);

// Student routes
app.use("/api/student", studentRouter);

// Admin: manage elective enrollments (approve/reject)
app.get("/api/admin/pending-enrollments", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.approval_status, e.enrolled_at,
        s.name AS student_name, s.student_no,
        c.code AS course_code, c.name AS course_name,
        cp.academic_year, cp.semester
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN course_plans cp ON cp.id = e.course_plan_id
       JOIN courses c ON c.id = cp.course_id
       WHERE e.approval_status = 'pending' AND c.type = '选修'
       ORDER BY e.enrolled_at DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.put("/api/admin/enrollments/:id/status", authenticate, authorize("admin"), async (req, res, next) => {
  const { status } = req.body; // 'approved' | 'rejected'
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "状态值无效" });
  }
  try {
    const [result] = await pool.query(
      "UPDATE enrollments SET approval_status = ? WHERE id = ?",
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "选课记录不存在" });
    res.json({ id: Number(req.params.id), status });
  } catch (e) { next(e); }
});

// Admin: list all users (for managing teacher/student accounts)
app.get("/api/admin/users", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, role, related_id, name, created_at FROM users ORDER BY role, username"
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Admin: create user account linked to a teacher or student
app.post("/api/admin/users", authenticate, authorize("admin"), async (req, res, next) => {
  const { username, password, role, related_id, name } = req.body;
  if (!username?.trim() || !password || !role || !name?.trim()) {
    return res.status(400).json({ error: "用户名、密码、角色和姓名必填" });
  }
  if (!["teacher", "student"].includes(role)) {
    return res.status(400).json({ error: "只能创建教师或学生账号" });
  }
  try {
    const { default: bcrypt } = await import("bcryptjs");
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password_hash, role, related_id, name) VALUES (?, ?, ?, ?, ?)",
      [username.trim(), hash, role, related_id || null, name.trim()]
    );
    res.status(201).json({ id: result.insertId, username: username.trim(), role, related_id, name: name.trim() });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "用户名已存在" });
    next(e);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "接口不存在" });
});

if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "服务器错误" });
});

await initDb();

app.listen(PORT, "0.0.0.0", () => {
  const hasUi = fs.existsSync(path.join(clientDist, "index.html"));
  console.log(`Course management API (MySQL): http://localhost:${PORT}/api/health`);
  if (hasUi) {
    console.log(`Web UI: http://localhost:${PORT}/`);
  } else {
    console.log(
      "未检测到 client/dist。开发：根目录 npm run dev；或 npm run build 后仅启动 API。"
    );
  }
});
