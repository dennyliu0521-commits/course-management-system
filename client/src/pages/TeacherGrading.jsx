import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function TeacherGrading() {
  const { user, logout } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState(null);

  const loadPlans = useCallback(async () => {
    setError(null);
    try {
      const data = await api.teacher.myPlans();
      setPlans(data);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  async function selectPlan(plan) {
    setSelectedPlan(plan);
    try {
      const data = await api.teacher.planStudents(plan.id);
      setStudents(data);
    } catch (e) { setError(e.message); }
  }

  async function saveGrade(student, score, comment) {
    try {
      await api.teacher.saveGrade({
        student_id: student.student_id,
        course_plan_id: selectedPlan.id,
        score: score || null,
        comment: comment || null,
      });
      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.student_id === student.student_id ? { ...s, score, comment, grade_id: s.grade_id || Date.now() } : s
        )
      );
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <h1 className="page-title">学生成绩评定</h1>
          <p className="page-desc">{user?.name} 老师</p>
        </div>
        <button className="btn btn-ghost" onClick={logout}>退出登录</button>
      </div>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="split">
        <div className="card">
          <h2>我的课程</h2>
          {plans.map((p) => (
            <div
              key={p.id}
              className="class-check-label"
              style={{ marginBottom: "0.5rem", padding: "0.6rem 0.8rem" }}
              onClick={() => selectPlan(p)}
            >
              <span className="badge">{p.course_code}</span>
              <span>{p.course_name}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: "auto" }}>
                {p.class_codes || ""}
              </span>
            </div>
          ))}
          {plans.length === 0 && <p style={{ color: "var(--muted)" }}>暂无课程。</p>}
        </div>
        <div className="card">
          <h2>{selectedPlan ? `${selectedPlan.course_code} ${selectedPlan.course_name} - 评分` : "请选择课程"}</h2>
          {!selectedPlan ? (
            <p style={{ color: "var(--muted)" }}>请从左侧选择一门课程进行评分。</p>
          ) : students.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>该课程暂无选课学生。</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>学号</th>
                    <th>姓名</th>
                    <th>班级</th>
                    <th>成绩</th>
                    <th>评语</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <GradeRow key={s.student_id} student={s} onSave={saveGrade} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function GradeRow({ student, onSave }) {
  const [score, setScore] = useState(student.score ?? "");
  const [comment, setComment] = useState(student.comment ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(student, score, comment);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <tr>
      <td>{student.student_no}</td>
      <td>{student.student_name}</td>
      <td style={{ fontSize: "0.82rem" }}>{student.class_code || "—"}</td>
      <td>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          style={{ width: "80px" }}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="0-100"
        />
      </td>
      <td>
        <input
          style={{ width: "180px" }}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="评语"
        />
      </td>
      <td>
        <button className={`btn ${saved ? "btn-primary" : "btn-ghost"}`} onClick={handleSave}>
          {saved ? "已保存" : "保存"}
        </button>
      </td>
    </tr>
  );
}
