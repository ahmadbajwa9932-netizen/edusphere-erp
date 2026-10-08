"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeReportsApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard from "../../../../components/ui/StatCard";
import { Table, Tr, Td } from "../../../../components/ui/Table";
import {
  TrendingUp, TrendingDown, Wallet, BadgeDollarSign,
  Users, AlertCircle, BarChart2, Filter, RefreshCw,
  GraduationCap, BookOpen, ChevronRight, ArrowUpRight,
  ArrowDownRight, Banknote, Receipt, UserCheck,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });

const fmtPKR = (n) =>
  `PKR ${Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtMonth = (m) => {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1).toLocaleString("en-PK", { month: "short", year: "2-digit" });
};

const thisYear = () => {
  const d = new Date();
  const y = d.getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white min-w-[140px]";

const STATUS_BADGE = {
  UNPAID:  "bg-red-50 text-red-700 border border-red-200",
  PARTIAL: "bg-amber-50 text-amber-700 border border-amber-200",
  OVERDUE: "bg-orange-50 text-orange-700 border border-orange-200",
};

// chart colour palettes
const EXPENSE_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316",
  "#eab308","#22c55e","#14b8a6","#06b6d4","#3b82f6",
  "#a855f7","#ef4444",
];

// custom tooltip for charts
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-[12px]">
      <p className="text-gray-500 mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtPKR(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, accent = "indigo", children, action }) => {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accents[accent]}`}>
            <Icon size={14} />
          </div>
          <p className="text-[14px] font-semibold text-gray-800">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

