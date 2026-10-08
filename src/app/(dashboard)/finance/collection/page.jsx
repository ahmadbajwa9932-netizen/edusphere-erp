"use client";

import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feeCollectionsApi, feeStructuresApi, classesApi } from "../../../../lib/api";
import PageHeader  from "../../../../components/ui/PageHeader";
import StatCard    from "../../../../components/ui/StatCard";
import Button      from "../../../../components/ui/Button";
import Modal       from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Search, Filter, Trash2, Banknote,
  CheckCircle, XCircle, Clock, AlertTriangle,
  Printer, X, ChevronDown, Receipt as ReceiptIcon, TrendingUp,
  Wallet,
} from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  PAID:    { cls: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Paid",    icon: CheckCircle  },
  UNPAID:  { cls: "bg-gray-50 text-gray-500 border-gray-200",         label: "Unpaid",  icon: Clock        },
  PARTIAL: { cls: "bg-amber-50 text-amber-600 border-amber-200",      label: "Partial", icon: TrendingUp   },
  OVERDUE: { cls: "bg-red-50 text-red-500 border-red-200",            label: "Overdue", icon: AlertTriangle },
  WAIVED:  { cls: "bg-purple-50 text-purple-600 border-purple-200",   label: "Waived",  icon: XCircle      },
};

const FEE_TYPE_CFG = {
  TUITION:     "bg-indigo-50 text-indigo-600 border-indigo-100",
  ADMISSION:   "bg-emerald-50 text-emerald-600 border-emerald-100",
  EXAMINATION: "bg-amber-50 text-amber-600 border-amber-100",
  LIBRARY:     "bg-cyan-50 text-cyan-600 border-cyan-100",
  TRANSPORT:   "bg-orange-50 text-orange-600 border-orange-100",
  SPORTS:      "bg-lime-50 text-lime-600 border-lime-100",
  LABORATORY:  "bg-purple-50 text-purple-600 border-purple-100",
  UNIFORM:     "bg-pink-50 text-pink-600 border-pink-100",
  OTHER:       "bg-gray-50 text-gray-500 border-gray-200",
};

const fmt = (n) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const inputCls  = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

// ── generate form default ────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const emptyGenerate = () => ({
  classId: "", feeStructureId: "", month: currentMonth(), dueDate: todayStr(),
});

const emptyPay = () => ({
  amountPaid: "", discount: "0", fine: "0", remarks: "",
});

