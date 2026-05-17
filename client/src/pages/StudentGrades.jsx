import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentGrades() {
  const { user, logout } = useAuth();
  const [grades, setGrades] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.student.myGrades();
      setGrades(data);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="top-bar">
        <div>
          <h1 className="page-title">我的成绩</h1>
          <p className="page-desc">{user?.name} 同学</p>
        </div>
        <button className="btn btn-ghost" onClick={logout}>退出登录</button>
      </div>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="card">
        <h2>课程成绩</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>课程</th>
                <th>学分</th>
                <th>教师</th>
                <th>成绩</th>
                <th>评语</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={g.id || i}>
                  <td><span className="badge">{g.course_code}</span> {g.course_name}</td>
                  <td>{g.credits}</td>
                  <td>{g.teacher_name || "—"}</td>
                  <td style={{ fontWeight: 700, color: g.score != null ? "var(--accent)" : "var(--muted)" }}>
                    {g.score != null ? g.score : "—"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{g.comment || "—"}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {g.created_at ? new Date(g.created_at).toLocaleDateString("zh-CN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {grades.length === 0 && <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>暂无成绩记录。</p>}
        </div>
      </div>
    </>
  );
}