// ── Mini stat inside a section ────────────────────────────────────────────────
const MiniStat = ({ label, value, sub, color = "text-gray-800", bg = "bg-gray-50" }) => (
  <div className={`${bg} rounded-xl px-4 py-3`}>
    <p className="text-[11px] text-gray-400 font-medium mb-1">{label}</p>
    <p className={`text-[18px] font-bold leading-tight ${color}`}>{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ label, value, total, color = "bg-indigo-500" }) => {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] text-gray-600 truncate max-w-[60%]">{label}</span>
        <span className="text-[12px] font-semibold text-gray-700">{fmtPKR(value)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinanceReportsPage() {
  const [academicYear, setAcademicYear] = useState(thisYear());
  const [month,        setMonth]        = useState(thisMonth());
  const [classId,      setClassId]      = useState("");
  const [activeTab,    setActiveTab]    = useState("overview"); // overview | fees | expenses | payroll | defaulters

  const [committed, setCommitted] = useState({ academicYear, month, classId });

  const apply = () => setCommitted({ academicYear, month, classId });
  const reset = () => {
    const y = thisYear(); const m = thisMonth();
    setAcademicYear(y); setMonth(m); setClassId("");
    setCommitted({ academicYear: y, month: m, classId: "" });
  };

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["finance-reports", committed],
    queryFn: () => financeReportsApi.get(committed),
    keepPreviousData: true,
  });

  const loading = isLoading || isFetching;

  // destructure with safe defaults
  const feeSummary        = data?.feeSummary        || {};
  const feeByClass        = data?.feeByClass        || [];
  const monthlyFee        = data?.monthlyFee        || [];
  const expenseSummary    = data?.expenseSummary    || {};
  const expenseByCategory = data?.expenseByCategory || [];
  const payrollSummary    = data?.payrollSummary    || {};
  const payrollByType     = data?.payrollByType     || [];
  const monthlyPayroll    = data?.monthlyPayroll    || [];
  const defaulters        = data?.defaultersSummary || {};
  const netOverview       = data?.netOverview       || {};
  const monthlyExpenses   = data?.monthlyExpenses   || [];

  // build combined monthly chart data
  const combinedMonthly = (() => {
    const map = {};
    // income = fee collected
    monthlyFee.forEach((r) => { map[r.month] = { month: r.month, income: r.collected, expenses: 0 }; });
    // expenses = paid operating expenses only (matches KPI card)
    monthlyExpenses.forEach((r) => {
      if (!map[r.month]) map[r.month] = { month: r.month, income: 0, expenses: 0 };
      map[r.month].expenses += r.amount;
    });
    // expenses += paid payroll only (matches KPI card)
    monthlyPayroll.forEach((r) => {
      if (!map[r.month]) map[r.month] = { month: r.month, income: 0, expenses: 0 };
      map[r.month].expenses += r.paidSalary;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((r) => ({
      ...r,
      month: fmtMonth(r.month),
    }));
  })();

  const tabs = [
    { key: "overview",   label: "Overview",   icon: BarChart2 },
    { key: "fees",       label: "Fees",        icon: Receipt },
    { key: "expenses",   label: "Expenses",    icon: TrendingDown },
    { key: "payroll",    label: "Payroll",     icon: UserCheck },
    { key: "defaulters", label: "Defaulters",  icon: AlertCircle },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Finance Reports"
        description="Comprehensive overview of fees, expenses, payroll and financial health"
      />

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Academic Year</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
              {["2025-26","2024-25","2023-24"].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={selectCls}
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
              <option value="">All Classes</option>
              {classesData?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={reset}
              className="px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={apply}
              className="px-4 py-2 text-[12px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <Filter size={12} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Top KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Balance */}
        <div className={`rounded-xl p-4 border ${netOverview.netBalance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netOverview.netBalance >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
              <Wallet size={15} />
            </div>
            {netOverview.netBalance >= 0
              ? <ArrowUpRight size={16} className="text-emerald-500" />
              : <ArrowDownRight size={16} className="text-red-500" />
            }
          </div>
          <p className="text-[11px] text-gray-500 font-medium mb-1">Net Balance</p>
          <p className={`text-[20px] font-bold leading-tight ${netOverview.netBalance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {fmtPKR(Math.abs(netOverview.netBalance))}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{netOverview.netBalance >= 0 ? "Surplus" : "Deficit"}</p>
        </div>

        {/* Total Income */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <BadgeDollarSign size={15} />
            </div>
            <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              {feeSummary.collectionRate}%
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium mb-1">Fee Collected</p>
          <p className="text-[20px] font-bold text-indigo-700 leading-tight">{fmtPKR(netOverview.totalIncome)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Collection rate</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <TrendingDown size={15} />
            </div>
            <ArrowDownRight size={16} className="text-rose-400" />
          </div>
          <p className="text-[11px] text-gray-500 font-medium mb-1">Total Expenses</p>
          <p className="text-[20px] font-bold text-rose-700 leading-tight">{fmtPKR(netOverview.totalExpenses)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Payroll + operating</p>
        </div>

        {/* Defaulters */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle size={15} />
            </div>
            <ChevronRight size={16} className="text-amber-400" />
          </div>
          <p className="text-[11px] text-gray-500 font-medium mb-1">Defaulters</p>
          <p className="text-[20px] font-bold text-amber-700 leading-tight">{fmt(defaulters.total)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Pending / overdue</p>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 flex-1 justify-center ${
              activeTab === key
                ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════ TAB: OVERVIEW ════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Income vs Expense trend */}
          <Section title="Income vs Expense Trend" icon={TrendingUp} accent="indigo">
            {combinedMonthly.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-[13px]">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={combinedMonthly} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="income"   name="Income"   stroke="#6366f1" strokeWidth={2} fill="url(#incomeGrad)"  dot={{ r: 3, fill: "#6366f1" }} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGrad)" dot={{ r: 3, fill: "#f43f5e" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* 2-col: fee summary + expense by cat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Fee collection donut-style summary */}
            <Section title="Fee Collection Status" icon={Receipt} accent="indigo">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <MiniStat label="Total Due"      value={fmtPKR(feeSummary.totalDue)}       color="text-gray-800"   bg="bg-gray-50" />
                <MiniStat label="Collected"      value={fmtPKR(feeSummary.totalCollected)} color="text-indigo-700" bg="bg-indigo-50" />
                <MiniStat label="Pending"        value={fmtPKR(feeSummary.totalPending)}   color="text-amber-700"  bg="bg-amber-50" />
                <MiniStat label="Overdue"        value={fmtPKR(feeSummary.totalOverdue)}   color="text-red-600"    bg="bg-red-50" />
              </div>
              {/* collection rate bar */}
              <div className="mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-gray-500">Collection Rate</span>
                  <span className="text-[13px] font-bold text-indigo-600">{feeSummary.collectionRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${feeSummary.collectionRate || 0}%` }} />
                </div>
                <div className="flex gap-3 mt-2 flex-wrap">
                  {[
                    { label: "Paid",    count: feeSummary.counts?.paid,    color: "bg-indigo-400" },
                    { label: "Partial", count: feeSummary.counts?.partial, color: "bg-amber-400" },
                    { label: "Unpaid",  count: feeSummary.counts?.unpaid,  color: "bg-red-400" },
                    { label: "Overdue", count: feeSummary.counts?.overdue, color: "bg-orange-400" },
                  ].map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      {s.label}: <span className="font-semibold text-gray-700">{fmt(s.count)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            {/* Expense by category */}
            <Section title="Expenses by Category" icon={TrendingDown} accent="rose">
              {expenseByCategory.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-[13px]">No expense data</div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {expenseByCategory.map((e, i) => (
                    <ProgressBar
                      key={e.category}
                      label={e.category.replace(/_/g, " ")}
                      value={e.amount}
                      total={expenseSummary.total || 1}
                      color={`bg-[${EXPENSE_COLORS[i % EXPENSE_COLORS.length]}]`}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Payroll overview */}
          <Section title="Payroll Overview" icon={UserCheck} accent="purple">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <MiniStat label="Total Paid"       value={fmtPKR(payrollSummary.totalPaid)}      color="text-purple-700" bg="bg-purple-50"
    sub={`${fmt(payrollSummary.counts?.paid)} records`} />
  <MiniStat label="Pending"          value={fmtPKR(payrollSummary.totalPending)}    color="text-amber-700"  bg="bg-amber-50"
    sub={`${fmt(payrollSummary.counts?.pending)} records`} />
  <MiniStat label="Total Bonus"      value={fmtPKR(payrollSummary.totalBonus)}      color="text-emerald-700" bg="bg-emerald-50" />
  <MiniStat label="Total Deductions" value={fmtPKR(payrollSummary.totalDeduction)}  color="text-rose-700"   bg="bg-rose-50" />
</div>

{/* Paid vs Unpaid breakdown */}
<div className="mt-3 bg-white rounded-xl border border-gray-100 p-4">
  <p className="text-[13px] font-semibold text-gray-700 mb-3">Salary Payment Status</p>
  {(() => {
    const total = (payrollSummary.totalPaid || 0) + (payrollSummary.totalPending || 0);
    const paidPct    = total > 0 ? ((payrollSummary.totalPaid    / total) * 100).toFixed(1) : 0;
    const pendingPct = total > 0 ? ((payrollSummary.totalPending / total) * 100).toFixed(1) : 0;
    return (
      <>
        {/* stacked bar */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex mb-3">
          <div className="h-full bg-purple-500 transition-all duration-700" style={{ width: `${paidPct}%` }} />
          <div className="h-full bg-amber-400  transition-all duration-700" style={{ width: `${pendingPct}%` }} />
        </div>
        {/* legend */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-[12px] text-gray-500">Paid</span>
            <span className="text-[12px] font-bold text-purple-700">{fmtPKR(payrollSummary.totalPaid)}</span>
            <span className="text-[11px] text-gray-400">({paidPct}% · {fmt(payrollSummary.counts?.paid)} records)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-[12px] text-gray-500">Pending</span>
            <span className="text-[12px] font-bold text-amber-600">{fmtPKR(payrollSummary.totalPending)}</span>
            <span className="text-[11px] text-gray-400">({pendingPct}% · {fmt(payrollSummary.counts?.pending)} records)</span>
          </div>
        </div>
      </>
    );
  })()}
</div>
            <div className="flex gap-4 mt-4 flex-wrap">
              {payrollByType.map((p) => (
                <div key={p.type} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                    {p.type === "TEACHER" ? <GraduationCap size={13} className="text-purple-600" /> : <BookOpen size={13} className="text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 capitalize">{p.type.toLowerCase()}</p>
                    <p className="text-[13px] font-semibold text-gray-700">{fmtPKR(p.netSalary)}</p>
                  </div>
                  <span className="ml-2 text-[11px] text-gray-400">{p.count} records</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ════════════════════ TAB: FEES ════════════════════ */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Total Due"       value={fmtPKR(feeSummary.totalDue)}        color="text-gray-800"   bg="bg-white border border-gray-100" />
            <MiniStat label="Collected"       value={fmtPKR(feeSummary.totalCollected)}  color="text-indigo-700" bg="bg-indigo-50" />
            <MiniStat label="Pending"         value={fmtPKR(feeSummary.totalPending)}    color="text-amber-700"  bg="bg-amber-50"
              sub={`${fmt(feeSummary.counts?.unpaid)} unpaid + ${fmt(feeSummary.counts?.partial)} partial`} />
            <MiniStat label="Overdue"         value={fmtPKR(feeSummary.totalOverdue)}    color="text-red-600"    bg="bg-red-50"
              sub={`${fmt(feeSummary.counts?.overdue)} records`} />
          </div>

          {/* Monthly fee trend */}
          <Section title="Monthly Fee Collection Trend" icon={TrendingUp} accent="indigo">
            {monthlyFee.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-[13px]">No trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyFee.map((r) => ({ ...r, month: fmtMonth(r.month) }))} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="amountDue" name="Amount Due" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected"  fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Class-wise fee table */}
          <Section title="Class-wise Fee Summary" icon={Users} accent="indigo">
            {feeByClass.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-gray-400 text-[13px]">No data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Class", "Amount Due", "Collected", "Pending", "Collection Rate", "Records"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {feeByClass.map((c) => {
                      const rate = c.amountDue > 0 ? ((c.amountPaid / c.amountDue) * 100).toFixed(1) : 0;
                      return (
                        <tr key={c.classId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-gray-800">{c.className}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{fmtPKR(c.amountDue)}</td>
                          <td className="py-2.5 pr-4 text-indigo-600 font-medium">{fmtPKR(c.amountPaid)}</td>
                          <td className="py-2.5 pr-4 text-amber-600">{fmtPKR(c.amountDue - c.amountPaid)}</td>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-[12px] font-semibold text-gray-600 w-10 text-right">{rate}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-gray-500">{fmt(c.count)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ════════════════════ TAB: EXPENSES ════════════════════ */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Total Expenses" value={fmtPKR(expenseSummary.total)}         color="text-rose-700"   bg="bg-rose-50"
              sub={`${fmt(expenseSummary.counts?.paid)} paid, ${fmt(expenseSummary.counts?.pending)} pending`} />
            <MiniStat label="Paid"           value={fmtPKR(expenseSummary.totalPaid)}     color="text-gray-800"   bg="bg-white border border-gray-100" />
            <MiniStat label="Pending"        value={fmtPKR(expenseSummary.totalPending)}  color="text-amber-700"  bg="bg-amber-50" />
          </div>

          {/* Category chart + breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Expense by Category" icon={TrendingDown} accent="rose">
              {expenseByCategory.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-[13px]">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="amount" nameKey="category"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                      paddingAngle={3}
                    >
                      {expenseByCategory.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtPKR(v)} />
                    <Legend
                      formatter={(v) => v.replace(/_/g, " ")}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Section>

            <Section title="Category Breakdown" icon={BarChart2} accent="rose">
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {expenseByCategory.length === 0 ? (
                  <p className="text-[13px] text-gray-400 text-center py-8">No expense data</p>
                ) : expenseByCategory.map((e, i) => (
                  <div key={e.category} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[12px] text-gray-600 truncate">{e.category.replace(/_/g, " ")}</span>
                        <span className="text-[12px] font-semibold text-gray-700 ml-2 shrink-0">{fmtPKR(e.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${expenseSummary.total > 0 ? (e.amount / expenseSummary.total) * 100 : 0}%`,
                            backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
                          }} />
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{e.count}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB: PAYROLL ════════════════════ */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <MiniStat label="Total Paid"       value={fmtPKR(payrollSummary.totalPaid)}      color="text-purple-700" bg="bg-purple-50"
    sub={`${fmt(payrollSummary.counts?.paid)} records`} />
  <MiniStat label="Pending"          value={fmtPKR(payrollSummary.totalPending)}    color="text-amber-700"  bg="bg-amber-50"
    sub={`${fmt(payrollSummary.counts?.pending)} records`} />
  <MiniStat label="Total Bonus"      value={fmtPKR(payrollSummary.totalBonus)}      color="text-emerald-700" bg="bg-emerald-50" />
  <MiniStat label="Total Deductions" value={fmtPKR(payrollSummary.totalDeduction)}  color="text-rose-700"   bg="bg-rose-50" />
</div>

{/* Paid vs Unpaid breakdown */}
<div className="bg-white rounded-xl border border-gray-100 p-4">
  <p className="text-[13px] font-semibold text-gray-700 mb-3">Salary Payment Status</p>
  {(() => {
    const total = (payrollSummary.totalPaid || 0) + (payrollSummary.totalPending || 0);
    const paidPct    = total > 0 ? ((payrollSummary.totalPaid    / total) * 100).toFixed(1) : 0;
    const pendingPct = total > 0 ? ((payrollSummary.totalPending / total) * 100).toFixed(1) : 0;
    return (
      <>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex mb-3">
          <div className="h-full bg-purple-500 transition-all duration-700" style={{ width: `${paidPct}%` }} />
          <div className="h-full bg-amber-400  transition-all duration-700" style={{ width: `${pendingPct}%` }} />
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-[12px] text-gray-500">Paid</span>
            <span className="text-[12px] font-bold text-purple-700">{fmtPKR(payrollSummary.totalPaid)}</span>
            <span className="text-[11px] text-gray-400">({paidPct}% · {fmt(payrollSummary.counts?.paid)} records)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-[12px] text-gray-500">Pending</span>
            <span className="text-[12px] font-bold text-amber-600">{fmtPKR(payrollSummary.totalPending)}</span>
            <span className="text-[11px] text-gray-400">({pendingPct}% · {fmt(payrollSummary.counts?.pending)} records)</span>
          </div>
        </div>
      </>
    );
  })()}
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly payroll trend */}
            <Section title="Monthly Payroll Trend" icon={TrendingUp} accent="purple">
              {monthlyPayroll.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-[13px]">No trend data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyPayroll.map((r) => ({ ...r, month: fmtMonth(r.month) }))} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="netSalary" name="Net Salary" stroke="#a855f7" strokeWidth={2} fill="url(#payrollGrad)" dot={{ r: 3, fill: "#a855f7" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* By employee type */}
            <Section title="Payroll by Employee Type" icon={Users} accent="purple">
              <div className="space-y-4 mt-2">
                {payrollByType.length === 0 ? (
                  <p className="text-[13px] text-gray-400 text-center py-8">No payroll data</p>
                ) : payrollByType.map((p) => {
                  const total = payrollByType.reduce((s, r) => s + r.netSalary, 0);
                  const pct   = total > 0 ? ((p.netSalary / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={p.type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                            {p.type === "TEACHER"
                              ? <GraduationCap size={12} className="text-purple-600" />
                              : <BookOpen size={12} className="text-purple-600" />
                            }
                          </div>
                          <span className="text-[13px] font-medium text-gray-700 capitalize">{p.type.toLowerCase()}s</span>
                          <span className="text-[11px] text-gray-400">({p.count} records)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-semibold text-purple-700">{fmtPKR(p.netSalary)}</span>
                          <span className="text-[11px] text-gray-400 ml-1.5">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB: DEFAULTERS ════════════════════ */}
      {activeTab === "defaulters" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-amber-800">
                {fmt(defaulters.total)} student{defaulters.total !== 1 ? "s" : ""} have pending or overdue fees
              </p>
              <p className="text-[12px] text-amber-600">
                Showing top 10 defaulters below. Use Fee Collection page to record payments.
              </p>
            </div>
          </div>

          {/* Defaulters table */}
          <Section title="Top Defaulters" icon={AlertCircle} accent="amber">
            {!defaulters.topDefaulters?.length ? (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Users size={28} className="opacity-30" />
                <p className="text-[13px]">No defaulters found for selected filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Student", "Class", "Amount Due", "Amount Paid", "Balance", "Status", "Due Date"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {defaulters.topDefaulters.map((d) => (
                      <tr key={d.studentId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <span className="text-amber-600 text-[9px] font-semibold">{d.name?.[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 leading-tight">{d.name}</p>
                              <p className="text-[11px] text-gray-400 font-mono">{d.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">{d.className}</td>
                        <td className="py-2.5 pr-4 font-medium text-gray-700">{fmtPKR(d.amountDue)}</td>
                        <td className="py-2.5 pr-4 text-emerald-600">{fmtPKR(d.amountPaid)}</td>
                        <td className="py-2.5 pr-4 font-semibold text-red-600">{fmtPKR(d.balance)}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_BADGE[d.status] || "bg-gray-100 text-gray-600"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500">{fmtDate(d.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}