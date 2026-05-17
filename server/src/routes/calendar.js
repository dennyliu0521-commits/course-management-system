import { Router } from "express";
import { pool } from "../db.js";

export const calendarRouter = Router();

// GET /api/calendar/weekly?date=2024-09-15
// Returns course plans overlapping the week containing the given date
calendarRouter.get("/weekly", async (req, res, next) => {
  try {
    const dateStr = req.query.date;
    if (!dateStr) return res.status(400).json({ error: "请提供日期参数 date" });

    const input = new Date(dateStr);
    if (isNaN(input.getTime())) return res.status(400).json({ error: "日期格式无效" });

    // Calculate week boundaries (Monday 00:00 to Sunday 23:59 in local time)
    const dayOfWeek = input.getDay(); // 0=Sun, 1=Mon, ...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(input);
    monday.setDate(input.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [rows] = await pool.query(
      `SELECT cp.*,
        c.code AS course_code, c.name AS course_name, c.credits,
        t.name AS teacher_name, t.department AS teacher_department
       FROM course_plans cp
       JOIN courses c ON c.id = cp.course_id
       LEFT JOIN teachers t ON t.id = cp.teacher_id
       WHERE cp.course_start_date IS NOT NULL
         AND cp.course_end_date IS NOT NULL
         AND cp.course_start_date <= ?
         AND cp.course_end_date >= ?
       ORDER BY cp.course_start_date, cp.course_start_date`,
      [sunday, monday]
    );

    // Fetch enrollments for each plan
    const withEnrollments = await Promise.all(
      rows.map(async (plan) => {
        const [enrollments] = await pool.query(
          `SELECT e.id, s.id AS student_id, s.name AS student_name, s.student_no, s.major
           FROM enrollments e
           JOIN students s ON s.id = e.student_id
           WHERE e.course_plan_id = ?
           ORDER BY s.student_no`,
          [plan.id]
        );
        return { ...plan, enrollments };
      })
    );

    res.json({
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString(),
      plans: withEnrollments,
    });
  } catch (e) {
    next(e);
  }
});
