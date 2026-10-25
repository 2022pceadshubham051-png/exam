import { NavLink } from "react-router-dom";
const TABS = [["/admin/courses", "Courses"], ["/admin/course-stats", "Dashboard"], ["/admin/students", "Students"], ["/admin/coupons", "Coupons"]] as const;
/** Tab strip shared by the admin course screens. */
export default function AdminCourseNav() {
  return <nav className="seg subnav" aria-label="Course admin">{TABS.map(([to, label]) => <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "on" : "")}>{label}</NavLink>)}</nav>;
}
