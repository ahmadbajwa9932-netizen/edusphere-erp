"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard from "../../../../components/ui/StatCard";
import Button from "../../../../components/ui/Button";
import Modal from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Pencil,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  Wallet,
  Users,
  UserSquare,
  CreditCard,
  Zap,
  RotateCcw,
  X,
  Eye,
} from "lucide-react";

// ── constants ────────────────────────────────────────────────────────────────
const EMPLOYEE_TYPES = ["TEACHER", "STAFF"];
const STATUSES = ["PENDING", "PAID", "CANCELLED"];
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "ONLINE"];

const STATUS_CFG = {
  PENDING:   { cls: "bg-amber-50 text-amber-600 border-amber-200",   label: "Pending",   icon: Clock },
  PAID:      { cls: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Paid",  icon: CheckCircle },
  CANCELLED: { cls: "bg-red-50 text-red-400 border-red-200",         label: "Cancelled", icon: XCircle },
};

const PAYMENT_CFG = {
  CASH:          { cls: "bg-lime-50 text-lime-600 border-lime-200",     label: "Cash" },
  BANK_TRANSFER: { cls: "bg-blue-50 text-blue-600 border-blue-200",     label: "Bank Transfer" },
  CHEQUE:        { cls: "bg-violet-50 text-violet-600 border-violet-200", label: "Cheque" },
  ONLINE:        { cls: "bg-indigo-50 text-indigo-600 border-indigo-200", label: "Online" },
};

const EMP_CFG = {
  TEACHER: { cls: "bg-indigo-50 text-indigo-600 border-indigo-100", icon: Users },
  STAFF:   { cls: "bg-cyan-50 text-cyan-600 border-cyan-100",        icon: UserSquare },
};

const fmt = (n) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const currentYear = () => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const inputCls =
  "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

const emptyGenerateForm = () => ({
  month: currentMonth(),
  academicYear: currentYear(),
  employeeType: "ALL",
});

const emptyPayForm = () => ({
  paymentMethod: "CASH",
  paidBy: "",
  remarks: "",
});

const emptyEditForm = () => ({
  bonus: "",
  deduction: "",
  remarks: "",
});

// ── main ─────────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const qc = useQueryClient();

  // ── filter state ─────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [employeeType, setEmployeeType] = useState("");
  const [status,       setStatus]       = useState("");
  const [month,        setMonth]        = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [department,   setDepartment]   = useState("");
  const [page,         setPage]         = useState(1);

  const [committed, setCommitted] = useState({
    search: "", employeeType: "", status: "", month: "",
    academicYear: "", department: "", page: 1,
  });

  // ── modal state ───────────────────────────────────────────────────────────
  const [generateOpen,  setGenerateOpen]  = useState(false);
  const [payTarget,     setPayTarget]     = useState(null); // mark as paid
  const [editTarget,    setEditTarget]    = useState(null); // edit bonus/deduction
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [viewTarget,    setViewTarget]    = useState(null); // view details

  // ── form state ────────────────────────────────────────────────────────────
  const [generateForm, setGenerateForm] = useState(emptyGenerateForm());
  const [payForm,      setPayForm]      = useState(emptyPayForm());
  const [editForm,     setEditForm]     = useState(emptyEditForm());
  const [formError,    setFormError]    = useState("");

  // ── queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["payroll", committed],
    queryFn: () => payrollApi.getAll(committed),
    keepPreviousData: true,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["payroll"] });

  const generateMutation = useMutation({
    mutationFn: payrollApi.generate,
    onSuccess: (res) => {
      invalidate();
      setGenerateOpen(false);
      setGenerateForm(emptyGenerateForm());
      setFormError("");
      alert(res.message);
    },
    onError: (err) => setFormError(err?.response?.data?.error || "Failed to generate payroll"),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }) => payrollApi.markPaid(id, data),
    onSuccess: () => { invalidate(); setPayTarget(null); setPayForm(emptyPayForm()); setFormError(""); },
    onError: (err) => setFormError(err?.response?.data?.error || "Failed to mark as paid"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => payrollApi.update(id, data),
    onSuccess: () => { invalidate(); setEditTarget(null); setEditForm(emptyEditForm()); setFormError(""); },
    onError: (err) => setFormError(err?.response?.data?.error || "Failed to update"),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }) => payrollApi.cancel(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
    onError: (err) => alert(err?.response?.data?.error || "Failed to cancel"),
  });

  const deleteMutation = useMutation({
    mutationFn: payrollApi.delete,
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
    onError: (err) => alert(err?.response?.data?.error || "Failed to delete"),
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const apply = () => {
    setPage(1);
    setCommitted({ search, employeeType, status, month, academicYear, department, page: 1 });
  };

  const reset = () => {
    setSearch(""); setEmployeeType(""); setStatus(""); setMonth("");
    setAcademicYear(""); setDepartment(""); setPage(1);
    setCommitted({ search: "", employeeType: "", status: "", month: "", academicYear: "", department: "", page: 1 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const openEdit = (p) => {
    setEditForm({ bonus: String(p.bonus), deduction: String(p.deduction), remarks: p.remarks || "" });
    setFormError("");
    setEditTarget(p);
  };

  const openPay = (p) => {
    setPayForm({ paymentMethod: p.paymentMethod || "CASH", paidBy: p.paidBy || "", remarks: p.remarks || "" });
    setFormError("");
    setPayTarget(p);
  };

  const handleGenerate = () => {
    setFormError("");
    if (!generateForm.month || !generateForm.academicYear || !generateForm.employeeType) {
      setFormError("All fields are required.");
      return;
    }
    generateMutation.mutate(generateForm);
  };

  const handleMarkPaid = () => {
    setFormError("");
    if (!payForm.paidBy.trim()) { setFormError("Paid by is required."); return; }
    markPaidMutation.mutate({ id: payTarget.id, data: payForm });
  };

  const handleUpdate = () => {
    setFormError("");
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        bonus:     parseFloat(editForm.bonus)     || 0,
        deduction: parseFloat(editForm.deduction) || 0,
        remarks:   editForm.remarks || null,
      },
    });
  };

  const summary  = data?.summary || {};
  const payrolls = data?.payrolls || [];

  const COLS = [
    "Employee", "Type", "Month", "Basic Salary", "Bonus", "Deduction",
    "Net Salary", "Payment", "Status", "Paid At", "Actions",
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Payroll Management"
        description="Generate and manage monthly payroll for teachers and staff"
      >
        <Button icon={Plus} onClick={() => { setGenerateForm(emptyGenerateForm()); setFormError(""); setGenerateOpen(true); }}>
          Generate Payroll
        </Button>
      </PageHeader>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Paid"
          value={fmt(summary.totalPaid)}
          icon={CheckCircle}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Pending Amount"
          value={fmt(summary.totalPending)}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Paid Records"
          value={summary.paidCount ?? 0}
          icon={Wallet}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Pending Records"
          value={summary.pendingCount ?? 0}
          icon={Banknote}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search name, employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>

          {/* Employee Type */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Type</label>
            <select value={employeeType} onChange={(e) => setEmployeeType(e.target.value)} className={selectCls}>
              <option value="">All</option>
              <option value="TEACHER">Teachers</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
              <option value="">All Months</option>
              {data?.months?.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Academic Year</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
              <option value="">All Years</option>
              {data?.academicYears?.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
              <option value="">All Departments</option>
              {data?.departments?.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

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
          isEmpty={!isLoading && !isFetching && payrolls.length === 0}
          emptyIcon={Banknote}
          emptyText="No payroll records found"
          emptySubtext="Generate payroll for a month or adjust your filters"
        >
          {payrolls.map((p) => {
            const stCfg  = STATUS_CFG[p.status];
            const empCfg = EMP_CFG[p.employeeType];
            const StatusIcon = stCfg.icon;

            return (
              <Tr key={p.id}>
                {/* Employee */}
                <Td first>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">
                      {p.employeeName}
                    </p>
                    <p className="text-[11px] text-gray-400">{p.employeeId}</p>
                    {p.designation && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{p.designation}</p>
                    )}
                  </div>
                </Td>

                {/* Employee Type */}
                <Td>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${empCfg.cls}`}>
                    {p.employeeType === "TEACHER" ? <Users size={10} /> : <UserSquare size={10} />}
                    {p.employeeType === "TEACHER" ? "Teacher" : "Staff"}
                  </span>
                  {p.department && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[100px]">{p.department}</p>
                  )}
                </Td>

                {/* Month */}
                <Td>
                  <p className="text-[13px] font-medium text-gray-700">{p.month}</p>
                  <p className="text-[11px] text-gray-400">{p.academicYear}</p>
                </Td>

                {/* Basic Salary */}
                <Td>
                  <p className="text-[13px] font-semibold text-gray-800">{fmt(p.basicSalary)}</p>
                </Td>

                {/* Bonus */}
                <Td>
                  <p className={`text-[13px] font-medium ${p.bonus > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                    {p.bonus > 0 ? `+${fmt(p.bonus)}` : "—"}
                  </p>
                </Td>

                {/* Deduction */}
                <Td>
                  <p className={`text-[13px] font-medium ${p.deduction > 0 ? "text-red-500" : "text-gray-400"}`}>
                    {p.deduction > 0 ? `-${fmt(p.deduction)}` : "—"}
                  </p>
                </Td>

                {/* Net Salary */}
                <Td>
                  <p className="text-[13px] font-bold text-indigo-700">{fmt(p.netSalary)}</p>
                </Td>

                {/* Payment Method */}
                <Td>
                  {p.paymentMethod ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${PAYMENT_CFG[p.paymentMethod]?.cls}`}>
                      {PAYMENT_CFG[p.paymentMethod]?.label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300">—</span>
                  )}
                </Td>

                {/* Status */}
                <Td>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${stCfg.cls}`}>
                    <StatusIcon size={10} />
                    {stCfg.label}
                  </span>
                </Td>

                {/* Paid At */}
                <Td>
                  <div>
                    <p className="text-[12px] text-gray-600">{fmtDate(p.paidAt)}</p>
                    {p.paidBy && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[100px]">{p.paidBy}</p>
                    )}
                  </div>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    {/* View */}
                    <button
                      onClick={() => setViewTarget(p)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="View Details"
                    >
                      <Eye size={13} />
                    </button>

                    {/* Edit bonus/deduction — only if not cancelled */}
                    {p.status !== "CANCELLED" && (
                      <button
                        onClick={() => openEdit(p)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Mark Paid — only if PENDING */}
                    {p.status === "PENDING" && (
                      <button
                        onClick={() => openPay(p)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Mark as Paid"
                      >
                        <Zap size={13} />
                      </button>
                    )}

                    {/* Revert to Pending — only if PAID */}
                    {p.status === "PAID" && (
                      <button
                        onClick={() => updateMutation.mutate({ id: p.id, data: { status: "PENDING" } })}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                        title="Revert to Pending"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}

                    {/* Delete / Cancel */}
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title={p.status === "PAID" ? "Cannot delete paid" : "Delete"}
                    >
                      <Trash2 size={13} />
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
          label="payroll records"
          onPageChange={handlePageChange}
        />
      </div>

      {/* ── Generate Payroll Modal ──────────────────────────────────────────── */}
      <Modal
        open={generateOpen}
        onClose={() => { setGenerateOpen(false); setGenerateForm(emptyGenerateForm()); setFormError(""); }}
        title="Generate Payroll"
      >
        <div className="space-y-4">
          <p className="text-[12px] text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            This will create payroll records for all active employees with a salary set.
            Already-generated records for the selected month will be skipped.
          </p>

          {/* Month */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Month *</label>
            <input
              type="month"
              value={generateForm.month}
              onChange={(e) => setGenerateForm((f) => ({ ...f, month: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Academic Year */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Academic Year *</label>
            <input
              type="text"
              placeholder="e.g. 2025-26"
              value={generateForm.academicYear}
              onChange={(e) => setGenerateForm((f) => ({ ...f, academicYear: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Employee Type */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Generate For *</label>
            <div className="grid grid-cols-3 gap-2">
              {["ALL", "TEACHER", "STAFF"].map((t) => (
                <button
                  key={t}
                  onClick={() => setGenerateForm((f) => ({ ...f, employeeType: t }))}
                  className={`py-2 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                    generateForm.employeeType === t
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {t === "ALL" ? "All" : t === "TEACHER" ? "Teachers" : "Staff"}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-[12px] text-red-500">{formError}</p>}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setGenerateOpen(false); setGenerateForm(emptyGenerateForm()); setFormError(""); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={generateMutation.isPending}
              onClick={handleGenerate}
            >
              {generateMutation.isPending ? "Generating..." : "Generate Payroll"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Mark as Paid Modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!payTarget}
        onClose={() => { setPayTarget(null); setPayForm(emptyPayForm()); setFormError(""); }}
        title="Mark as Paid"
      >
        {payTarget && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-gray-500">{payTarget.employeeName}</p>
                <p className="text-[11px] text-gray-400">{payTarget.month} • {payTarget.employeeId}</p>
              </div>
              <p className="text-[18px] font-bold text-emerald-700">{fmt(payTarget.netSalary)}</p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Payment Method *</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayForm((f) => ({ ...f, paymentMethod: m }))}
                    className={`py-2 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                      payForm.paymentMethod === m
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {PAYMENT_CFG[m].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid By */}
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Paid By (Admin Name) *</label>
              <input
                placeholder="e.g. Principal / Admin"
                value={payForm.paidBy}
                onChange={(e) => setPayForm((f) => ({ ...f, paidBy: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Remarks</label>
              <textarea
                rows={2}
                placeholder="Optional notes..."
                value={payForm.remarks}
                onChange={(e) => setPayForm((f) => ({ ...f, remarks: e.target.value }))}
                className={`${inputCls} resize-none`}
              />
            </div>

            {formError && <p className="text-[12px] text-red-500">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setPayTarget(null); setPayForm(emptyPayForm()); setFormError(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={markPaidMutation.isPending}
                onClick={handleMarkPaid}
              >
                {markPaidMutation.isPending ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit Bonus / Deduction Modal ────────────────────────────────────── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); setEditForm(emptyEditForm()); setFormError(""); }}
        title="Edit Payroll"
      >
        {editTarget && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              <p className="text-[13px] font-medium text-gray-800">{editTarget.employeeName}</p>
              <p className="text-[11px] text-gray-400">{editTarget.month} • Basic: {fmt(editTarget.basicSalary)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Bonus */}
              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Bonus (PKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editForm.bonus}
                  onChange={(e) => setEditForm((f) => ({ ...f, bonus: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Deduction */}
              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Deduction (PKR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editForm.deduction}
                  onChange={(e) => setEditForm((f) => ({ ...f, deduction: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Net preview */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-[12px] text-indigo-600 font-medium">Net Salary Preview</span>
              <span className="text-[15px] font-bold text-indigo-700">
                {fmt(
                  (editTarget.basicSalary || 0) +
                  (parseFloat(editForm.bonus) || 0) -
                  (parseFloat(editForm.deduction) || 0)
                )}
              </span>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Remarks</label>
              <textarea
                rows={2}
                placeholder="Reason for changes..."
                value={editForm.remarks}
                onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                className={`${inputCls} resize-none`}
              />
            </div>

            {formError && <p className="text-[12px] text-red-500">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setEditTarget(null); setEditForm(emptyEditForm()); setFormError(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={updateMutation.isPending}
                onClick={handleUpdate}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Details Modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="Payroll Details"
      >
        {viewTarget && (
          <div className="space-y-4">
            {/* Employee Info */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Employee</p>
              <p className="text-[14px] font-semibold text-gray-800">{viewTarget.employeeName}</p>
              <div className="flex flex-wrap gap-3 text-[12px] text-gray-500">
                <span>ID: {viewTarget.employeeId}</span>
                {viewTarget.designation && <span>{viewTarget.designation}</span>}
                {viewTarget.department && <span>{viewTarget.department}</span>}
                {viewTarget.phone && <span>{viewTarget.phone}</span>}
              </div>
            </div>

            {/* Payroll Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Month",         value: viewTarget.month },
                { label: "Academic Year", value: viewTarget.academicYear },
                { label: "Basic Salary",  value: fmt(viewTarget.basicSalary) },
                { label: "Bonus",         value: fmt(viewTarget.bonus) },
                { label: "Deduction",     value: fmt(viewTarget.deduction) },
                { label: "Net Salary",    value: fmt(viewTarget.netSalary), highlight: true },
                { label: "Status",        value: STATUS_CFG[viewTarget.status]?.label },
                { label: "Payment",       value: PAYMENT_CFG[viewTarget.paymentMethod]?.label || "—" },
                { label: "Paid At",       value: fmtDate(viewTarget.paidAt) },
                { label: "Paid By",       value: viewTarget.paidBy || "—" },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-lg border px-3 py-2 ${highlight ? "bg-indigo-50 border-indigo-100" : "bg-white border-gray-100"}`}>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                  <p className={`text-[13px] font-semibold mt-0.5 ${highlight ? "text-indigo-700" : "text-gray-800"}`}>{value}</p>
                </div>
              ))}
            </div>

            {viewTarget.remarks && (
              <div className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Remarks</p>
                <p className="text-[12px] text-gray-600">{viewTarget.remarks}</p>
              </div>
            )}

            <Button className="w-full" variant="secondary" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* ── Delete Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.status === "PAID" ? "Cannot Delete" : "Delete Payroll Record"}
      >
        {deleteTarget?.status === "PAID" ? (
          <div className="flex flex-col items-center text-center gap-3 pb-2">
            <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center">
              <XCircle size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-800">Cannot delete a paid payroll record</p>
              <p className="text-[12px] text-gray-400 mt-1">
                You can cancel this record instead to mark it as invalid.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: deleteTarget.id })}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Record"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 pb-2">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-800">
                Delete payroll for{" "}
                <span className="font-semibold">{deleteTarget?.employeeName}</span>{" "}
                ({deleteTarget?.month})?
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}