import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Courses from "./pages/Courses.jsx";
import Students from "./pages/Students.jsx";
import Classes from "./pages/Classes.jsx";
import Teachers from "./pages/Teachers.jsx";
import CoursePlanning from "./pages/CoursePlanning.jsx";
import CalendarView from "./pages/CalendarView.jsx";
import AdminApprovals from "./pages/AdminApprovals.jsx";
import TeacherMyPlans from "./pages/TeacherMyPlans.jsx";
import TeacherGrading from "./pages/TeacherGrading.jsx";
import StudentSchedule from "./pages/StudentSchedule.jsx";
import StudentElectives from "./pages/StudentElectives.jsx";
import StudentGrades from "./pages/StudentGrades.jsx";

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-page"><p style={{ color: "var(--muted)" }}>加载中...</p></div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const role = user.role;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">课程管理系统</div>
        <nav>
          {role === "admin" && (
            <>
              <NavLink end to="/">概览</NavLink>
              <NavLink to="/courses">课程管理</NavLink>
              <NavLink to="/students">学生管理</NavLink>
              <NavLink to="/classes">班级管理</NavLink>
              <NavLink to="/teachers">教师管理</NavLink>
              <NavLink to="/planning">课程规划</NavLink>
              <NavLink to="/calendar">课程日历</NavLink>
              <NavLink to="/approvals">审批与用户</NavLink>
            </>
          )}
          {role === "teacher" && (
            <>
              <NavLink end to="/">课程安排</NavLink>
              <NavLink to="/grading">成绩评定</NavLink>
            </>
          )}
          {role === "student" && (
            <>
              <NavLink end to="/">课程表</NavLink>
              <NavLink to="/electives">选选修课</NavLink>
              <NavLink to="/grades">我的成绩</NavLink>
            </>
          )}
        </nav>
        <div style={{
          padding: "1rem 1.25rem", marginTop: "auto", borderTop: "1px solid var(--border)",
          fontSize: "0.82rem", color: "var(--muted)"
        }}>
          {user.name} · {role === "admin" ? "管理员" : role === "teacher" ? "教师" : "学生"}
        </div>
      </aside>
      <main className="main">
        {role === "admin" && <AdminContent />}
        {role === "teacher" && <TeacherContent />}
        {role === "student" && <StudentContent />}
      </main>
    </div>
  );
}

function AdminContent() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/students" element={<Students />} />
      <Route path="/classes" element={<Classes />} />
      <Route path="/teachers" element={<Teachers />} />
      <Route path="/planning" element={<CoursePlanning />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/approvals" element={<AdminApprovals />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TeacherContent() {
  return (
    <Routes>
      <Route path="/" element={<TeacherMyPlans />} />
      <Route path="/grading" element={<TeacherGrading />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function StudentContent() {
  return (
    <Routes>
      <Route path="/" element={<StudentSchedule />} />
      <Route path="/electives" element={<StudentElectives />} />
      <Route path="/grades" element={<StudentGrades />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
