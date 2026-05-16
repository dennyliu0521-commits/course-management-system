import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Courses from "./pages/Courses.jsx";
import Students from "./pages/Students.jsx";
import Teachers from "./pages/Teachers.jsx";
import CoursePlanning from "./pages/CoursePlanning.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">课程管理系统</div>
        <nav>
          <NavLink end to="/" className={({ isActive }) => (isActive ? "active" : "")}>
            概览
          </NavLink>
          <NavLink to="/courses" className={({ isActive }) => (isActive ? "active" : "")}>
            课程管理
          </NavLink>
          <NavLink to="/students" className={({ isActive }) => (isActive ? "active" : "")}>
            学生管理
          </NavLink>
          <NavLink to="/teachers" className={({ isActive }) => (isActive ? "active" : "")}>
            教师管理
          </NavLink>
          <NavLink to="/planning" className={({ isActive }) => (isActive ? "active" : "")}>
            课程规划
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/students" element={<Students />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/planning" element={<CoursePlanning />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
