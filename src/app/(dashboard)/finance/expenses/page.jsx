"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard   from "../../../../components/ui/StatCard";
import Button     from "../../../../components/ui/Button";
import Modal      from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Search, Filter, Trash2, Pencil,
  Banknote, CheckCircle, Clock, XCircle,
  Receipt, TrendingUp, Wallet, ChevronDown,
  ChevronUp, X, BarChart3,
} from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "SALARY","UTILITIES","MAINTENANCE","STATIONERY","TRANSPORT",
  "FOOD","EVENTS","EQUIPMENT","RENT","MARKETING","CLEANING","SECURITY","OTHER",
];

const PAYMENT_METHODS = ["CASH","BANK_TRANSFER","CHEQUE","ONLINE"];

const CATEGORY_CFG = {
  SALARY:      { cls: "bg-indigo-50 text-indigo-600 border-indigo-100",   label: "Salary"      },
  UTILITIES:   { cls: "bg-yellow-50 text-yellow-600 border-yellow-100",  label: "Utilities"   },
  MAINTENANCE: { cls: "bg-orange-50 text-orange-600 border-orange-100",  label: "Maintenance" },
  STATIONERY:  { cls: "bg-cyan-50 text-cyan-600 border-cyan-100",        label: "Stationery"  },
  TRANSPORT:   { cls: "bg-blue-50 text-blue-600 border-blue-100",        label: "Transport"   },
  FOOD:        { cls: "bg-lime-50 text-lime-600 border-lime-100",        label: "Food"        },
  EVENTS:      { cls: "bg-pink-50 text-pink-600 border-pink-100",        label: "Events"      },
  EQUIPMENT:   { cls: "bg-violet-50 text-violet-600 border-violet-100",  label: "Equipment"   },
  RENT:        { cls: "bg-rose-50 text-rose-600 border-rose-100",        label: "Rent"        },
  MARKETING:   { cls: "bg-teal-50 text-teal-600 border-teal-100",        label: "Marketing"   },
  CLEANING:    { cls: "bg-sky-50 text-sky-600 border-sky-100",           label: "Cleaning"    },
  SECURITY:    { cls: "bg-slate-50 text-slate-600 border-slate-200",     label: "Security"    },
  OTHER:       { cls: "bg-gray-50 text-gray-500 border-gray-200",        label: "Other"       },
};

const STATUS_CFG = {
  PAID:      { cls: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Paid",      icon: CheckCircle },
  PENDING:   { cls: "bg-amber-50 text-amber-600 border-amber-200",      label: "Pending",   icon: Clock       },
  CANCELLED: { cls: "bg-gray-50 text-gray-400 border-gray-200",         label: "Cancelled", icon: XCircle     },
};

const PAYMENT_CFG = {
  CASH:          { label: "Cash"          },
  BANK_TRANSFER: { label: "Bank Transfer" },
  CHEQUE:        { label: "Cheque"        },
  ONLINE:        { label: "Online"        },
};

const fmt = (n) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const inputCls  = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

const currentYear = () => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  title: "", amount: "", category: "OTHER", date: todayStr(),
  paidTo: "", paymentMethod: "CASH", status: "PENDING",
  approvedBy: "", referenceNo: "", description: "",
  academicYear: currentYear(),
});

