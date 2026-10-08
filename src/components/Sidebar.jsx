"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  Banknote,
  MessageSquare,
  Library,
  Settings,
  ChevronDown,
  ChevronRight,
  School,
  LogOut,
  Bell,
  UsersIcon,
  Users2,
  UserSquare,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Students",
    icon: Users,
    children: [
      { label: "All Students", href: "/students" },
      { label: "Enroll Student", href: "/students/enroll" },
      { label: "Promotions", href: "/students/promotions" },
      { label: "Alumni", href: "/students/alumni" },
    ],
  },
  {
    label: "Teachers",
    icon: GraduationCap,
    children: [
      { label: "All Teachers", href: "/teachers" },
      { label: "Add Teacher", href: "/teachers/add" },
      { label: "Timetable Assign", href: "/teachers/timetable" },
      { label: "Appraisals", href: "/teachers/appraisals" },
    ],
  },
  {
    label: "Staff",
    icon: UserSquare,
    children: [
      { label: "All Staff", href: "/staff" },
      { label: "Add Staff", href: "/staff/add" },
    ],
  },
  {
    label: "Attendance",
    icon: CalendarCheck,
    children: [
      { label: "Mark Student Attendance", href: "/attendance/students" },
      { label: "Mark Teacher Attendance", href: "/attendance/teachers" },
      { label: "Mark Staff Attendance", href: "/attendance/staff" },
      { label: "Leave Management", href: "/attendance/leaves" },
      { label: "Attendance Reports", href: "/attendance/reports" },
    ],
  },
  {
    label: "Academics",
    icon: BookOpen,
    children: [
      { label: "Classes & Sections", href: "/academics/classes" },
      { label: "Subjects", href: "/academics/subjects" },
      { label: "Timetable", href: "/academics/timetable" },
      { label: "Syllabus", href: "/academics/syllabus" },
      { label: "Homework", href: "/academics/homework" },
    ],
  },
  {
    label: "Exams & Results",
    icon: ClipboardList,
    children: [
      { label: "Exam Schedule", href: "/exams/schedule" },
      { label: "Marks Entry", href: "/exams/marks" },
      { label: "Results", href: "/exams/results" },
      { label: "Report Cards", href: "/exams/report-cards" },
      { label: "Grade Config", href: "/exams/grades" },
    ],
  },
  {
    label: "Finance",
    icon: Banknote,
    children: [
      { label: "Fee Structure", href: "/finance/structure" },
      { label: "Fee Collection", href: "/finance/collection" },
      { label: "Defaulters", href: "/finance/defaulters" },
      { label: "Expenses", href: "/finance/expenses" },
      { label: "Payroll", href: "/finance/payroll" },
      { label: "Reports", href: "/finance/reports" },
    ],
  },
  {
    label: "Communication",
    icon: MessageSquare,
    children: [
      { label: "Notice Board", href: "/communication/notices" },
      { label: "Messages", href: "/communication/messages" },
      { label: "SMS / Email", href: "/communication/bulk" },
      { label: "Parent Portal", href: "/communication/parents" },
    ],
  },
  {
    label: "Library",
    icon: Library,
    children: [
      { label: "Book Catalog", href: "/library/catalog" },
      { label: "Issue & Return", href: "/library/issue" },
      { label: "Members", href: "/library/members" },
      { label: "Fines", href: "/library/fines" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "School Profile", href: "/settings/profile" },
      { label: "User Accounts", href: "/settings/users" },
      { label: "Roles & Permissions", href: "/settings/roles" },
      { label: "Academic Year", href: "/settings/session" },
      { label: "Audit Logs", href: "/settings/logs" },
      { label: "Backup & Security", href: "/settings/backup" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState({ Students: true });
  const [collapsed, setCollapsed] = useState(false);

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isChildActive = (children) =>
    children?.some((c) => pathname === c.href);

  return (
    <aside
      className={`flex flex-col h-screen bg-[#0f1117] border-r border-white/[0.06] transition-all duration-300 ${
        collapsed ? "w-[64px]" : "w-[240px]"
      }`}
      style={{ minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <School size={16} color="white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white text-[13px] font-semibold leading-tight truncate">
              Al-Noor School
            </p>
            <p className="text-white/40 text-[10px] leading-tight">
              Management System
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-white/30 hover:text-white/60 transition-colors shrink-0"
        >
          <ChevronRight
            size={14}
            className={`transition-transform duration-300 ${
              collapsed ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus[item.label];
          const childActive = hasChildren && isChildActive(item.children);

          if (!hasChildren) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                }`}
                title={collapsed ? item.label : ""}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => !collapsed && toggleMenu(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  childActive
                    ? "text-white bg-white/[0.06]"
                    : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                }`}
                title={collapsed ? item.label : ""}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {item.label}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {/* Submenu */}
              {!collapsed && isOpen && (
                <div className="mt-0.5 ml-3 pl-4 border-l border-white/[0.08] space-y-0.5 pb-1">
                  {item.children.map((child) => {
                    const childIsActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-all duration-150 ${
                          childIsActive
                            ? "text-indigo-400 font-medium bg-indigo-500/10"
                            : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full shrink-0 ${
                            childIsActive ? "bg-indigo-400" : "bg-white/20"
                          }`}
                        />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-semibold">AD</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-[12px] font-medium truncate">
                Admin User
              </p>
              <p className="text-white/35 text-[10px] truncate">
                Administrator
              </p>
            </div>
            <button className="text-white/30 hover:text-white/70 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-[11px] font-semibold">AD</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}