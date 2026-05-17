import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDay(date) {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[date.getDay()];
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);
  const y = monday.getFullYear();
  const m = monday.getMonth() + 1;
  const d1 = monday.getDate();
  const d2 = sunday.getDate();
  const ms = sunday.getMonth() + 1;
  if (m === ms) return `${y}年${m}月${d1}日 - ${d2}日`;
  return `${y}年${m}月${d1}日 - ${ms}月${d2}日`;
}

function getPlansForDay(plans, dayDate) {
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);
  return plans.filter((p) => {
    if (!p.course_start_date || !p.course_end_date) return false;
    const start = new Date(p.course_start_date);
    const end = new Date(p.course_end_date);
    return start <= dayEnd && end >= dayStart;
  });
}

export default function CalendarView() {
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [data, setData] = useState(null);
  const [viewMode, setViewMode] = useState("teacher"); // teacher | course | student
  const [error, setError] = useState(null);

  const loadWeek = useCallback(async (m) => {
    setError(null);
    try {
      const result = await api.calendar.weekly(m.toISOString().slice(0, 10));
      setData(result);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadWeek(monday);
  }, [monday, loadWeek]);

  const plans = data?.plans || [];
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  function prevWeek() {
    setMonday((m) => addDays(m, -7));
  }
  function nextWeek() {
    setMonday((m) => addDays(m, 7));
  }
  function goThisWeek() {
    setMonday(getMonday(new Date()));
  }

  // --- Build views ---

  const teacherPlans = useMemo(() => {
    const map = {};
    plans.forEach((p) => {
      const key = p.teacher_name || "未指定教师";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "zh"));
  }, [plans]);

  const coursePlansSorted = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.course_start_date < b.course_start_date) return -1;
      if (a.course_start_date > b.course_start_date) return 1;
      return 0;
    });
  }, [plans]);

  const studentPlans = useMemo(() => {
    const map = {};
    plans.forEach((p) => {
      (p.enrollments || []).forEach((e) => {
        const key = `${e.student_name} (${e.student_no})`;
        if (!map[key]) map[key] = [];
        map[key].push({ ...p, enrollmentId: e.id });
      });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "zh"));
  }, [plans]);

  return (
    <>
      <h1 className="page-title">课程日历</h1>
      <p className="page-desc">以周为单位查看课程安排，可按教师、课程、学生三个维度查看。</p>

      {error && <div className="msg msg-error">{error}</div>}

      {/* Week Navigator */}
      <div className="week-nav">
        <div className="week-nav-inner">
          <button className="btn btn-ghost" onClick={prevWeek}>
            ← 上一周
          </button>
          <span className="week-label">{formatWeekRange(monday)}</span>
          <button className="btn btn-ghost" onClick={nextWeek}>
            下一周 →
          </button>
          <button className="btn btn-primary" onClick={goThisWeek}>
            本周
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="tab-bar">
        <button
          className={`tab ${viewMode === "teacher" ? "tab-active" : ""}`}
          onClick={() => setViewMode("teacher")}
        >
          按教师
        </button>
        <button
          className={`tab ${viewMode === "course" ? "tab-active" : ""}`}
          onClick={() => setViewMode("course")}
        >
          按课程
        </button>
        <button
          className={`tab ${viewMode === "student" ? "tab-active" : ""}`}
          onClick={() => setViewMode("student")}
        >
          按学生
        </button>
      </div>

      {/* Day headers */}
      <div className="week-header">
        {weekDays.map((d) => (
          <div key={d.toISOString()} className="week-header-cell">
            <div className="week-day">{formatDay(d)}</div>
            <div className="week-date">{formatDate(d)}</div>
          </div>
        ))}
      </div>

      {/* Teacher View */}
      {viewMode === "teacher" && (
        <div className="cal-section">
          {teacherPlans.length === 0 && (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
              本周暂无课程安排。
            </p>
          )}
          {teacherPlans.map(([teacher, tPlans]) => (
            <div key={teacher} className="cal-group">
              <h3 className="cal-group-title">
                {teacher}
                {tPlans[0]?.teacher_department ? ` · ${tPlans[0].teacher_department}` : ""}
              </h3>
              <div className="week-grid">
                {weekDays.map((day) => {
                  const dayPlans = getPlansForDay(tPlans, day);
                  return (
                    <div key={day.toISOString()} className="day-cell">
                      {dayPlans.map((p) => (
                        <div key={p.id} className="cal-card">
                          <div className="cal-time">
                            {new Date(p.course_start_date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-
                            {new Date(p.course_end_date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="cal-course">
                            <span className="badge">{p.course_code}</span> {p.course_name}
                          </div>
                          {p.room && <div className="cal-room">📍 {p.room}</div>}
                          <div className="cal-enrollment">{p.enrollments?.length || 0}人选修</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course View */}
      {viewMode === "course" && (
        <div className="cal-section">
          {coursePlansSorted.length === 0 && (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
              本周暂无课程安排。
            </p>
          )}
          <div className="week-grid">
            {weekDays.map((day) => {
              const dayPlans = getPlansForDay(coursePlansSorted, day);
              return (
                <div key={day.toISOString()} className="day-cell">
                  {dayPlans.map((p) => (
                    <div key={p.id} className="cal-card">
                      <div className="cal-time">
                        {new Date(p.course_start_date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-
                        {new Date(p.course_end_date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="cal-course">
                        <span className="badge">{p.course_code}</span> {p.course_name}
                      </div>
                      <div className="cal-meta">
                        {p.teacher_name || "未指定"} {p.room ? `· ${p.room}` : ""}
                      </div>
                      <div className="cal-enrollment">{p.enrollments?.length || 0}人选修</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student View */}
      {viewMode === "student" && (
        <div className="cal-section">
          {studentPlans.length === 0 && (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
              本周暂无选课记录。
            </p>
          )}
          {studentPlans.map(([student, sPlans]) => (
            <div key={student} className="cal-group">
              <h3 className="cal-group-title">{student}</h3>
              <div className="week-grid">
                {weekDays.map((day) => {
                  const dayPlans = getPlansForDay(sPlans, day);
                  return (
                    <div key={day.toISOString()} className="day-cell">
                      {dayPlans.map((p) => (
                        <div key={p.id} className="cal-card">
                          <div className="cal-time">
                            {new Date(p.course_start_date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-
                            {new Date(p.course_end_date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="cal-course">
                            <span className="badge">{p.course_code}</span> {p.course_name}
                          </div>
                          <div className="cal-meta">
                            {p.teacher_name || "未指定"} {p.room ? `· ${p.room}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