// ── Category breakdown mini-bar ───────────────────────────────────────────────
function CategoryBar({ byCategory }) {
  if (!byCategory?.length) return null;
  const max = Math.max(...byCategory.map((c) => c.total));

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} className="text-indigo-500" />
        <p className="text-[12px] font-semibold text-gray-600">Spending by Category</p>
      </div>
      <div className="space-y-2">
        {byCategory.slice(0, 6).map((c) => {
          const cfg = CATEGORY_CFG[c.category] || CATEGORY_CFG.OTHER;
          const pct = max > 0 ? (c.total / max) * 100 : 0;
          return (
            <div key={c.category} className="flex items-center gap-3">
              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border w-24 justify-center shrink-0 ${cfg.cls}`}>
                {cfg.label}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-gray-600 w-24 text-right shrink-0">{fmt(c.total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const qc = useQueryClient();

  // ── filter state ─────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [category,      setCategory]      = useState("");
  const [status,        setStatus]        = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [academicYear,  setAcademicYear]  = useState("");
  const [from,          setFrom]          = useState("");
  const [to,            setTo]            = useState("");
  const [page,          setPage]          = useState(1);
  const [showDateRange, setShowDateRange] = useState(false);

  const [committed, setCommitted] = useState({
    search: "", category: "", status: "", paymentMethod: "",
    academicYear: "", from: "", to: "", page: 1,
  });

  // ── modal state ───────────────────────────────────────────────────────────
  const [addOpen,      setAddOpen]      = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── form state ────────────────────────────────────────────────────────────
  const [form,      setForm]      = useState(emptyForm());
  const [formError, setFormError] = useState("");

  // ── queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["expenses", committed],
    queryFn:  () => expensesApi.getAll(committed),
    keepPreviousData: true,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["expenses"] });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess:  () => { invalidate(); setAddOpen(false); setForm(emptyForm()); setFormError(""); },
    onError:    (err) => setFormError(err?.response?.data?.error || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expensesApi.update(id, data),
    onSuccess:  () => { invalidate(); setEditTarget(null); setForm(emptyForm()); setFormError(""); },
    onError:    (err) => setFormError(err?.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess:  () => { invalidate(); setDeleteTarget(null); },
    onError:    (err) => alert(err?.response?.data?.error || "Failed to delete"),
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const apply = () => {
    setPage(1);
    setCommitted({ search, category, status, paymentMethod, academicYear, from, to, page: 1 });
  };

  const reset = () => {
    setSearch(""); setCategory(""); setStatus(""); setPaymentMethod("");
    setAcademicYear(""); setFrom(""); setTo(""); setPage(1);
    setCommitted({ search: "", category: "", status: "", paymentMethod: "", academicYear: "", from: "", to: "", page: 1 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const openEdit = (e) => {
    setForm({
      title:         e.title,
      amount:        String(e.amount),
      category:      e.category,
      date:          e.date?.split("T")[0] || todayStr(),
      paidTo:        e.paidTo        || "",
      paymentMethod: e.paymentMethod,
      status:        e.status,
      approvedBy:    e.approvedBy    || "",
      referenceNo:   e.referenceNo   || "",
      description:   e.description   || "",
      academicYear:  e.academicYear,
    });
    setFormError("");
    setEditTarget(e);
  };

  const handleSubmit = () => {
    setFormError("");
    if (!form.title.trim() || !form.amount || !form.date || !form.academicYear.trim()) {
      setFormError("Title, amount, date and academic year are required.");
      return;
    }
    const payload = {
      title:         form.title.trim(),
      amount:        parseFloat(form.amount),
      category:      form.category,
      date:          form.date,
      paidTo:        form.paidTo.trim()       || null,
      paymentMethod: form.paymentMethod,
      status:        form.status,
      approvedBy:    form.approvedBy.trim()   || null,
      referenceNo:   form.referenceNo.trim()  || null,
      description:   form.description.trim()  || null,
      academicYear:  form.academicYear.trim(),
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const summary    = data?.summary    || {};
  const byCategory = data?.byCategory || [];
  const isPending  = createMutation.isPending || updateMutation.isPending;

  const COLS = ["Title", "Category", "Date", "Paid To", "Amount", "Payment", "Status", "Ref No.", "Actions"];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Expenses"
        description="Track and manage all school expenditures"
      >
        <Button icon={Plus} onClick={() => { setForm(emptyForm()); setFormError(""); setAddOpen(true); }}>
          Add Expense
        </Button>
      </PageHeader>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Paid"    value={fmt(summary.totalPaidAmount)}    icon={CheckCircle} color="bg-emerald-50 text-emerald-600" isAmount />
        <StatCard label="Pending"       value={fmt(summary.totalPendingAmount)} icon={Clock}       color="bg-amber-50 text-amber-600"    isAmount />
        <StatCard label="Paid Count"    value={summary.paidCount    ?? 0}       icon={Receipt}     color="bg-indigo-50 text-indigo-600"  />
        <StatCard label="Pending Count" value={summary.pendingCount ?? 0}       icon={Wallet}      color="bg-orange-50 text-orange-600"  />
      </div>

      {/* ── Category bar chart ──────────────────────────────────────────────── */}
      {byCategory.length > 0 && <CategoryBar byCategory={byCategory} />}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="Search title, vendor, ref..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_CFG[c].label}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="">All</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Payment method */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Payment</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectCls}>
              <option value="">All</option>
              {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{PAYMENT_CFG[p].label}</option>)}
            </select>
          </div>

          {/* Academic year */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Academic Year</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
              <option value="">All Years</option>
              {data?.academicYears?.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Date range toggle */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium opacity-0">.</label>
            <button
              onClick={() => setShowDateRange((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg border transition-colors ${
                showDateRange || from || to
                  ? "border-indigo-300 text-indigo-600 bg-indigo-50"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {showDateRange ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Date Range
            </button>
          </div>

          <div className="flex items-end gap-2 ml-auto mt-auto">
            <button onClick={reset} className="px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
              Reset
            </button>
            <button onClick={apply} className="px-4 py-2 text-[12px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
              <Filter size={12} /> Apply
            </button>
          </div>
        </div>

        {/* Date range row */}
        {showDateRange && (
          <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-gray-400 font-medium">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="text-[13px] border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 text-gray-600" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-gray-400 font-medium">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="text-[13px] border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 text-gray-600" />
            </div>
            {(from || to) && (
              <button onClick={() => { setFrom(""); setTo(""); }}
                className="mt-4 text-gray-300 hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div>
        <Table
          columns={COLS}
          isLoading={isLoading || isFetching}
          isEmpty={!isLoading && !isFetching && data?.expenses?.length === 0}
          emptyIcon={Banknote}
          emptyText="No expenses found"
          emptySubtext="Add a new expense or adjust your filters"
        >
          {data?.expenses?.map((e) => {
            const catCfg    = CATEGORY_CFG[e.category] || CATEGORY_CFG.OTHER;
            const statusCfg = STATUS_CFG[e.status]     || STATUS_CFG.PENDING;
            const StatusIcon = statusCfg.icon;

            return (
              <React.Fragment key={e.id}>
                <Tr>
                  {/* Title */}
                  <Td first>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800 leading-tight">{e.title}</p>
                      {e.description && (
                        <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{e.description}</p>
                      )}
                    </div>
                  </Td>

                  {/* Category */}
                  <Td>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${catCfg.cls}`}>
                      {catCfg.label}
                    </span>
                  </Td>

                  {/* Date */}
                  <Td>
                    <span className="text-[12px] text-gray-600">{fmtDate(e.date)}</span>
                  </Td>

                  {/* Paid To */}
                  <Td>
                    <span className="text-[12px] text-gray-600">{e.paidTo || "—"}</span>
                  </Td>

                  {/* Amount */}
                  <Td>
                    <p className="text-[13px] font-bold text-gray-800">{fmt(e.amount)}</p>
                  </Td>

                  {/* Payment method */}
                  <Td>
                    <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                      {PAYMENT_CFG[e.paymentMethod]?.label || e.paymentMethod}
                    </span>
                  </Td>

                  {/* Status */}
                  <Td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusCfg.cls}`}>
                      <StatusIcon size={10} />
                      {statusCfg.label}
                    </span>
                  </Td>

                  {/* Ref No */}
                  <Td>
                    <span className="text-[11px] text-gray-500 font-mono">{e.referenceNo || "—"}</span>
                  </Td>

                  {/* Actions */}
                  <Td>
                    <div className="flex items-center gap-0.5">
                      {e.status !== "CANCELLED" && (
                        <button
                          onClick={() => openEdit(e)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {e.status !== "PAID" && (
                        <button
                          onClick={() => setDeleteTarget(e)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              </React.Fragment>
            );
          })}
        </Table>

        <TableFooter
          page={committed.page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="expenses"
          onPageChange={handlePageChange}
        />
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      <Modal
        open={addOpen || !!editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null); setForm(emptyForm()); setFormError(""); }}
        title={editTarget ? "Edit Expense" : "Add Expense"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Title */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Title *</label>
            <input
              placeholder="e.g. Electricity Bill - October"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Amount (PKR) *</label>
              <input
                type="number" min="0" placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Category + Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_CFG[c].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className={inputCls}>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{PAYMENT_CFG[p].label}</option>)}
              </select>
            </div>
          </div>

          {/* Status + Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Academic Year *</label>
              <input
                placeholder="e.g. 2025-26"
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Paid To + Reference No */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Paid To (Vendor)</label>
              <input
                placeholder="e.g. LESCO, Al-Noor Supplies"
                value={form.paidTo}
                onChange={(e) => setForm((f) => ({ ...f, paidTo: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Reference / Voucher No.</label>
              <input
                placeholder="e.g. INV-2025-001"
                value={form.referenceNo}
                onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Approved By */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Approved By</label>
            <input
              placeholder="Admin name who approved this expense"
              value={form.approvedBy}
              onChange={(e) => setForm((f) => ({ ...f, approvedBy: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Description / Notes</label>
            <textarea
              rows={2} placeholder="Optional notes..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputCls} resize-none`}
            />
          </div>

          {formError && <p className="text-[12px] text-red-500">{formError}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1"
              onClick={() => { setAddOpen(false); setEditTarget(null); setForm(emptyForm()); setFormError(""); }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={isPending} onClick={handleSubmit}>
              {isPending ? "Saving..." : editTarget ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ────────────────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Expense">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">
              Delete "<span className="font-semibold">{deleteTarget?.title}</span>"?
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              This cannot be undone. Paid expenses cannot be deleted.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteTarget.id)}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}