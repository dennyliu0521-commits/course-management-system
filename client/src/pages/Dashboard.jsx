import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Dashboard() {
  const [counts, setCounts] = useState({ courses: 0, students: 0, teachers: 0, plans: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [courses, students, teachers, plans] = await Promise.all([
          api.courses.list(),
          api.students.list(),
          api.teachers.list(),
          api.coursePlans.list(),
        ]);
        if (!cancelled) {
          setCounts({
            courses: courses.length,
            students: students.length,
            teachers: teachers.length,
            plans: plans.length,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className="page-title">概览</h1>
      <p className="page-desc">统一管理课程、学生、教师与学期开课计划。</p>
      {error && <div className="msg msg-error">{error}</div>}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="num">{counts.courses}</div>
          <div className="lbl">
            <Link to="/courses">课程</Link>
          </div>
        </div>
        <div className="stat-card">
          <div className="num">{counts.students}</div>
          <div className="lbl">
            <Link to="/students">学生</Link>
          </div>
        </div>
        <div className="stat-card">
          <div className="num">{counts.teachers}</div>
          <div className="lbl">
            <Link to="/teachers">教师</Link>
          </div>
        </div>
        <div className="stat-card">
          <div className="num">{counts.plans}</div>
          <div className="lbl">
            <Link to="/planning">开课计划</Link>
          </div>
        </div>
      </div>
    </>
  );
}
