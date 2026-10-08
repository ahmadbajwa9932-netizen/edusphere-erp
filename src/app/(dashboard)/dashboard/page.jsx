"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { dashboardApi as fetchDashboard } from "../../../lib/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, GraduationCap, UserSquare, Wallet,
  TrendingDown, AlertCircle, CalendarCheck, BookOpen,
  ClipboardList, Library, Banknote, Receipt,
  ArrowUpRight, ArrowDownRight, ChevronRight, Clock,
  CheckCircle2, BookMarked, Bell, UserCheck, Activity,
  BarChart2, BookMarked as BookIcon,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtPKR = (n) =>
  `PKR ${Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
const fmt    = (n) => Number(n || 0).toLocaleString("en-PK");
const fmtShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short" }) : "—";
const fmtLong = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── small components ──────────────────────────────────────────────────────────
const Badge = ({ children, color = "gray" }) => {
  const map = {
    gray:   "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald:"bg-emerald-50 text-emerald-700",
    amber:  "bg-amber-50 text-amber-700",
    rose:   "bg-rose-50 text-rose-700",
    purple: "bg-purple-50 text-purple-700",
    sky:    "bg-sky-50 text-sky-700",
    orange: "bg-orange-50 text-orange-700",
    red:    "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${map[color] || map.gray}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 ${className}`}>{children}</div>
);

const CardHeader = ({ title, icon: Icon, accent = "indigo", href, linkLabel, right }) => {
  const accentMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald:"bg-emerald-50 text-emerald-600",
    rose:   "bg-rose-50 text-rose-600",
    amber:  "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    sky:    "bg-sky-50 text-sky-600",
  };
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          <Icon size={14} />
        </div>
        <p className="text-[13px] font-semibold text-gray-800">{title}</p>
      </div>
      {right || (href && (
        <Link href={href} className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
          {linkLabel || "View all"} <ChevronRight size={12} />
        </Link>
      ))}
    </div>
  );
};

