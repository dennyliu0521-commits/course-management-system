import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initStore } from "./store.js";
import { teachersRouter } from "./routes/teachers.js";
import { studentsRouter } from "./routes/students.js";
import { coursesRouter } from "./routes/courses.js";
import { coursePlansRouter } from "./routes/coursePlans.js";

initStore();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../../client/dist");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/teachers", teachersRouter);
app.use("/api/students", studentsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/course-plans", coursePlansRouter);

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

app.listen(PORT, "0.0.0.0", () => {
  const hasUi = fs.existsSync(path.join(clientDist, "index.html"));
  console.log(`Course management API: http://localhost:${PORT}/api/health`);
  if (hasUi) {
    console.log(`Web UI: http://localhost:${PORT}/`);
  } else {
    console.log(
      "未检测到 client/dist。开发：根目录 npm run dev；或 npm run build 后仅启动 API。"
    );
  }
});
