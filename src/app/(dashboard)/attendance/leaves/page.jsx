"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leavesApi, classesApi, studentsApi, teachersApi, staffApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard from "../../../../components/ui/StatCard";
import Button from "../../../../components/ui/Button";
import Modal from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Clock, CheckCircle, XCircle, AlertCircle,
  Plus, Search, Filter, Trash2, Users,
  GraduationCap, CalendarDays, FileText,
} from "lucide-react";

// ── constants ────────────────────────────────────────────────────────────────
const LEAVE_TYPES = ["SICK", "CASUAL", "EMERGENCY", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"];

const STATUS_CFG = {
  PENDING:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock        },
  APPROVED:  { label: "Approved",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  REJECTED:  { label: "Rejected",  cls: "bg-red-50 text-red-700 border-red-200",         icon: XCircle      },
  CANCELLED: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 border-gray-200",     icon: AlertCircle  },
};

const LEAVE_TYPE_CFG = {
  SICK:       { cls: "bg-red-50 text-red-600 border-red-100" },
  CASUAL:     { cls: "bg-blue-50 text-blue-600 border-blue-100" },
  EMERGENCY:  { cls: "bg-orange-50 text-orange-600 border-orange-100" },
  MATERNITY:  { cls: "bg-pink-50 text-pink-600 border-pink-100" },
  PATERNITY:  { cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  UNPAID:     { cls: "bg-gray-50 text-gray-600 border-gray-200" },
  OTHER:      { cls: "bg-purple-50 text-purple-600 border-purple-100" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const today     = () => new Date().toISOString().split("T")[0];
const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const inputCls  = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

// ── main ─────────────────────────────────────────────────────────────────────
export default function LeaveManagementPage() {
  const qc = useQueryClient();

  // ── filter state ─────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [applicantType, setApplicantType] = useState("");
  const [status,        setStatus]        = useState("");
  const [leaveType,     setLeaveType]     = useState("");
  const [classId,       setClassId]       = useState("");
  const [department,    setDepartment]    = useState("");
  const [from,          setFrom]          = useState("");
  const [to,            setTo]            = useState("");
  const [page,          setPage]          = useState(1);

  const [committed, setCommitted] = useState({
    search: "", applicantType: "", status: "", leaveType: "",
    classId: "", department: "", from: "", to: "", page: 1,
  });

  // ── modal state ───────────────────────────────────────────────────────────
  const [addOpen,    setAddOpen]    = useState(false);
  const [actionLeave, setActionLeave] = useState(null); // { leave, mode: "approve"|"reject"|"cancel" }
  const [deleteLeave, setDeleteLeave] = useState(null);
  const [remarks,    setRemarks]    = useState("");

  // ── form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    applicantType: "STUDENT",
    leaveType:     "SICK",
    studentId:     "",
    teacherId:     "",
    staffId:       "",
    fromDate:      today(),
    toDate:        today(),
    reason:        "",
  });

  // ── queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leaves", committed],
    queryFn:  () => leavesApi.getAll(committed),
    keepPreviousData: true,
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // Students list for add form
  const { data: studentsData } = useQuery({
    queryKey: ["students-list"],
    queryFn:  () => studentsApi.getAll({ limit: 200 }),
    enabled:  addOpen && form.applicantType === "STUDENT",
  });

  // Teachers list for add form
  const { data: teachersData } = useQuery({
    queryKey: ["teachers-list"],
    queryFn:  () => teachersApi.getAll({ limit: 200 }),
    enabled:  addOpen && form.applicantType === "TEACHER",
  });

  // Staff list for add form
  const { data: staffData } = useQuery({
    queryKey: ["staff-list"],
    queryFn:  () => staffApi.getAll({ limit: 200 }),
    enabled:  addOpen && form.applicantType === "STAFF",
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["leaves"] });

  const createMutation = useMutation({
    mutationFn: leavesApi.create,
    onSuccess: () => { invalidate(); setAddOpen(false); resetForm(); },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, mode, remarks }) => {
      if (mode === "approve") return leavesApi.approve(id, remarks);
      if (mode === "reject")  return leavesApi.reject(id, remarks);
      return leavesApi.cancel(id, remarks);
    },
    onSuccess: () => { invalidate(); setActionLeave(null); setRemarks(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: leavesApi.delete,
    onSuccess: () => { invalidate(); setDeleteLeave(null); },
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const apply = () => {
    setPage(1);
    setCommitted({ search, applicantType, status, leaveType, classId, department, from, to, page: 1 });
  };

  const reset = () => {
    setSearch(""); setApplicantType(""); setStatus(""); setLeaveType("");
    setClassId(""); setDepartment(""); setFrom(""); setTo(""); setPage(1);
    setCommitted({ search: "", applicantType: "", status: "", leaveType: "", classId: "", department: "", from: "", to: "", page: 1 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const resetForm = () => setForm({
    applicantType: "STUDENT", leaveType: "SICK",
    studentId: "", teacherId: "", staffId: "", fromDate: today(), toDate: today(), reason: "",
  });

  const handleCreate = () => {
    createMutation.mutate({
      applicantType: form.applicantType,
      leaveType:     form.leaveType,
      reason:        form.reason,
      fromDate:      form.fromDate,
      toDate:        form.toDate,
      ...(form.applicantType === "STUDENT" ? { studentId: form.studentId }
        : form.applicantType === "TEACHER" ? { teacherId: form.teacherId }
        : { staffId: form.staffId }),
    });
  };

  const summary = data?.summary || { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };

  const COLS = ["Applicant", "Type", "Leave Type", "Duration", "Reason", "Applied", "Status", "Actions"];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Leave Management"
        description="Review, approve or reject leave requests for students and teachers"
      >
        <Button icon={Plus} onClick={() => setAddOpen(true)}>
          New Request
        </Button>
      </PageHeader>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pending"   value={summary.PENDING}   icon={Clock}         color="bg-amber-50 text-amber-600" />
        <StatCard label="Approved"  value={summary.APPROVED}  icon={CheckCircle}   color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Rejected"  value={summary.REJECTED}  icon={XCircle}       color="bg-red-50 text-red-500" />
        <StatCard label="Cancelled" value={summary.CANCELLED} icon={AlertCircle}   color="bg-gray-50 text-gray-500" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>

          {/* Applicant type */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {[["", "All"], ["STUDENT", "Students"], ["TEACHER", "Teachers"], ["STAFF", "Staff"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setApplicantType(val); setClassId(""); setDepartment(""); setPage(1); setCommitted((prev) => ({ ...prev, applicantType: val, classId: "", department: "", page: 1 })); }}
                className={`px-3 py-2 text-[12px] font-medium transition-colors ${
                  applicantType === val ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="">All</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Leave type */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Leave Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={selectCls}>
              <option value="">All Types</option>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>

          {/* Conditional */}
          {(applicantType === "" || applicantType === "STUDENT") && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-gray-400 font-medium">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
                <option value="">All Classes</option>
                {classesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {(applicantType === "" || applicantType === "TEACHER") && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-gray-400 font-medium">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
                <option value="">All Depts</option>
                {data?.departments?.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Date range */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2 ml-auto mt-auto">
            <button onClick={reset} className="px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
              Reset
            </button>
            <button onClick={apply} className="px-4 py-2 text-[12px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
              <Filter size={12} /> Apply
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div>
        <Table
          columns={COLS}
          isLoading={isLoading || isFetching}
          isEmpty={!isLoading && !isFetching && data?.leaves?.length === 0}
          emptyIcon={CalendarDays}
          emptyText="No leave requests found"
          emptySubtext="Create a new request or adjust your filters"
        >
          {data?.leaves?.map((l) => {
            const sCfg = STATUS_CFG[l.status];
            const ltCfg = LEAVE_TYPE_CFG[l.leaveType];
            const isStudent = l.applicantType === "STUDENT";
            return (
              <Tr key={l.id}>
                {/* Applicant */}
                <Td first>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isStudent ? "bg-indigo-100" : "bg-purple-100"}`}>
                      <span className={`text-[10px] font-semibold ${isStudent ? "text-indigo-600" : "text-purple-600"}`}>
                        {l.firstName?.[0]}{l.lastName?.[0] || ""}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800 leading-tight">
                        {l.firstName} {l.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {isStudent
                          ? `${l.className || ""}${l.section ? ` · ${l.section}` : ""}`
                          : l.designation || ""}
                      </p>
                    </div>
                  </div>
                </Td>

                {/* Applicant type badge */}
                <Td>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    isStudent ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-purple-50 text-purple-600 border-purple-100"
                  }`}>
                    {isStudent ? <Users size={10} /> : <GraduationCap size={10} />}
                    {l.applicantType.charAt(0) + l.applicantType.slice(1).toLowerCase()}
                  </span>
                </Td>

                {/* Leave type */}
                <Td>
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${ltCfg.cls}`}>
                    {l.leaveType.charAt(0) + l.leaveType.slice(1).toLowerCase()}
                  </span>
                </Td>

                {/* Duration */}
                <Td>
                  <p className="text-[12px] text-gray-700 font-medium">{l.totalDays}d</p>
                  <p className="text-[11px] text-gray-400">{fmt(l.fromDate)} → {fmt(l.toDate)}</p>
                </Td>

                {/* Reason */}
                <Td>
                  <p className="text-[12px] text-gray-600 max-w-[180px] truncate" title={l.reason}>
                    {l.reason}
                  </p>
                </Td>

                {/* Applied at */}
                <Td>
                  <span className="text-[12px] text-gray-400">{fmt(l.appliedAt)}</span>
                </Td>

                {/* Status */}
                <Td>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sCfg.cls}`}>
                    {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                  </span>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    {l.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => { setActionLeave({ leave: l, mode: "approve" }); setRemarks(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => { setActionLeave({ leave: l, mode: "reject" }); setRemarks(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    {l.status === "APPROVED" && (
                      <button
                        onClick={() => { setActionLeave({ leave: l, mode: "cancel" }); setRemarks(""); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Cancel"
                      >
                        <AlertCircle size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteLeave(l)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>

        <TableFooter
          page={committed.page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="requests"
          onPageChange={handlePageChange}
        />
      </div>

      {/* ── Add Leave Modal ─────────────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); resetForm(); }} title="New Leave Request">
        <div className="space-y-4">
          {/* Applicant type toggle */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Applicant Type</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {["STUDENT", "TEACHER", "STAFF"].map((t) => (
                <button
                  key={t}
onClick={() => setForm((f) => ({ ...f, applicantType: t, studentId: "", teacherId: "", staffId: "" }))}
                  className={`flex-1 py-2 text-[12px] font-medium transition-colors ${
                    form.applicantType === t ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Applicant selector */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">
              Select {form.applicantType === "STUDENT" ? "Student" : "Teacher"} *
            </label>
            {form.applicantType === "STUDENT" ? (
              <select
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                className={`${inputCls}`}
              >
                <option value="">Select student...</option>
                {studentsData?.students?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.class?.name || ""}
                  </option>
                ))}
              </select>
            ) : form.applicantType === "TEACHER" ? (
              <select
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                className={`${inputCls}`}
              >
                <option value="">Select teacher...</option>
                {teachersData?.teachers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} — {t.department || ""}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={form.staffId}
                onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
                className={`${inputCls}`}
              >
                <option value="">Select staff member...</option>
                {staffData?.staff?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.department || ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Leave type */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Leave Type *</label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
              className={inputCls}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">From Date *</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">To Date *</label>
              <input
                type="date"
                value={form.toDate}
                min={form.fromDate}
                onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Days preview */}
          {form.fromDate && form.toDate && (
            <div className="bg-indigo-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <CalendarDays size={13} className="text-indigo-400" />
              <p className="text-[12px] text-indigo-600 font-medium">
                {Math.max(1, Math.round((new Date(form.toDate) - new Date(form.fromDate)) / 86400000) + 1)} day(s) of leave
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Reason *</label>
            <textarea
              rows={3}
              placeholder="Describe the reason for leave..."
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className={`${inputCls} resize-none`}
            />
          </div>

          {createMutation.isError && (
            <p className="text-[12px] text-red-500">Failed to create request. Please try again.</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => { setAddOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={
                createMutation.isPending ||
                !form.reason ||
                (form.applicantType === "STUDENT" ? !form.studentId
                  : form.applicantType === "TEACHER" ? !form.teacherId
                  : !form.staffId)
              }
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Approve / Reject / Cancel Modal ───────────────────────────────── */}
      <Modal
        open={!!actionLeave}
        onClose={() => { setActionLeave(null); setRemarks(""); }}
        title={
          actionLeave?.mode === "approve" ? "Approve Leave" :
          actionLeave?.mode === "reject"  ? "Reject Leave"  : "Cancel Leave"
        }
      >
        {actionLeave && (
          <div className="space-y-4">
            {/* Leave summary */}
            <div className="bg-gray-50 rounded-lg px-3 py-3 space-y-1">
              <p className="text-[13px] font-medium text-gray-800">
                {actionLeave.leave.firstName} {actionLeave.leave.lastName}
              </p>
              <p className="text-[12px] text-gray-500">
                {actionLeave.leave.leaveType.charAt(0) + actionLeave.leave.leaveType.slice(1).toLowerCase()} leave ·{" "}
                {actionLeave.leave.totalDays} day(s) ·{" "}
                {fmt(actionLeave.leave.fromDate)} → {fmt(actionLeave.leave.toDate)}
              </p>
              <p className="text-[12px] text-gray-400 italic">"{actionLeave.leave.reason}"</p>
            </div>

            {actionLeave.mode === "approve" && (
              <div className="bg-emerald-50 rounded-lg px-3 py-2">
                <p className="text-[12px] text-emerald-700">
                  Approving will automatically mark attendance as <strong>Leave</strong> for all days in this period.
                </p>
              </div>
            )}

            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">
                Remarks {actionLeave.mode === "reject" ? "(required)" : "(optional)"}
              </label>
              <textarea
                rows={2}
                placeholder="Add a note..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>

            {actionMutation.isError && (
              <p className="text-[12px] text-red-500">Action failed. Please try again.</p>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setActionLeave(null); setRemarks(""); }}>
                Cancel
              </Button>
              <Button
                variant={actionLeave.mode === "approve" ? "primary" : "danger"}
                className="flex-1"
                disabled={
                  actionMutation.isPending ||
                  (actionLeave.mode === "reject" && !remarks.trim())
                }
                onClick={() => actionMutation.mutate({
                  id: actionLeave.leave.id,
                  mode: actionLeave.mode,
                  remarks,
                })}
              >
                {actionMutation.isPending
                  ? "Processing..."
                  : actionLeave.mode === "approve" ? "Approve"
                  : actionLeave.mode === "reject"  ? "Reject"
                  : "Cancel Leave"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Modal ────────────────────────────────────────────────────── */}
      <Modal open={!!deleteLeave} onClose={() => setDeleteLeave(null)} title="Delete Leave Request">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this leave request?</p>
            <p className="text-[12px] text-gray-400 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteLeave(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteLeave.id)}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}