"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceReportApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard from "../../../../components/ui/StatCard";
import Badge from "../../../../components/ui/Badge";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Users, UserCheck, UserX, Clock, FileCheck,
  GraduationCap, BookOpen, Search, Filter,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (t) => {
  if (!t) return "—";
  const d = new Date(t);
  return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const thisMonthFrom = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const today = () => new Date().toISOString().split("T")[0];

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

const STATUS_BADGE = {
  PRESENT: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  ABSENT:  "bg-red-50 text-red-700 border border-red-200",
  LATE:    "bg-amber-50 text-amber-700 border border-amber-200",
  LEAVE:   "bg-blue-50 text-blue-700 border border-blue-200",
};

// ── component ─────────────────────────────────────────────────────────────────
export default function AttendanceReportsPage() {
  const [type,       setType]       = useState("student");
  const [from,       setFrom]       = useState(thisMonthFrom());
  const [to,         setTo]         = useState(today());
  const [classId,    setClassId]    = useState("");
  const [department, setDepartment] = useState("");
  const [status,     setStatus]     = useState("");
  const [page,       setPage]       = useState(1);

  // committed filters — only fire query when user hits "Apply"
  const [committed, setCommitted] = useState({
    type, from, to, classId, department, status, page,
  });

  const apply = () => {
    setPage(1);
    setCommitted({ type, from, to, classId, department, status, page: 1 });
  };

  const reset = () => {
    setType("student"); setFrom(thisMonthFrom()); setTo(today());
    setClassId(""); setDepartment(""); setStatus(""); setPage(1);
    setCommitted({ type: "student", from: thisMonthFrom(), to: today(), classId: "", department: "", status: "", page: 1 });
  };

  // page changes fire immediately (committed page updates)
  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["attendance-report", committed],
    queryFn:  () => attendanceReportApi.get(committed),
    enabled:  !!(committed.from && committed.to),
    keepPreviousData: true,
  });

  const summary = data?.summary || { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, total: 0 };
  const attendanceRate = summary.total
    ? Math.round((summary.PRESENT / summary.total) * 100)
    : 0;

    const STUDENT_COLS = ["Date", "Student", "Class / Sec", "Roll No", "Status", "Remarks"];
    const TEACHER_COLS = ["Date", "Teacher", "Department", "Designation", "Status", "Check In", "Check Out", "Remarks"];
    const STAFF_COLS   = ["Date", "Staff Member", "Department", "Designation", "Status", "Check In", "Check Out", "Remarks"];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Attendance Reports"
        description="View and filter attendance records for students and teachers"
      />

      {/* ── Filter Panel ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 space-y-3">
        {/* Row 1 — type toggle + date range */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { key: "student", label: "Students", icon: <Users size={13} /> },
              { key: "teacher", label: "Teachers", icon: <GraduationCap size={13} /> },
              { key: "staff",   label: "Staff",    icon: <BookOpen size={13} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  setType(key);
                  setClassId("");
                  setDepartment("");
                  setPage(1);
                  setCommitted((prev) => ({ ...prev, type: key, classId: "", department: "", page: 1 }));
                }}
                className={`px-4 py-2 text-[12px] font-medium capitalize transition-colors ${
                  type === key
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-1.5">{icon}{label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">From</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={selectCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">To</label>
            <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} className={selectCls} />
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="LEAVE">Leave</option>
            </select>
          </div>

          {/* Conditional filter */}
          {type === "student" && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-gray-400 font-medium">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
                <option value="">All Classes</option>
                {classesData?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {(type === "teacher" || type === "staff") && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-gray-400 font-medium">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
                <option value="">All Departments</option>
                {data?.departments?.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-end gap-2 ml-auto mt-auto">
            <button
              onClick={reset}
              className="px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              Reset
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

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Records" value={summary.total}   icon={BookOpen}   color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Present"       value={summary.PRESENT} icon={UserCheck}  color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Absent"        value={summary.ABSENT}  icon={UserX}      color="bg-red-50 text-red-500" />
        <StatCard label="Late"          value={summary.LATE}    icon={Clock}      color="bg-amber-50 text-amber-600" />
        <StatCard label="On Leave"      value={summary.LEAVE}   icon={FileCheck}  color="bg-blue-50 text-blue-600" />
      </div>

      {/* Attendance rate bar */}
      {summary.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-medium text-gray-500">Overall Attendance Rate</p>
            <p className="text-[13px] font-semibold text-gray-800">{attendanceRate}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                attendanceRate >= 80 ? "bg-emerald-500" :
                attendanceRate >= 60 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2">
            {["PRESENT","ABSENT","LATE","LEAVE"].map((s) => (
              <span key={s} className="text-[11px] text-gray-400">
                {s.charAt(0) + s.slice(1).toLowerCase()}: <span className="font-medium text-gray-600">{summary[s]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Records Table ─────────────────────────────────────────────────── */}
      <div>
        <Table
columns={type === "student" ? STUDENT_COLS : type === "teacher" ? TEACHER_COLS : STAFF_COLS}
          isLoading={isLoading || isFetching}
          isEmpty={!isLoading && !isFetching && data?.records?.length === 0}
          emptyIcon={Users}
          emptyText="No attendance records found"
          emptySubtext="Try adjusting the filters or date range"
        >
          {type === "student"
            ? data?.records?.map((r) => (
                <Tr key={r.id}>
                  <Td first>
                    <p className="text-[13px] text-gray-700 font-medium">{fmt(r.date)}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 text-[9px] font-semibold">
                          {r.firstName?.[0]}{r.lastName?.[0] || ""}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 leading-tight">
                          {r.firstName} {r.lastName}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">{r.studentId}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-[13px] text-gray-700">{r.className}</p>
                    {r.section && <p className="text-[11px] text-gray-400">Sec {r.section}</p>}
                  </Td>
                  <Td><span className="text-[13px] text-gray-600">{r.rollNumber || "—"}</span></Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                  </Td>
                  <Td><span className="text-[12px] text-gray-400">{r.remarks || "—"}</span></Td>
                </Tr>
              ))
            : type === "teacher"
            ? data?.records?.map((r) => (
                <Tr key={r.id}>
                  <Td first>
                    <p className="text-[13px] text-gray-700 font-medium">{fmt(r.date)}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <span className="text-purple-600 text-[9px] font-semibold">
                          {r.firstName?.[0]}{r.lastName?.[0] || ""}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 leading-tight">
                          {r.firstName} {r.lastName}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">{r.employeeId}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-[13px] text-gray-700">{r.department}</span></Td>
                  <Td><span className="text-[12px] text-gray-500">{r.designation}</span></Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                  </Td>
                  <Td><span className="text-[12px] text-gray-500">{fmtTime(r.checkIn)}</span></Td>
                  <Td><span className="text-[12px] text-gray-500">{fmtTime(r.checkOut)}</span></Td>
                  <Td><span className="text-[12px] text-gray-400">{r.remarks || "—"}</span></Td>
                </Tr>
              ))
            : data?.records?.map((r) => (
                <Tr key={r.id}>
                  <Td first>
                    <p className="text-[13px] text-gray-700 font-medium">{fmt(r.date)}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <span className="text-teal-600 text-[9px] font-semibold">
                          {r.firstName?.[0]}{r.lastName?.[0] || ""}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 leading-tight">
                          {r.firstName} {r.lastName}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">{r.employeeId}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-[13px] text-gray-700">{r.department || "—"}</span></Td>
                  <Td><span className="text-[12px] text-gray-500">{r.designation || "—"}</span></Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                  </Td>
                  <Td><span className="text-[12px] text-gray-500">{fmtTime(r.checkIn)}</span></Td>
                  <Td><span className="text-[12px] text-gray-500">{fmtTime(r.checkOut)}</span></Td>
                  <Td><span className="text-[12px] text-gray-400">{r.remarks || "—"}</span></Td>
                </Tr>
              ))
          }
        </Table>

        <TableFooter
          page={committed.page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="records"
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}