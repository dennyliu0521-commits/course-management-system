import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function TeacherMyPlans() {
  const { user, logout } = useAuth();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.teacher.myPlans();
      setPlans(data);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatus(id, status) {
    try {
      await api.teacher.planStatus(id, status);
      await load();
    } catch (e) { setError(e.message); }
  }

  const statusLabel = { pending: "待确认", approved: "已接受", rejected: "已拒绝" };
  const statusColor = { pending: "var(--accent)", approved: "var(--success)", rejected: "var(--danger)" };

  return (
    <>
      <div className="top-bar">
        <div>
          <h1 className="page-title">我的课程安排</h1>
          <p className="page-desc">{user?.name} 老师，欢迎您</p>
        </div>
        <button className="btn btn-ghost" onClick={logout}>退出登录</button>
      </div>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="card">
        <h2>课程列表</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>学年学期</th>
                <th>课程</th>
                <th>类型</th>
                <th>班级</th>
                <th>教室</th>
                <th>时间</th>
                <th>状态</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.academic_year} · {p.semester}</td>
                  <td><span className="badge">{p.course_code}</span> {p.course_name}</td>
                  <td>{p.course_type || "必修"}</td>
                  <td style={{ fontSize: "0.82rem" }}>{p.class_codes || "—"}</td>
                  <td>{p.room || "—"}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {p.course_start_date ? new Date(p.course_start_date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    {" ~ "}
                    {p.course_end_date ? new Date(p.course_end_date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td style={{ color: statusColor[p.status] || "var(--muted)", fontWeight: 600 }}>
                    {statusLabel[p.status] || p.status}
                  </td>
                  <td>
                    {p.status === "pending" && (
                      <div className="btn-row">
                        <button className="btn btn-primary" onClick={() => handleStatus(p.id, "approved")}>接受</button>
                        <button className="btn btn-danger" onClick={() => handleStatus(p.id, "rejected")}>拒绝</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length === 0 && <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无被分配的课程。</p>}
        </div>
      </div>
    </>
  );
}
