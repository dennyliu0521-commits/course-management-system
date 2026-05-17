import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentElectives() {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myElectives, setMyElectives] = useState([]);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [avail, sched] = await Promise.all([
        api.student.availableElectives(),
        api.student.mySchedule(),
      ]);
      setCourses(avail);
      setMyElectives(sched.elective || []);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enrolledPlanIds = new Set(myElectives.map((e) => e.id));

  async function doEnroll(planId) {
    try {
      await api.student.enroll(planId);
      setMsg("选课申请已提交，等待管理员审批");
      setTimeout(() => setMsg(null), 3000);
      await load();
    } catch (e) { setError(e.message); }
  }

  async function doDrop(planId) {
    if (!confirm("确定退选该课程？")) return;
    try {
      await api.student.dropEnroll(planId);
      setMsg("已退选");
      setTimeout(() => setMsg(null), 2000);
      await load();
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <h1 className="page-title">选修课选择</h1>
          <p className="page-desc">{user?.name} 同学</p>
        </div>
        <button className="btn btn-ghost" onClick={logout}>退出登录</button>
      </div>
      {error && <div className="msg msg-error">{error}</div>}
      {msg && <div className="msg msg-success">{msg}</div>}

      <div className="card">
        <h2>可选选修课</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>课程</th>
                <th>教师</th>
                <th>学分</th>
                <th>时间</th>
                <th>已选/容量</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td><span className="badge">{c.course_code}</span> {c.course_name}</td>
                  <td>{c.teacher_name || "—"}</td>
                  <td>{c.credits}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {c.course_start_date ? new Date(c.course_start_date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    {" ~ "}
                    {c.course_end_date ? new Date(c.course_end_date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td>{c.enrolled_count || 0}/{c.capacity}</td>
                  <td>
                    {enrolledPlanIds.has(c.id) ? (
                      <button className="btn btn-danger" onClick={() => doDrop(c.id)}>退选</button>
                    ) : (
                      <button className="btn btn-primary" disabled={c.enrolled_count >= c.capacity} onClick={() => doEnroll(c.id)}>
                        {c.enrolled_count >= c.capacity ? "已满" : "选课"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无可选选修课。</p>}
        </div>
      </div>
    </>
  );
}