const MiniKpi = ({ label, value, sub, color = "text-gray-800", bg = "bg-gray-50" }) => (
  <div className={`${bg} rounded-xl px-4 py-3`}>
    <p className="text-[10px] text-gray-400 font-medium mb-1">{label}</p>
    <p className={`text-[17px] font-bold leading-tight ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const ProgressBar = ({ pct, color = "bg-indigo-500", height = "h-2" }) => (
  <div className={`${height} bg-gray-100 rounded-full overflow-hidden`}>
    <div className={`h-full rounded-full ${color} transition-all duration-700`}
      style={{ width: `${Math.min(Number(pct) || 0, 100)}%` }} />
  </div>
);

// Donut ring (SVG)
const DonutRing = ({ pct, size = 80, stroke = 8, color = "#6366f1", label, sublabel }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = ((pct || 0) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[13px] font-bold text-gray-800">{pct ?? "—"}%</span>
        </div>
      </div>
      {label && <span className="text-[11px] font-semibold text-gray-600">{label}</span>}
      {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
    </div>
  );
};

// Custom chart tooltip
const ChartTip = ({ active, payload, label, money }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-[11px]">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {money ? fmtPKR(p.value) : fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

// Tab constants
const TABS = [
  { key: "overview",   label: "Overview",    icon: BarChart2    },
  { key: "attendance", label: "Attendance",  icon: CalendarCheck },
  { key: "finance",    label: "Finance",     icon: Banknote     },
  { key: "academics",  label: "Academics",   icon: BookOpen     },
  { key: "library",    label: "Library",     icon: Library      },
  { key: "activity",   label: "Activity",    icon: Activity     },
];

const LEAVE_COLOR  = { SICK:"rose", CASUAL:"sky", EMERGENCY:"orange", MATERNITY:"purple", PATERNITY:"indigo", UNPAID:"gray", OTHER:"gray" };
const EXAM_COLOR   = { MIDTERM:"indigo", FINAL:"rose", UNIT_TEST:"amber", QUIZ:"emerald", PRACTICAL:"purple", MOCK:"sky" };
const PRIORITY_COLOR = { LOW:"emerald", NORMAL:"sky", HIGH:"amber", URGENT:"rose" };

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  fetchDashboard.get,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-gray-400">Loading dashboard…</p>
      </div>
    </div>
  );

  const {
    students = {}, teachers = {}, staff = {}, totalClasses = 0,
    attendance = {}, weeklyAttendance = [],
    finance = {}, pendingLeaves = 0,
    recentLeaves = [], upcomingExams = [], recentAdmissions = [],
    recentNotices = [], library = {}, academics = {},
  } = data || {};

  const today = new Date().toLocaleDateString("en-PK", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── TABS ──────────────────────────────────────────────────────────────────

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-4">
      {/* Summary cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Finance net */}
        <div className={`rounded-2xl p-4 border ${finance.netBalance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${finance.netBalance >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
              <Wallet size={16} />
            </div>
            {finance.netBalance >= 0 ? <ArrowUpRight size={15} className="text-emerald-500" /> : <ArrowDownRight size={15} className="text-red-500" />}
          </div>
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Net Balance</p>
          <p className={`text-[20px] font-bold leading-tight ${finance.netBalance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {fmtPKR(Math.abs(finance.netBalance))}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{finance.netBalance >= 0 ? "Surplus" : "Deficit"} this month</p>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Users size={16} /></div>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{totalClasses} classes</span>
          </div>
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Active Students</p>
          <p className="text-[20px] font-bold text-indigo-700 leading-tight">{fmt(students.active)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{fmt(students.newThisMonth)} new this month</p>
        </div>

        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><GraduationCap size={16} /></div>
          </div>
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Teachers + Staff</p>
          <p className="text-[20px] font-bold text-purple-700 leading-tight">{fmt(teachers.active + staff.active)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{fmt(teachers.active)} teachers · {fmt(staff.active)} staff</p>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertCircle size={16} /></div>
          </div>
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Alerts</p>
          <p className="text-[20px] font-bold text-amber-700 leading-tight">{fmt(finance.defaultersCount + pendingLeaves)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{fmt(finance.defaultersCount)} defaulters · {fmt(pendingLeaves)} leaves</p>
        </div>
      </div>

      {/* Overview grid: attendance rings + fee trend + syllabus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Today's Attendance Rings */}
        <Card>
          <CardHeader title="Today's Attendance" icon={CalendarCheck} accent="indigo" href="/attendance/students" />
          <div className="p-5">
            <div className="flex justify-around mb-4">
              <DonutRing pct={attendance.students?.presentPct} color="#6366f1" label="Students" sublabel={`${fmt(attendance.students?.PRESENT || 0)} present`} />
              <DonutRing pct={attendance.teachers?.presentPct} color="#10b981" label="Teachers" sublabel={`${fmt(attendance.teachers?.PRESENT || 0)} present`} />
              <DonutRing pct={attendance.staff?.presentPct}    color="#f59e0b" label="Staff"    sublabel={`${fmt(attendance.staff?.PRESENT    || 0)} present`} />
            </div>
            {(attendance.students?.total === 0 && attendance.teachers?.total === 0) && (
              <p className="text-[12px] text-gray-400 text-center py-2">No attendance marked today</p>
            )}
          </div>
        </Card>

        {/* Monthly Fee Trend */}
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly Fee Collection" icon={Receipt} accent="indigo" href="/finance/reports" />
          <div className="p-5">
            {(finance.monthlyFeeTrend || []).length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[13px] text-gray-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={finance.monthlyFeeTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="dueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e5e7eb" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTip money />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area type="monotone" dataKey="Due"       name="Due"       stroke="#e5e7eb" strokeWidth={2} fill="url(#dueGrad)"  dot={false} />
                  <Area type="monotone" dataKey="Collected" name="Collected" stroke="#6366f1" strokeWidth={2} fill="url(#colGrad)" dot={{ r: 3, fill: "#6366f1" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Overview row 2: syllabus + library + payroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Syllabus progress */}
        <Card>
          <CardHeader title="Syllabus Progress" icon={BookOpen} accent="emerald" href="/academics/syllabus" />
          <div className="p-5 flex flex-col items-center gap-3">
            <DonutRing pct={academics.syllabusCompletionPct} size={100} stroke={10} color="#10b981" label="Complete" />
            <div className="w-full space-y-2 mt-1">
              {[
                { label: "Completed",   val: academics.completedSyllabus,   color: "bg-emerald-500" },
                { label: "In Progress", val: academics.inProgressSyllabus,  color: "bg-indigo-500"  },
                { label: "Planned",     val: academics.plannedSyllabus,     color: "bg-gray-200"    },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-2 text-[11px] text-gray-500">
                  <div className={`w-2.5 h-2.5 rounded-sm ${color} shrink-0`} />
                  <span className="flex-1">{label}</span>
                  <span className="font-semibold text-gray-700">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Library snapshot */}
        <Card>
          <CardHeader title="Library" icon={Library} accent="sky" href="/library/catalog" />
          <div className="p-5">
            <div className="flex justify-center mb-4">
              {(library.booksChart || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={library.booksChart} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={50} innerRadius={28} paddingAngle={3}>
                      {(library.booksChart || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[12px] text-gray-400 py-6">No data</p>
              )}
            </div>
            <div className="space-y-1.5">
              {(library.booksChart || []).map((b) => (
                <div key={b.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-gray-500">{b.name}</span>
                  </div>
                  <span className="font-semibold text-gray-700">{fmt(b.value)}</span>
                </div>
              ))}
              {library.unpaidFines > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between text-[11px]">
                  <span className="text-orange-600 font-medium">Unpaid fines</span>
                  <span className="font-bold text-orange-700">{fmtPKR(library.unpaidFines)}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Payroll bar */}
        <Card>
          <CardHeader title="Payroll — This Month" icon={Banknote} accent="purple" href="/finance/payroll" />
          <div className="p-5">
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Paid</span>
                  <span className="font-semibold text-purple-700">{fmtPKR(finance.payrollPaid)}</span>
                </div>
                <ProgressBar
                  pct={((finance.payrollPaid || 0) / Math.max((finance.payrollPaid || 0) + (finance.payrollPending || 0), 1)) * 100}
                  color="bg-purple-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Pending</span>
                  <span className="font-semibold text-amber-600">{fmtPKR(finance.payrollPending)}</span>
                </div>
                <ProgressBar
                  pct={((finance.payrollPending || 0) / Math.max((finance.payrollPaid || 0) + (finance.payrollPending || 0), 1)) * 100}
                  color="bg-amber-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniKpi label="Paid Records"    value={fmt(finance.payrollPaidCount)}    color="text-purple-700" bg="bg-purple-50" />
              <MiniKpi label="Pending Records" value={fmt(finance.payrollPendingCount)} color="text-amber-700"  bg="bg-amber-50"  />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // ── ATTENDANCE TAB ───────────────────────────────────────────────────────────
  const AttendanceTab = () => {
    const groups = [
      { key: "students", label: "Students", color: "#6366f1", data: attendance.students, href: "/attendance/students" },
      { key: "teachers", label: "Teachers", color: "#10b981", data: attendance.teachers, href: "/attendance/teachers" },
      { key: "staff",    label: "Staff",    color: "#f59e0b", data: attendance.staff,    href: "/attendance/staff"    },
    ];

    const barData = groups.map(({ label, data }) => ({
      name:    label,
      Present: (data?.PRESENT || 0) + (data?.LATE || 0),
      Absent:  data?.ABSENT || 0,
      Leave:   data?.LEAVE  || 0,
    }));

    return (
      <div className="space-y-4">
        {/* Three ring stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {groups.map(({ label, color, data, href }) => (
            <Card key={label}>
              <CardHeader title={`${label} — Today`} icon={CalendarCheck} accent="indigo" href={href} />
              <div className="p-5">
                <div className="flex items-center gap-6 mb-4">
                  <DonutRing pct={data?.presentPct} size={90} stroke={9} color={color} />
                  <div className="space-y-1.5 flex-1">
                    {[
                      { s: "PRESENT", label: "Present", c: "bg-emerald-400" },
                      { s: "ABSENT",  label: "Absent",  c: "bg-red-400"     },
                      { s: "LATE",    label: "Late",     c: "bg-amber-400"   },
                      { s: "LEAVE",   label: "Leave",    c: "bg-gray-300"    },
                    ].map(({ s, label: l, c }) => (
                      <div key={s} className="flex items-center gap-2 text-[11px]">
                        <div className={`w-2 h-2 rounded-full ${c} shrink-0`} />
                        <span className="text-gray-500 flex-1">{l}</span>
                        <span className="font-semibold text-gray-700">{fmt(data?.[s] || 0)}</span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-gray-50 flex justify-between text-[11px]">
                      <span className="text-gray-400">Total</span>
                      <span className="font-bold text-gray-700">{fmt(data?.total || 0)}</span>
                    </div>
                  </div>
                </div>
                {data?.total === 0 && (
                  <p className="text-[12px] text-gray-400 text-center">Not marked today</p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Bar comparison */}
        <Card>
          <CardHeader title="Today's Breakdown — All Groups" icon={BarChart2} accent="indigo" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Present" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent"  fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Leave"   fill="#d1d5db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 7-day student trend */}
        <Card>
          <CardHeader title="Student Attendance — Last 7 Days" icon={Activity} accent="indigo" />
          <div className="p-5">
            {weeklyAttendance.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[13px] text-gray-400">No data for past 7 days</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyAttendance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line type="monotone" dataKey="Present" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
                  <Line type="monotone" dataKey="Absent"  stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: "#f43f5e" }} />
                  <Line type="monotone" dataKey="Leave"   stroke="#d1d5db" strokeWidth={2} dot={{ r: 3, fill: "#d1d5db" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ── FINANCE TAB ──────────────────────────────────────────────────────────────
  const FinanceTab = () => (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi label="Fee Collected"   value={fmtPKR(finance.feeCollected)}   color="text-indigo-700" bg="bg-indigo-50"
          sub={`${finance.collectionRate}% collection rate`} />
        <MiniKpi label="Fee Pending"     value={fmtPKR(finance.feePending)}     color="text-amber-700"  bg="bg-amber-50"
          sub={`${fmt(finance.defaultersCount)} defaulters`} />
        <MiniKpi label="Fee Overdue"     value={fmtPKR(finance.feeOverdue)}     color="text-red-600"    bg="bg-red-50" />
        <MiniKpi label="Total Expenses"  value={fmtPKR(finance.totalExpenses)}  color="text-rose-700"   bg="bg-rose-50"
          sub="payroll + operating" />
      </div>

      {/* Pie + Bar row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fee status pie */}
        <Card>
          <CardHeader title="Fee Status Breakdown" icon={Receipt} accent="indigo" href="/finance/collection" />
          <div className="p-5">
            {(finance.feeStatusChart || []).length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[13px] text-gray-400">No fee data this month</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={finance.feeStatusChart} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={3}>
                      {(finance.feeStatusChart || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtPKR(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(finance.feeStatusChart || []).map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-500 flex-1">{s.name}</span>
                      <span className="font-semibold text-gray-700">{fmtPKR(s.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Expense breakdown bar */}
        <Card>
          <CardHeader title="Expense Breakdown" icon={TrendingDown} accent="rose" href="/finance/expenses" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={finance.expenseBreakdown || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                <Tooltip content={<ChartTip money />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="paid"    name="Paid"    fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <MiniKpi label="Operating (paid)"    value={fmtPKR(finance.expensesPaid)}    color="text-indigo-700" bg="bg-indigo-50" />
              <MiniKpi label="Operating (pending)" value={fmtPKR(finance.expensesPending)} color="text-amber-700"  bg="bg-amber-50" />
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly trend line */}
      <Card>
        <CardHeader title="6-Month Fee Collection Trend" icon={Activity} accent="indigo" href="/finance/reports" />
        <div className="p-5">
          {(finance.monthlyFeeTrend || []).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[13px] text-gray-400">No monthly data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={finance.monthlyFeeTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                <Tooltip content={<ChartTip money />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Due"       name="Due"       fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" name="Collected" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Payroll status */}
      <Card>
        <CardHeader title="Payroll — This Month" icon={Banknote} accent="purple" href="/finance/payroll" />
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <MiniKpi label="Paid"          value={fmtPKR(finance.payrollPaid)}      color="text-purple-700" bg="bg-purple-50" sub={`${fmt(finance.payrollPaidCount)} records`} />
            <MiniKpi label="Pending"       value={fmtPKR(finance.payrollPending)}   color="text-amber-700"  bg="bg-amber-50"  sub={`${fmt(finance.payrollPendingCount)} records`} />
            <MiniKpi label="Net Balance"   value={fmtPKR(finance.netBalance)}       color={finance.netBalance >= 0 ? "text-emerald-700" : "text-red-600"} bg={finance.netBalance >= 0 ? "bg-emerald-50" : "bg-red-50"} />
            <MiniKpi label="Fee Due Total" value={fmtPKR(finance.feeDue)}           color="text-gray-700"   bg="bg-gray-50" />
          </div>
          {/* stacked payroll bar */}
          <div>
            <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
              <span>Payroll Payment Status</span>
              <span className="font-semibold text-purple-600">
                {Math.round(((finance.payrollPaid || 0) / Math.max((finance.payrollPaid || 0) + (finance.payrollPending || 0), 1)) * 100)}% paid
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-purple-500 rounded-l-full transition-all duration-700"
                style={{ width: `${Math.round(((finance.payrollPaid || 0) / Math.max((finance.payrollPaid || 0) + (finance.payrollPending || 0), 1)) * 100)}%` }} />
              <div className="h-full bg-amber-400 transition-all duration-700"
                style={{ width: `${Math.round(((finance.payrollPending || 0) / Math.max((finance.payrollPaid || 0) + (finance.payrollPending || 0), 1)) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Paid: {fmtPKR(finance.payrollPaid)}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pending: {fmtPKR(finance.payrollPending)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  // ── ACADEMICS TAB ────────────────────────────────────────────────────────────
  const AcademicsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi label="Total Topics"      value={fmt(academics.totalSyllabus)}     color="text-gray-800"   bg="bg-gray-50" />
        <MiniKpi label="Completed"         value={fmt(academics.completedSyllabus)} color="text-emerald-700" bg="bg-emerald-50" />
        <MiniKpi label="In Progress"       value={fmt(academics.inProgressSyllabus)} color="text-indigo-700" bg="bg-indigo-50" />
        <MiniKpi label="Completion"        value={`${academics.syllabusCompletionPct}%`} color="text-purple-700" bg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Syllabus pie */}
        <Card>
          <CardHeader title="Syllabus Status" icon={BookOpen} accent="emerald" href="/academics/syllabus" />
          <div className="p-5">
            {(academics.syllabusChart || []).length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[13px] text-gray-400">No syllabus data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={academics.syllabusChart} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={3}>
                      {(academics.syllabusChart || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {(academics.syllabusChart || []).map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-500 flex-1">{s.name}</span>
                      <span className="font-semibold text-gray-700">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Exam status */}
        <Card>
          <CardHeader title="Exam Status" icon={ClipboardList} accent="rose" href="/exams/schedule" />
          <div className="p-5">
            {(academics.examStatusChart || []).length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[13px] text-gray-400">No exam data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={academics.examStatusChart} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={3}>
                      {(academics.examStatusChart || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {(academics.examStatusChart || []).map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-500 flex-1">{s.name}</span>
                      <span className="font-semibold text-gray-700">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Upcoming exams list */}
      <Card>
        <CardHeader title="Upcoming Exams" icon={ClipboardList} accent="indigo" href="/exams/schedule" />
        <div className="p-5">
          {upcomingExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <CheckCircle2 size={28} className="opacity-40" />
              <p className="text-[13px]">No upcoming exams scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingExams.map((e) => (
                <div key={e.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[14px] font-bold text-gray-800 leading-none">{new Date(e.date).getDate()}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-medium">{new Date(e.date).toLocaleString("en-PK", { month: "short" })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{e.subject}</p>
                    <p className="text-[11px] text-gray-400">{e.className} · {e.startTime} · {e.duration} min{e.venue ? ` · ${e.venue}` : ""}</p>
                  </div>
                  <Badge color={EXAM_COLOR[e.examType] || "gray"}>{e.examType.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  // ── LIBRARY TAB ──────────────────────────────────────────────────────────────
  const LibraryTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi label="Total Books"    value={fmt(library.totalBooks)}     color="text-sky-700"    bg="bg-sky-50" />
        <MiniKpi label="Available"      value={fmt(library.availableBooks)} color="text-emerald-700" bg="bg-emerald-50" />
        <MiniKpi label="Issued"         value={fmt(library.issuedBooks)}    color="text-indigo-700" bg="bg-indigo-50" />
        <MiniKpi label="Overdue"        value={fmt(library.overdueBooks)}   color="text-red-600"    bg="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <Card>
          <CardHeader title="Books Distribution" icon={Library} accent="sky" href="/library/catalog" />
          <div className="p-5">
            {(library.booksChart || []).length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[13px] text-gray-400">No books data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={library.booksChart} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3}>
                      {(library.booksChart || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2">
                  <ProgressBar
                    pct={library.totalBooks > 0 ? (library.issuedBooks / library.totalBooks) * 100 : 0}
                    color="bg-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Circulation rate</span>
                    <span className="font-semibold text-indigo-600">
                      {library.totalBooks > 0 ? Math.round((library.issuedBooks / library.totalBooks) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Fines */}
        <Card>
          <CardHeader title="Library Fines" icon={AlertCircle} accent="amber" href="/library/fines" />
          <div className="p-5">
            <div className="flex flex-col items-center justify-center py-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${library.unpaidFines > 0 ? "bg-orange-100" : "bg-emerald-50"}`}>
                {library.unpaidFines > 0
                  ? <AlertCircle size={32} className="text-orange-500" />
                  : <CheckCircle2 size={32} className="text-emerald-500" />
                }
              </div>
              <p className="text-[28px] font-bold text-gray-800 mb-1">{fmtPKR(library.unpaidFines)}</p>
              <p className="text-[13px] text-gray-400">{library.unpaidFines > 0 ? "Unpaid / partial fines outstanding" : "All fines cleared"}</p>
            </div>
            {library.overdueBooks > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-3 mt-2">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-red-700">{fmt(library.overdueBooks)} overdue book{library.overdueBooks !== 1 ? "s" : ""}</p>
                  <p className="text-[11px] text-red-400">These may have accumulated fines</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  // ── ACTIVITY TAB ─────────────────────────────────────────────────────────────
  const ActivityTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Leaves */}
        <Card>
          <CardHeader title="Pending Leave Requests" icon={Clock} accent="amber"
            href="/attendance/leaves" linkLabel={`View all (${pendingLeaves})`} />
          <div className="p-5">
            {recentLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                <CheckCircle2 size={28} className="opacity-40" />
                <p className="text-[13px]">No pending leave requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeaves.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-700 text-[12px] font-bold">{l.name?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">{l.name}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(l.fromDate)} – {fmtDate(l.toDate)} · {l.totalDays}d</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge color={LEAVE_COLOR[l.leaveType] || "gray"}>{l.leaveType}</Badge>
                      <Badge color="gray">{l.applicantType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Admissions */}
        <Card>
          <CardHeader title="Recent Admissions" icon={UserCheck} accent="indigo" href="/students" linkLabel="All students" />
          <div className="p-5">
            {recentAdmissions.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-10">No recent admissions</p>
            ) : (
              <div className="space-y-2">
                {recentAdmissions.map((s) => (
                  <div key={s.studentId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-700 text-[12px] font-bold">{s.name?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400">{s.className} · {fmtLong(s.admissionDate)}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">{s.studentId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Notices */}
      <Card>
        <CardHeader title="Recent Notices" icon={Bell} accent="amber" href="/communication/notices" />
        <div className="p-5">
          {recentNotices.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">No notices published</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {recentNotices.map((n) => (
                <div key={n.id} className="p-3 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[12px] font-semibold text-gray-800 leading-tight flex-1">{n.title}</p>
                    <Badge color={PRIORITY_COLOR[n.priority] || "gray"}>{n.priority}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="gray">{n.category}</Badge>
                    <span className="text-[10px] text-gray-400">{fmtDate(n.publishDate)}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">→ {n.targetAudience}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const TAB_CONTENT = {
    overview:   <OverviewTab   />,
    attendance: <AttendanceTab />,
    finance:    <FinanceTab    />,
    academics:  <AcademicsTab  />,
    library:    <LibraryTab    />,
    activity:   <ActivityTab   />,
  };

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Dashboard</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingLeaves > 0 && (
            <Link href="/attendance/leaves"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              <Clock size={13} />
              {pendingLeaves} pending leave{pendingLeaves !== 1 ? "s" : ""}
            </Link>
          )}
          {finance.defaultersCount > 0 && (
            <Link href="/finance/defaulters"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-[12px] font-medium text-red-600 hover:bg-red-100 transition-colors">
              <AlertCircle size={13} />
              {finance.defaultersCount} defaulter{finance.defaultersCount !== 1 ? "s" : ""}
            </Link>
          )}
          {academics.ongoingExams > 0 && (
            <Link href="/exams/schedule"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-100 transition-colors">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {academics.ongoingExams} exam{academics.ongoingExams !== 1 ? "s" : ""} live
            </Link>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 whitespace-nowrap flex-1 justify-center min-w-[90px] ${
              activeTab === key
                ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {TAB_CONTENT[activeTab]}

      {/* ── Quick Actions — always at bottom ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: "Enroll Student",  href: "/students/enroll",     icon: Users,         color: "indigo"  },
            { label: "Mark Attendance", href: "/attendance/students",  icon: CalendarCheck, color: "emerald" },
            { label: "Add Expense",     href: "/finance/expenses",     icon: TrendingDown,  color: "rose"    },
            { label: "Fee Collection",  href: "/finance/collection",   icon: Receipt,       color: "indigo"  },
            { label: "Run Payroll",     href: "/finance/payroll",      icon: Banknote,      color: "purple"  },
            { label: "Add Teacher",     href: "/teachers/add",         icon: GraduationCap, color: "emerald" },
            { label: "Issue Book",      href: "/library/issue",        icon: BookMarked,    color: "sky"     },
            { label: "Schedule Exam",   href: "/exams/schedule",       icon: ClipboardList, color: "amber"   },
          ].map(({ label, href, icon: Icon, color }) => {
            const cols = {
              indigo:  "bg-indigo-50  text-indigo-600  hover:bg-indigo-100",
              emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
              rose:    "bg-rose-50    text-rose-600    hover:bg-rose-100",
              purple:  "bg-purple-50  text-purple-600  hover:bg-purple-100",
              sky:     "bg-sky-50     text-sky-600     hover:bg-sky-100",
              amber:   "bg-amber-50   text-amber-600   hover:bg-amber-100",
            };
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-center transition-colors ${cols[color]}`}>
                <Icon size={18} />
                <span className="text-[10px] font-semibold leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}