// ── Receipt component (for print) ────────────────────────────────────────────
function Receipt({ collection, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=420,height=600");
    win.document.write(`
      <html><head><title>Fee Receipt</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding: 24px; font-size: 13px; color: #111; }
        .header { text-align:center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; font-weight: 700; color: #4f46e5; }
        .header p  { font-size: 11px; color: #666; margin-top: 2px; }
        .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:600; background:#d1fae5; color:#065f46; }
        .row { display:flex; justify-content:space-between; padding: 5px 0; border-bottom:1px dashed #e5e7eb; }
        .row span:first-child { color:#6b7280; }
        .row span:last-child  { font-weight:600; }
        .total-row { display:flex; justify-content:space-between; padding:8px 0; margin-top:4px; font-size:14px; font-weight:700; color:#4f46e5; border-top:2px solid #4f46e5; }
        .footer { text-align:center; margin-top:20px; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:10px; }
        @media print { body { padding: 16px; } }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const net = collection.amountDue - collection.discount + collection.fine;

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div ref={printRef} className="bg-white border border-gray-100 rounded-xl p-5">
        {/* Header */}
        <div className="header text-center border-b-2 border-indigo-500 pb-3 mb-4">
          <h1 className="text-[17px] font-bold text-indigo-600">Al-Noor School</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Fee Payment Receipt</p>
        </div>

        {/* Receipt meta */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[11px] text-gray-400">Receipt No.</p>
            <p className="text-[13px] font-bold text-gray-800">{collection.receiptNo}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">Date</p>
            <p className="text-[13px] font-medium text-gray-700">{fmtDate(collection.paidAt)}</p>
          </div>
        </div>

        {/* Student info */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4 space-y-1">
          <div className="row flex justify-between py-0.5">
            <span className="text-[11px] text-gray-400">Student</span>
            <span className="text-[12px] font-semibold text-gray-800">{collection.studentName}</span>
          </div>
          <div className="row flex justify-between py-0.5">
            <span className="text-[11px] text-gray-400">Student ID</span>
            <span className="text-[12px] font-medium text-gray-700">{collection.studentId}</span>
          </div>
          <div className="row flex justify-between py-0.5">
            <span className="text-[11px] text-gray-400">Class</span>
            <span className="text-[12px] font-medium text-gray-700">{collection.className}{collection.section ? ` (${collection.section})` : ""}</span>
          </div>
          <div className="row flex justify-between py-0.5">
            <span className="text-[11px] text-gray-400">Fee</span>
            <span className="text-[12px] font-medium text-gray-700">{collection.structureName}</span>
          </div>
          {collection.month && (
            <div className="row flex justify-between py-0.5">
              <span className="text-[11px] text-gray-400">Month</span>
              <span className="text-[12px] font-medium text-gray-700">{collection.month}</span>
            </div>
          )}
        </div>

        {/* Amounts */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
            <span className="text-[12px] text-gray-500">Fee Amount</span>
            <span className="text-[12px] font-semibold text-gray-800">{fmt(collection.amountDue)}</span>
          </div>
          {collection.discount > 0 && (
            <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
              <span className="text-[12px] text-gray-500">Discount</span>
              <span className="text-[12px] font-semibold text-emerald-600">- {fmt(collection.discount)}</span>
            </div>
          )}
          {collection.fine > 0 && (
            <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
              <span className="text-[12px] text-gray-500">Late Fine</span>
              <span className="text-[12px] font-semibold text-red-500">+ {fmt(collection.fine)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t-2 border-indigo-500">
            <span className="text-[13px] font-bold text-indigo-600">Amount Paid</span>
            <span className="text-[14px] font-bold text-indigo-600">{fmt(collection.amountPaid)}</span>
          </div>
          {collection.amountPaid < net && (
            <div className="flex justify-between py-1">
              <span className="text-[12px] text-gray-500">Balance Due</span>
              <span className="text-[12px] font-semibold text-red-500">{fmt(net - collection.amountPaid)}</span>
            </div>
          )}
        </div>

        {collection.remarks && (
          <p className="text-[11px] text-gray-400 italic border-t border-gray-100 pt-2">Remarks: {collection.remarks}</p>
        )}

        <div className="text-center mt-3 pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-300">Thank you — Al-Noor School Management System</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
        <Button className="flex-1" icon={Printer} onClick={handlePrint}>Print Receipt</Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FeeCollectionPage() {
  const qc = useQueryClient();

  // ── filter state ─────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState("");
  const [classId,        setClassId]        = useState("");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [status,         setStatus]         = useState("");
  const [month,          setMonth]          = useState("");
  const [page,           setPage]           = useState(1);

  const [committed, setCommitted] = useState({
    search: "", classId: "", feeStructureId: "", status: "", month: "", page: 1,
  });

  // ── modal state ───────────────────────────────────────────────────────────
  const [generateOpen,  setGenerateOpen]  = useState(false);
  const [payTarget,     setPayTarget]     = useState(null);   // collection to record payment
  const [receiptTarget, setReceiptTarget] = useState(null);   // collection to show receipt
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  // ── form state ────────────────────────────────────────────────────────────
  const [genForm,    setGenForm]    = useState(emptyGenerate());
  const [payForm,    setPayForm]    = useState(emptyPay());
  const [genError,   setGenError]   = useState("");
  const [payError,   setPayError]   = useState("");

  // ── queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["fee-collections", committed],
    queryFn:  () => feeCollectionsApi.getAll(committed),
    keepPreviousData: true,
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // Load structures filtered by selected class (for generate modal)
  const { data: structuresData } = useQuery({
    queryKey: ["fee-structures-active", genForm.classId],
    queryFn:  () => feeStructuresApi.getAll({ classId: genForm.classId, isActive: "true", limit: 100 }),
    enabled:  !!genForm.classId,
  });

  // Structures for filter dropdown (all)
  const { data: allStructures } = useQuery({
    queryKey: ["fee-structures-filter", classId],
    queryFn:  () => feeStructuresApi.getAll({ classId: classId || undefined, limit: 100 }),
    enabled:  true,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fee-collections"] });

  const generateMutation = useMutation({
    mutationFn: feeCollectionsApi.generate,
    onSuccess: (res) => {
      invalidate();
      setGenerateOpen(false);
      setGenForm(emptyGenerate());
      setGenError("");
      alert(`✅ ${res.message}`);
    },
    onError: (err) => setGenError(err?.response?.data?.error || "Failed to generate"),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => feeCollectionsApi.recordPayment(id, data),
    onSuccess: (updatedCollection) => {
      invalidate();
      setPayTarget(null);
      setPayForm(emptyPay());
      setPayError("");
      // Show receipt only if paid or partial
      if (updatedCollection.status === "PAID" || updatedCollection.status === "PARTIAL") {
        setReceiptTarget({
          ...updatedCollection,
          studentName:   `${updatedCollection.student.firstName} ${updatedCollection.student.lastName || ""}`.trim(),
          studentId:     updatedCollection.student.studentId,
          className:     updatedCollection.feeStructure.class.name,
          section:       updatedCollection.student.section,
          structureName: updatedCollection.feeStructure.name,
          amountDue:     parseFloat(updatedCollection.amountDue),
          amountPaid:    parseFloat(updatedCollection.amountPaid),
          discount:      parseFloat(updatedCollection.discount),
          fine:          parseFloat(updatedCollection.fine),
        });
      }
    },
    onError: (err) => setPayError(err?.response?.data?.error || "Failed to record payment"),
  });

  const deleteMutation = useMutation({
    mutationFn: feeCollectionsApi.delete,
    onSuccess:  () => { invalidate(); setDeleteTarget(null); },
    onError:    (err) => alert(err?.response?.data?.error || "Failed to delete"),
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const apply = () => {
    setPage(1);
    setCommitted({ search, classId, feeStructureId, status, month, page: 1 });
  };

  const reset = () => {
    setSearch(""); setClassId(""); setFeeStructureId(""); setStatus(""); setMonth(""); setPage(1);
    setCommitted({ search: "", classId: "", feeStructureId: "", status: "", month: "", page: 1 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const openPay = (c) => {
    setPayForm({
      amountPaid: String(c.amountDue - c.discount + c.fine),
      discount:   String(c.discount),
      fine:       String(c.fine),
      remarks:    c.remarks || "",
    });
    setPayError("");
    setPayTarget(c);
  };

  const handleGenSubmit = () => {
    setGenError("");
    if (!genForm.classId || !genForm.feeStructureId || !genForm.dueDate) {
      setGenError("Please fill all required fields.");
      return;
    }
    generateMutation.mutate({
      feeStructureId: parseInt(genForm.feeStructureId),
      month:          genForm.month || null,
      dueDate:        genForm.dueDate,
    });
  };

  const handlePaySubmit = () => {
    setPayError("");
    const paid = parseFloat(payForm.amountPaid);
    if (isNaN(paid) || paid < 0) { setPayError("Enter a valid amount."); return; }
    payMutation.mutate({
      id: payTarget.id,
      data: {
        amountPaid: paid,
        discount:   parseFloat(payForm.discount) || 0,
        fine:       parseFloat(payForm.fine)     || 0,
        remarks:    payForm.remarks.trim() || null,
      },
    });
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const summary   = data?.summary || {};
  const COLS = ["Student", "Class", "Fee / Month", "Amount Due", "Paid", "Balance", "Status", "Due Date", "Actions"];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Fee Collection"
        description="Generate and record fee payments for students"
      >
        <Button icon={Plus} onClick={() => { setGenForm(emptyGenerate()); setGenError(""); setGenerateOpen(true); }}>
          Generate Fees
        </Button>
      </PageHeader>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Unpaid"   value={summary.totalUnpaid   ?? 0} icon={Clock}          color="bg-gray-50 text-gray-500" />
        <StatCard label="Paid"     value={summary.totalPaid     ?? 0} icon={CheckCircle}    color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Partial"  value={summary.totalPartial  ?? 0} icon={TrendingUp}     color="bg-amber-50 text-amber-600" />
        <StatCard label="Overdue"  value={summary.totalOverdue  ?? 0} icon={AlertTriangle}  color="bg-red-50 text-red-500" />
      </div>

      {/* ── Amount summary strip ────────────────────────────────────────────── */}
      {(summary.totalDue > 0 || summary.totalPaid > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Banknote size={15} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Total Fee Due</p>
              <p className="text-[14px] font-bold text-gray-800">{fmt(summary.totalDue)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wallet size={15} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Total Collected</p>
              <p className="text-[14px] font-bold text-emerald-600">{fmt(summary.totalPaid)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="Search student, receipt..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>

          {/* Class */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Class</label>
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setFeeStructureId(""); }} className={selectCls}>
              <option value="">All Classes</option>
              {classesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Fee Structure */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Fee Structure</label>
            <select value={feeStructureId} onChange={(e) => setFeeStructureId(e.target.value)} className={selectCls}>
              <option value="">All Structures</option>
              {allStructures?.structures?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
              <option value="">All Months</option>
              {data?.months?.map((m) => <option key={m} value={m}>{m}</option>)}
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
          isEmpty={!isLoading && !isFetching && data?.collections?.length === 0}
          emptyIcon={Banknote}
          emptyText="No fee records found"
          emptySubtext="Generate fees for a class to get started"
        >
          {data?.collections?.map((c) => {
            const sCfg    = STATUS_CFG[c.status] || STATUS_CFG.UNPAID;
            const ftCls   = FEE_TYPE_CFG[c.feeType] || FEE_TYPE_CFG.OTHER;
            const balance = c.amountDue - c.discount + c.fine - c.amountPaid;
            const StatusIcon = sCfg.icon;

            return (
              <React.Fragment key={c.id}>
                <Tr>
                  {/* Student */}
                  <Td first>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800 leading-tight">{c.studentName}</p>
                      <p className="text-[11px] text-gray-400">{c.studentId}{c.section ? ` · ${c.section}` : ""}</p>
                    </div>
                  </Td>

                  {/* Class */}
                  <Td>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border bg-slate-50 text-slate-600 border-slate-200">
                      {c.className}
                    </span>
                  </Td>

                  {/* Fee / Month */}
                  <Td>
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${ftCls}`}>
                        {c.feeType.charAt(0) + c.feeType.slice(1).toLowerCase()}
                      </span>
                      {c.month && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{c.month}</p>
                      )}
                    </div>
                  </Td>

                  {/* Amount due */}
                  <Td>
                    <p className="text-[13px] font-semibold text-gray-800">{fmt(c.amountDue)}</p>
                    {(c.discount > 0 || c.fine > 0) && (
                      <p className="text-[11px] text-gray-400">
                        {c.discount > 0 && <span className="text-emerald-600">-{fmt(c.discount)} disc </span>}
                        {c.fine > 0     && <span className="text-red-400">+{fmt(c.fine)} fine</span>}
                      </p>
                    )}
                  </Td>

                  {/* Paid */}
                  <Td>
                    <p className="text-[13px] font-semibold text-emerald-600">{fmt(c.amountPaid)}</p>
                  </Td>

                  {/* Balance */}
                  <Td>
                    <p className={`text-[13px] font-semibold ${balance <= 0 ? "text-gray-300" : "text-red-500"}`}>
                      {balance <= 0 ? "—" : fmt(balance)}
                    </p>
                  </Td>

                  {/* Status */}
                  <Td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${sCfg.cls}`}>
                      <StatusIcon size={10} />
                      {sCfg.label}
                    </span>
                  </Td>

                  {/* Due date */}
                  <Td>
                    <span className="text-[12px] text-gray-600">{fmtDate(c.dueDate)}</span>
                  </Td>

                  {/* Actions */}
                  <Td>
                    <div className="flex items-center gap-0.5">
                      {/* Collect payment */}
                      {c.status !== "PAID" && c.status !== "WAIVED" && (
                        <button
                          onClick={() => openPay(c)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Record Payment"
                        >
                          <Banknote size={13} />
                        </button>
                      )}
                      {/* Show receipt */}
                      {(c.status === "PAID" || c.status === "PARTIAL") && c.receiptNo && (
                        <button
                          onClick={() => setReceiptTarget(c)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="View Receipt"
                        >
                          <ReceiptIcon size={13} />
                        </button>
                      )}
                      {/* Delete */}
                      {c.status !== "PAID" && (
                        <button
                          onClick={() => setDeleteTarget(c)}
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
          label="records"
          onPageChange={handlePageChange}
        />
      </div>

      {/* ── Generate Fees Modal ─────────────────────────────────────────────── */}
      <Modal
        open={generateOpen}
        onClose={() => { setGenerateOpen(false); setGenForm(emptyGenerate()); setGenError(""); }}
        title="Generate Fee Records"
      >
        <div className="space-y-4">
          <p className="text-[12px] text-gray-400 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
            This will create one fee record per active student in the selected class for the chosen fee structure and month.
          </p>

          {/* Class */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Class *</label>
            <select
              value={genForm.classId}
              onChange={(e) => setGenForm((f) => ({ ...f, classId: e.target.value, feeStructureId: "" }))}
              className={inputCls}
            >
              <option value="">Select class...</option>
              {classesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Fee Structure */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Fee Structure *</label>
            <select
              value={genForm.feeStructureId}
              onChange={(e) => setGenForm((f) => ({ ...f, feeStructureId: e.target.value }))}
              className={inputCls}
              disabled={!genForm.classId}
            >
              <option value="">{genForm.classId ? "Select structure..." : "Select a class first"}</option>
              {structuresData?.structures?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.frequency})</option>
              ))}
            </select>
          </div>

          {/* Month + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Month (for monthly fees)</label>
              <input
                type="month"
                value={genForm.month}
                onChange={(e) => setGenForm((f) => ({ ...f, month: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Due Date *</label>
              <input
                type="date"
                value={genForm.dueDate}
                onChange={(e) => setGenForm((f) => ({ ...f, dueDate: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {genError && <p className="text-[12px] text-red-500">{genError}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1"
              onClick={() => { setGenerateOpen(false); setGenForm(emptyGenerate()); setGenError(""); }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={generateMutation.isPending} onClick={handleGenSubmit}>
              {generateMutation.isPending ? "Generating..." : "Generate Records"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Record Payment Modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!payTarget}
        onClose={() => { setPayTarget(null); setPayForm(emptyPay()); setPayError(""); }}
        title="Record Payment"
      >
        {payTarget && (
          <div className="space-y-4">
            {/* Student summary */}
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-400">Student</span>
                <span className="text-[12px] font-semibold text-gray-800">{payTarget.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-400">Class</span>
                <span className="text-[12px] text-gray-700">{payTarget.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-400">Fee</span>
                <span className="text-[12px] text-gray-700">{payTarget.structureName}</span>
              </div>
              {payTarget.month && (
                <div className="flex justify-between">
                  <span className="text-[11px] text-gray-400">Month</span>
                  <span className="text-[12px] text-gray-700">{payTarget.month}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                <span className="text-[11px] text-gray-400">Fee Amount</span>
                <span className="text-[13px] font-bold text-indigo-600">{fmt(payTarget.amountDue)}</span>
              </div>
            </div>

            {/* Discount + Fine + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Discount (PKR)</label>
                <input
                  type="number" min="0" placeholder="0"
                  value={payForm.discount}
                  onChange={(e) => setPayForm((f) => ({ ...f, discount: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Late Fine (PKR)</label>
                <input
                  type="number" min="0" placeholder="0"
                  value={payForm.fine}
                  onChange={(e) => setPayForm((f) => ({ ...f, fine: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Net due preview */}
            <div className="bg-indigo-50 rounded-lg px-3 py-2 flex justify-between items-center border border-indigo-100">
              <span className="text-[12px] text-indigo-500 font-medium">Net Payable</span>
              <span className="text-[14px] font-bold text-indigo-600">
                {fmt(
                  payTarget.amountDue
                  - (parseFloat(payForm.discount) || 0)
                  + (parseFloat(payForm.fine)     || 0)
                )}
              </span>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Amount Received (PKR) *</label>
              <input
                type="number" min="0" placeholder="0"
                value={payForm.amountPaid}
                onChange={(e) => setPayForm((f) => ({ ...f, amountPaid: e.target.value }))}
                className={`${inputCls} text-[15px] font-semibold`}
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Remarks</label>
              <input
                placeholder="Optional notes..."
                value={payForm.remarks}
                onChange={(e) => setPayForm((f) => ({ ...f, remarks: e.target.value }))}
                className={inputCls}
              />
            </div>

            {payError && <p className="text-[12px] text-red-500">{payError}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1"
                onClick={() => { setPayTarget(null); setPayForm(emptyPay()); setPayError(""); }}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={payMutation.isPending} onClick={handlePaySubmit}>
                {payMutation.isPending ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Receipt Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={!!receiptTarget}
        onClose={() => setReceiptTarget(null)}
        title="Payment Receipt"
      >
        {receiptTarget && (
          <Receipt
            collection={receiptTarget}
            onClose={() => setReceiptTarget(null)}
          />
        )}
      </Modal>

      {/* ── Delete Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Fee Record">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">
              Delete fee record for <span className="font-semibold">{deleteTarget?.studentName}</span>?
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              This cannot be undone. Only unpaid / partial records can be deleted.
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