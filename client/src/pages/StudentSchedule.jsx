import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentSchedule() {
  const { user, logout } = useAuth();
  const [schedule, setSchedule] = useState({ required: [], elective: [] });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.student.mySchedule();
      setSchedule(data);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approvalLabel = { pending: "待审批", approved: "已通过", rejected: "已拒绝" };

  return (
    <>
      <div className="top-bar">
        <div>
          <h1 className="page-title">我的课程表</h1>
          <p className="page-desc">{user?.name} 同学，欢迎您</p>
        </div>
        <button className="btn btn-ghost" onClick={logout}>退出登录</button>
      </div>
      {error && <div className="msg msg-error">{error}</div>}

      <div className="card">
        <h2>必修课</h2>
        <ScheduleTable plans={schedule.required} showStatus={false} emptyMsg="暂无必修课安排。" />
      </div>

      <div className="card">
        <h2>选修课</h2>
        <ScheduleTable plans={schedule.elective} showStatus={true} approvalLabel={approvalLabel} emptyMsg="暂无选修课。" />
      </div>
    </>
  );
}

function ScheduleTable({ plans, showStatus, approvalLabel, emptyMsg }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>课程</th>
            <th>教师</th>
            <th>教室</th>
            <th>时间</th>
            <th>学分</th>
            {showStatus && <th>状态</th>}
          </tr>
        </thead>
        <tbody>
          {plans.map((p, i) => (
            <tr key={p.id || i}>
              <td><span className="badge">{p.course_code}</span> {p.course_name}</td>
              <td>{p.teacher_name || "—"}</td>
              <td>{p.room || "—"}</td>
              <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                {p.course_start_date ? new Date(p.course_start_date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                {" ~ "}
                {p.course_end_date ? new Date(p.course_end_date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
              </td>
              <td>{p.credits}</td>
              {showStatus && <td>{approvalLabel?.[p.approval_status] || p.approval_status}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {plans.length === 0 && <p style={{ color: "var(--muted)", padding: "0.5rem 0" }}>{emptyMsg}</p>}
    </div>
  );
}
