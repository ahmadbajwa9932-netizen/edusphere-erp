"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { defaultersApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard   from "../../../../components/ui/StatCard";
import Button     from "../../../../components/ui/Button";
import Modal      from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Search, Filter, AlertTriangle, Users, Banknote,
  ChevronDown, ChevronUp, Phone, ShieldAlert,
  TrendingDown, Clock, CheckCircle, RefreshCw,
  FileWarning, Flame,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

// ── severity config ───────────────────────────────────────────────────────────
const severityOf = (days) => {
  if (days === 0)      return { label: "Current",  cls: "bg-blue-50 text-blue-500 border-blue-200",   dot: "bg-blue-400"   };
  if (days <= 30)      return { label: "Low",      cls: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-400"  };
  if (days <= 60)      return { label: "Medium",   cls: "bg-orange-50 text-orange-600 border-orange-200", dot: "bg-orange-400" };
  return               { label: "High",      cls: "bg-red-50 text-red-600 border-red-200",     dot: "bg-red-500"    };
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

const STATUS_CFG = {
  UNPAID:  { cls: "bg-gray-50 text-gray-500 border-gray-200",        label: "Unpaid"  },
  OVERDUE: { cls: "bg-red-50 text-red-500 border-red-200",           label: "Overdue" },
  PARTIAL: { cls: "bg-amber-50 text-amber-600 border-amber-200",     label: "Partial" },
};

// ── main ──────────────────────────────────────────────────────────────────────
export default function DefaultersPage() {
  const qc = useQueryClient();

  // ── filter state ─────────────────────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [classId,  setClassId]  = useState("");
  const [month,    setMonth]    = useState("");
  const [severity, setSeverity] = useState("");
  const [page,     setPage]     = useState(1);

  const [committed, setCommitted] = useState({
    search: "", classId: "", month: "", severity: "", page: 1,
  });

  // ── local UI state ────────────────────────────────────────────────────────
  const [expandedId,    setExpandedId]    = useState(null);
  const [markOverdueId, setMarkOverdueId] = useState(null); // student to confirm bulk mark

  // ── queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["defaulters", committed],
    queryFn:  () => defaultersApi.getAll(committed),
    keepPreviousData: true,
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const markOverdueMutation = useMutation({
    mutationFn: (ids) => defaultersApi.markOverdue(ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["defaulters"] });
      qc.invalidateQueries({ queryKey: ["fee-collections"] });
      setMarkOverdueId(null);
    },
    onError: (err) => alert(err?.response?.data?.error || "Failed"),
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const apply = () => {
    setPage(1);
    setCommitted({ search, classId, month, severity, page: 1 });
  };

  const reset = () => {
    setSearch(""); setClassId(""); setMonth(""); setSeverity(""); setPage(1);
    setCommitted({ search: "", classId: "", month: "", severity: "", page: 1 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const handleMarkOverdue = (defaulter) => {
    const unpaidIds = defaulter.records
      .filter((r) => r.status === "UNPAID")
      .map((r) => r.id);
    if (unpaidIds.length === 0) return;
    setMarkOverdueId({ defaulter, ids: unpaidIds });
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const summary = data?.summary || {};
  const COLS = ["Student", "Class", "Pending", "Total Owed", "Overdue Since", "Severity", "Contact", "Actions"];

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Fee Defaulters"
        description="Students with outstanding or overdue fee payments"
      />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Defaulting Students"
          value={summary.totalStudents ?? 0}
          icon={Users}
          color="bg-red-50 text-red-500"
        />
        <StatCard
          label="Low Risk (≤30 days)"
          value={summary.lowCount ?? 0}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Medium Risk (31–60)"
          value={summary.mediumCount ?? 0}
          icon={AlertTriangle}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          label="High Risk (60+ days)"
          value={summary.highCount ?? 0}
          icon={Flame}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* ── Outstanding amount strip ─────────────────────────────────────────── */}
      {summary.totalOutstanding > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-red-400 font-medium uppercase tracking-wide">Total Outstanding Balance</p>
            <p className="text-[22px] font-bold text-red-600 leading-tight">{fmt(summary.totalOutstanding)}</p>
          </div>
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-[11px] text-gray-400">Across {summary.totalStudents ?? 0} students</p>
            <p className="text-[12px] text-gray-500">with pending fee records</p>
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
              type="text" placeholder="Search student name or ID..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>

          {/* Class */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
              <option value="">All Classes</option>
              {classesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

          {/* Severity */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Risk Level</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectCls}>
              <option value="">All Levels</option>
              <option value="LOW">Low (1–30 days)</option>
              <option value="MEDIUM">Medium (31–60 days)</option>
              <option value="HIGH">High (60+ days)</option>
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
          isEmpty={!isLoading && !isFetching && data?.defaulters?.length === 0}
          emptyIcon={CheckCircle}
          emptyText="No defaulters found"
          emptySubtext="All students are up to date with their fee payments"
        >
          {data?.defaulters?.map((d) => {
            const sev      = severityOf(d.maxDaysOverdue);
            const expanded = expandedId === d.studentDbId;
            const unpaidCount = d.records.filter((r) => r.status === "UNPAID").length;

            return (
              <React.Fragment key={d.studentDbId}>
                {/* ── Main row ── */}
                <Tr>
                  {/* Student */}
                  <Td first>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(expanded ? null : d.studentDbId)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <div className="flex items-center gap-2">
                        {/* Severity dot */}
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
                        <div>
                          <p className="text-[13px] font-medium text-gray-800 leading-tight">{d.studentName}</p>
                          <p className="text-[11px] text-gray-400">{d.studentId}{d.section ? ` · ${d.section}` : ""}</p>
                        </div>
                      </div>
                    </div>
                  </Td>

                  {/* Class */}
                  <Td>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border bg-slate-50 text-slate-600 border-slate-200">
                      {d.className}
                    </span>
                  </Td>

                  {/* Pending count */}
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-gray-800">{d.pendingCount}</span>
                      <span className="text-[11px] text-gray-400">record{d.pendingCount !== 1 ? "s" : ""}</span>
                    </div>
                  </Td>

                  {/* Total balance */}
                  <Td>
                    <p className="text-[13px] font-bold text-red-600">{fmt(d.totalBalance)}</p>
                    {d.totalPaid > 0 && (
                      <p className="text-[11px] text-gray-400">{fmt(d.totalPaid)} paid</p>
                    )}
                  </Td>

                  {/* Overdue since */}
                  <Td>
                    {d.maxDaysOverdue === 0 ? (
                      <span className="text-[12px] text-blue-500">Not yet due</span>
                    ) : (
                      <span className="text-[12px] font-medium text-gray-700">
                        {d.maxDaysOverdue} day{d.maxDaysOverdue !== 1 ? "s" : ""}
                      </span>
                    )}
                  </Td>

                  {/* Severity badge */}
                  <Td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${sev.cls}`}>
                      {d.maxDaysOverdue > 60 && <Flame size={10} />}
                      {d.maxDaysOverdue > 30 && d.maxDaysOverdue <= 60 && <AlertTriangle size={10} />}
                      {sev.label}
                    </span>
                  </Td>

                  {/* Contact */}
                  <Td>
                    <div>
                      <p className="text-[12px] text-gray-700 font-medium leading-tight truncate max-w-[130px]">{d.guardianName}</p>
                      {d.guardianPhone && (
                        <a
                          href={`tel:${d.guardianPhone}`}
                          className="text-[11px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
                        >
                          <Phone size={10} /> {d.guardianPhone}
                        </a>
                      )}
                    </div>
                  </Td>

                  {/* Actions */}
                  <Td>
                    <div className="flex items-center gap-0.5">
                      {/* Mark UNPAID → OVERDUE */}
                      {unpaidCount > 0 && (
                        <button
                          onClick={() => handleMarkOverdue(d)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                          title={`Mark ${unpaidCount} record(s) as Overdue`}
                        >
                          <ShieldAlert size={13} />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>

                {/* ── Expanded: individual fee records ── */}
                {expanded && (
                  <Tr key={`${d.studentDbId}-expanded`}>
                    <Td colSpan={8} className="bg-gray-50/60 px-6 py-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                        Pending Fee Records
                      </p>
                      <div className="space-y-1.5">
                        {d.records.map((r) => {
                          const rStatus = STATUS_CFG[r.status] || STATUS_CFG.UNPAID;
                          const ftCls   = FEE_TYPE_CFG[r.feeType] || FEE_TYPE_CFG.OTHER;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2 flex-wrap"
                            >
                              {/* Fee type */}
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${ftCls}`}>
                                {r.feeType.charAt(0) + r.feeType.slice(1).toLowerCase()}
                              </span>

                              {/* Structure / month */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-gray-700 truncate">{r.structureName}</p>
                                {r.month && <p className="text-[11px] text-gray-400">{r.month}</p>}
                              </div>

                              {/* Amount breakdown */}
                              <div className="flex items-center gap-4 text-right shrink-0">
                                <div>
                                  <p className="text-[10px] text-gray-400">Due</p>
                                  <p className="text-[12px] font-semibold text-gray-700">{fmt(r.amountDue)}</p>
                                </div>
                                {r.discount > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400">Discount</p>
                                    <p className="text-[12px] font-semibold text-emerald-600">-{fmt(r.discount)}</p>
                                  </div>
                                )}
                                {r.fine > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400">Fine</p>
                                    <p className="text-[12px] font-semibold text-red-500">+{fmt(r.fine)}</p>
                                  </div>
                                )}
                                {r.amountPaid > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400">Paid</p>
                                    <p className="text-[12px] font-semibold text-emerald-600">{fmt(r.amountPaid)}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[10px] text-gray-400">Balance</p>
                                  <p className="text-[12px] font-bold text-red-600">{fmt(r.netOwed)}</p>
                                </div>
                              </div>

                              {/* Status + due date */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${rStatus.cls}`}>
                                  {rStatus.label}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  Due {fmtDate(r.dueDate)}
                                </span>
                                {r.daysOverdue > 0 && (
                                  <span className="text-[10px] text-red-400 font-medium">
                                    +{r.daysOverdue}d
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Row total */}
                      <div className="mt-2.5 flex justify-end">
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-1.5">
                          <span className="text-[12px] text-red-500 font-medium">Total Outstanding</span>
                          <span className="text-[13px] font-bold text-red-600">{fmt(d.totalBalance)}</span>
                        </div>
                      </div>
                    </Td>
                  </Tr>
                )}
              </React.Fragment>
            );
          })}
        </Table>

        <TableFooter
          page={committed.page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="defaulters"
          onPageChange={handlePageChange}
        />
      </div>

      {/* ── Mark Overdue Confirm Modal ───────────────────────────────────────── */}
      <Modal
        open={!!markOverdueId}
        onClose={() => setMarkOverdueId(null)}
        title="Mark Records as Overdue"
      >
        {markOverdueId && (
          <div className="flex flex-col items-center text-center gap-3 pb-2">
            <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center">
              <ShieldAlert size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-800">
                Mark <span className="font-semibold">{markOverdueId.ids.length}</span> unpaid record(s) as{" "}
                <span className="text-orange-500 font-semibold">Overdue</span> for{" "}
                <span className="font-semibold">{markOverdueId.defaulter.studentName}</span>?
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                Only UNPAID records will be updated. PARTIAL records stay unchanged.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-3">
              <Button variant="secondary" className="flex-1" onClick={() => setMarkOverdueId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={markOverdueMutation.isPending}
                onClick={() => markOverdueMutation.mutate(markOverdueId.ids)}
              >
                {markOverdueMutation.isPending ? "Updating..." : "Mark Overdue"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}