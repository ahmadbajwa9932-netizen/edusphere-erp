"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { libraryFinesApi, libraryMembersApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, Search, Eye,
  Banknote, AlertTriangle, CheckCircle,
  Clock, BookX, Slash, ReceiptText,
  TrendingDown, Wallet, ShieldCheck,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS = ["Borrower", "Book", "Fine Type", "Amount", "Paid", "Remaining", "Status", "Actions"];

const FINE_TYPE_CONFIG = {
  OVERDUE:  { label: "Overdue",  color: "bg-amber-50 text-amber-700 border border-amber-100",   icon: Clock        },
  LOST:     { label: "Lost",     color: "bg-red-50 text-red-600 border border-red-100",         icon: BookX        },
  DAMAGED:  { label: "Damaged",  color: "bg-orange-50 text-orange-600 border border-orange-100",icon: AlertTriangle},
  OTHER:    { label: "Other",    color: "bg-gray-50 text-gray-600 border border-gray-200",      icon: ReceiptText  },
};

const STATUS_CONFIG = {
  UNPAID:  { label: "Unpaid",  color: "bg-red-50 text-red-600 border border-red-100",           dot: "bg-red-400"     },
  PARTIAL: { label: "Partial", color: "bg-amber-50 text-amber-700 border border-amber-100",     dot: "bg-amber-400"   },
  PAID:    { label: "Paid",    color: "bg-emerald-50 text-emerald-700 border border-emerald-100",dot: "bg-emerald-400" },
  WAIVED:  { label: "Waived",  color: "bg-purple-50 text-purple-700 border border-purple-100",  dot: "bg-purple-400"  },
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNPAID;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function FineTypeBadge({ type }) {
  const cfg  = FINE_TYPE_CONFIG[type] || FINE_TYPE_CONFIG.OTHER;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${cfg.color}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

function AmountCell({ amount, paidAmount }) {
  const remaining = Math.max(0, amount - (paidAmount || 0));
  const pct       = amount > 0 ? ((paidAmount || 0) / amount) * 100 : 0;
  return (
    <div>
      <p className="text-[13px] font-semibold text-gray-800">PKR {amount?.toLocaleString()}</p>
      {paidAmount > 0 && (
        <div className="mt-1 w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LibraryFinesPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [fineType, setFineType] = useState("");
  const [status,   setStatus]   = useState("");
  const [page,     setPage]     = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal,     setAddModal]    = useState(false);
  const [editTarget,   setEdit]        = useState(null);
  const [deleteId,     setDeleteId]    = useState(null);
  const [viewTarget,   setView]        = useState(null);
  const [payModal,     setPayModal]    = useState(null);   // { fine, mode: 'full'|'partial'|'waive' }
  const [payAmount,    setPayAmount]   = useState("");
  const [payRemarks,   setPayRemarks]  = useState("");
  const [memberSearch, setMemberSearch]= useState("");

  const emptyForm = {
    memberId: "", borrowerName: "", bookTitle: "",
    fineType: "OVERDUE", amount: "", dueDate: "", remarks: "",
  };
  const [form,        setForm]        = useState(emptyForm);
  const [formErrors,  setFormErrors]  = useState({});
  const [serverError, setServerError] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["library-fines", search, fineType, status, page],
    queryFn:  () => libraryFinesApi.getAll({ search, fineType, status, page, limit: 20 }),
  });

  const { data: membersData } = useQuery({
    queryKey: ["library-members-search", memberSearch],
    queryFn:  () => libraryMembersApi.getAll({ search: memberSearch, limit: 10 }),
    enabled:  memberSearch.length >= 2,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: libraryFinesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-fines"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => libraryFinesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-fines"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: libraryFinesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-fines"] }); setDeleteId(null); },
  });

  const payFullMutation = useMutation({
    mutationFn: ({ id }) => libraryFinesApi.payFull(id, payRemarks),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-fines"] }); closePayModal(); },
  });

  const payPartialMutation = useMutation({
    mutationFn: ({ id }) => libraryFinesApi.payPartial(id, parseFloat(payAmount), payRemarks),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-fines"] }); closePayModal(); },
  });

  const waiveMutation = useMutation({
    mutationFn: ({ id }) => libraryFinesApi.waive(id, payRemarks),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-fines"] }); closePayModal(); },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.borrowerName.trim()) e.borrowerName = "Borrower name is required";
    if (!form.bookTitle.trim())    e.bookTitle    = "Book title is required";
    if (!form.fineType)            e.fineType     = "Fine type is required";
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Valid amount is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEdit(null); setForm(emptyForm); setFormErrors({}); setServerError("");
    setMemberSearch(""); setAddModal(true);
  };

  const openEdit = (fine) => {
    setEdit(fine);
    setForm({
      memberId:     fine.memberId     ? String(fine.memberId) : "",
      borrowerName: fine.borrowerName,
      bookTitle:    fine.bookTitle,
      fineType:     fine.fineType,
      amount:       String(fine.amount),
      dueDate:      fine.dueDate      ? new Date(fine.dueDate).toISOString().split("T")[0] : "",
      remarks:      fine.remarks      || "",
    });
    setFormErrors({}); setServerError(""); setMemberSearch(""); setAddModal(true);
  };

  const closeModal    = () => { setAddModal(false); setEdit(null); setServerError(""); setMemberSearch(""); };
  const closePayModal = () => { setPayModal(null); setPayAmount(""); setPayRemarks(""); };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) updateMutation.mutate({ id: editTarget.id, ...form });
    else            createMutation.mutate(form);
  };

  const handlePay = () => {
    if (!payModal) return;
    const { fine, mode } = payModal;
    if (mode === "full")    payFullMutation.mutate({ id: fine.id });
    if (mode === "partial") payPartialMutation.mutate({ id: fine.id });
    if (mode === "waive")   waiveMutation.mutate({ id: fine.id });
  };

  const isPaying = payFullMutation.isPending || payPartialMutation.isPending || waiveMutation.isPending;

  const selectMember = (member) => {
    setForm((p) => ({ ...p, memberId: String(member.id), borrowerName: member.name }));
    setMemberSearch("");
  };

  const clearFilters = () => { setSearch(""); setFineType(""); setStatus(""); setPage(1); };
  const hasFilters   = search || fineType || status;

  // ── Data ──────────────────────────────────────────────────────────────────
  const fines      = data?.fines || [];
  const stats      = data?.stats || { totalUnpaid: 0, totalPaid: 0, totalWaived: 0 };
  const unpaidCount  = fines.filter((f) => f.status === "UNPAID").length;
  const partialCount = fines.filter((f) => f.status === "PARTIAL").length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      <PageHeader title="Library Fines" description="Track, collect and manage library fines">
        <Button icon={Plus} onClick={openAdd}>Add Fine</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Unpaid (PKR)",  value: `${stats.totalUnpaid.toLocaleString()}`,  color: "bg-red-50 text-red-500",        icon: TrendingDown },
          { label: "Total Collected (PKR)",value: `${stats.totalPaid.toLocaleString()}`,   color: "bg-emerald-50 text-emerald-600",icon: Wallet       },
          { label: "Unpaid / Partial",    value: `${unpaidCount + partialCount}`,          color: "bg-amber-50 text-amber-600",   icon: AlertTriangle},
          { label: "Total Waived (PKR)",  value: `${stats.totalWaived.toLocaleString()}`,  color: "bg-purple-50 text-purple-600", icon: ShieldCheck  },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <p className="text-[18px] font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search borrower name or book title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={fineType} onChange={(e) => { setFineType(e.target.value); setPage(1); }} className={selectCls + " max-w-[140px]"}>
          <option value="">All Types</option>
          {Object.entries(FINE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">Clear</button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && fines.length === 0}
          emptyIcon={Banknote}
          emptyText="No fines recorded"
          emptySubtext="Click 'Add Fine' to record a new fine"
        >
          {fines.map((fine) => {
            const remaining = Math.max(0, fine.amount - (fine.paidAmount || 0));
            const canPay    = fine.status === "UNPAID" || fine.status === "PARTIAL";
            return (
              <Tr key={fine.id}>

                {/* Borrower */}
                <Td first>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{fine.borrowerName}</p>
                    {fine.member && (
                      <p className="text-[10px] text-gray-400 font-mono">{fine.member.memberId}</p>
                    )}
                  </div>
                </Td>

                {/* Book */}
                <Td>
                  <p className="text-[12px] text-gray-700 line-clamp-1 max-w-[160px]">{fine.bookTitle}</p>
                  {fine.bookIssue && (
                    <p className="text-[10px] text-gray-400">Due: {formatDate(fine.bookIssue.dueDate)}</p>
                  )}
                </Td>

                {/* Fine Type */}
                <Td><FineTypeBadge type={fine.fineType} /></Td>

                {/* Amount */}
                <Td><AmountCell amount={fine.amount} paidAmount={fine.paidAmount} /></Td>

                {/* Paid */}
                <Td>
                  <span className="text-[13px] font-semibold text-emerald-600">
                    PKR {(fine.paidAmount || 0).toLocaleString()}
                  </span>
                </Td>

                {/* Remaining */}
                <Td>
                  <span className={`text-[13px] font-semibold ${remaining > 0 ? "text-red-500" : "text-gray-400"}`}>
                    {remaining > 0 ? `PKR ${remaining.toLocaleString()}` : "—"}
                  </span>
                </Td>

                {/* Status */}
                <Td><StatusBadge status={fine.status} /></Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setView(fine)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    {canPay && (
                      <>
                        <button
                          onClick={() => { setPayModal({ fine, mode: "full" }); setPayRemarks(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Pay Full"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => { setPayModal({ fine, mode: "partial" }); setPayAmount(""); setPayRemarks(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Partial Payment"
                        >
                          <Wallet size={14} />
                        </button>
                        <button
                          onClick={() => { setPayModal({ fine, mode: "waive" }); setPayRemarks(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Waive Fine"
                        >
                          <Slash size={14} />
                        </button>
                      </>
                    )}
                    <button onClick={() => openEdit(fine)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(fine.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>
        <TableFooter page={page} totalPages={data?.totalPages} total={data?.total} label="fines" onPageChange={setPage} />
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={closeModal} title={editTarget ? "Edit Fine" : "Add Fine"} size="md">
        <div className="space-y-3">

          {/* Member search */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Link to Library Member (optional)</label>
            {form.memberId ? (
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                <p className="text-[13px] font-medium text-indigo-700">{form.borrowerName}</p>
                <button onClick={() => setForm((p) => ({ ...p, memberId: "", borrowerName: "" }))} className="text-[11px] text-indigo-400 hover:text-red-500">Remove</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search member by name or ID..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
                  />
                </div>
                {memberSearch.length >= 2 && membersData?.members?.length > 0 && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                    {membersData.members.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => selectMember(m)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 text-[9px] font-bold">{m.name[0]}</span>
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-gray-700">{m.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{m.memberId}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <Input
            label="Borrower Name *"
            placeholder="Full name of the borrower"
            value={form.borrowerName}
            onChange={(e) => set("borrowerName", e.target.value)}
            error={formErrors.borrowerName}
          />
          <Input
            label="Book Title *"
            placeholder="Title of the book"
            value={form.bookTitle}
            onChange={(e) => set("bookTitle", e.target.value)}
            error={formErrors.bookTitle}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Fine Type *</label>
              <select value={form.fineType} onChange={(e) => set("fineType", e.target.value)} className={selectCls}>
                {Object.entries(FINE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {formErrors.fineType && <p className="text-[11px] text-red-500">{formErrors.fineType}</p>}
            </div>
            <Input
              label="Fine Amount (PKR) *"
              type="number"
              placeholder="e.g. 150"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              error={formErrors.amount}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Remarks</label>
              <input
                type="text"
                placeholder="Optional note"
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
              />
            </div>
          </div>

          {serverError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button className="flex-1" disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : editTarget ? "Update Fine" : "Add Fine"}
          </Button>
        </div>
      </Modal>

      {/* ── Payment Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={!!payModal}
        onClose={closePayModal}
        title={
          payModal?.mode === "full"    ? "Collect Full Payment" :
          payModal?.mode === "partial" ? "Partial Payment"      : "Waive Fine"
        }
      >
        {payModal && (
          <div className="space-y-4">
            {/* Fine summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[13px] font-semibold text-gray-800">{payModal.fine.bookTitle}</p>
              <p className="text-[12px] text-gray-500">Borrower: <span className="font-medium">{payModal.fine.borrowerName}</span></p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-400">Total Fine</p>
                  <p className="text-[15px] font-bold text-gray-800">PKR {payModal.fine.amount?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Already Paid</p>
                  <p className="text-[15px] font-bold text-emerald-600">PKR {(payModal.fine.paidAmount || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Remaining</p>
                  <p className="text-[15px] font-bold text-red-500">
                    PKR {Math.max(0, payModal.fine.amount - (payModal.fine.paidAmount || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Full payment confirmation */}
            {payModal.mode === "full" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                <p className="text-[12px] text-emerald-700">
                  This will mark the entire fine of <strong>PKR {payModal.fine.amount?.toLocaleString()}</strong> as fully paid.
                </p>
              </div>
            )}

            {/* Partial payment input */}
            {payModal.mode === "partial" && (
              <Input
                label="Payment Amount (PKR) *"
                type="number"
                placeholder={`Max: PKR ${Math.max(0, payModal.fine.amount - (payModal.fine.paidAmount || 0)).toLocaleString()}`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            )}

            {/* Waive confirmation */}
            {payModal.mode === "waive" && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 flex items-center gap-2">
                <Slash size={15} className="text-purple-500 shrink-0" />
                <p className="text-[12px] text-purple-700">
                  This will waive the entire fine. The borrower will not need to pay anything.
                </p>
              </div>
            )}

            {/* Remarks */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Remarks (optional)</label>
              <input
                type="text"
                placeholder="e.g. Cash received, cheque no..."
                value={payRemarks}
                onChange={(e) => setPayRemarks(e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closePayModal}>Cancel</Button>
          <Button
            className={`flex-1 ${payModal?.mode === "waive" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
            disabled={isPaying || (payModal?.mode === "partial" && (!payAmount || parseFloat(payAmount) <= 0))}
            onClick={handlePay}
          >
            {isPaying ? "Processing..." :
              payModal?.mode === "full"    ? "Confirm Full Payment" :
              payModal?.mode === "partial" ? "Record Payment"       : "Waive Fine"
            }
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Fine Details" size="md">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-gray-800">{viewTarget.bookTitle}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">Borrower: {viewTarget.borrowerName}</p>
                {viewTarget.member && (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{viewTarget.member.memberId}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={viewTarget.status} />
                <FineTypeBadge type={viewTarget.fineType} />
              </div>
            </div>

            {/* Amount breakdown */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total Fine",   value: `PKR ${viewTarget.amount?.toLocaleString()}`,        color: "text-gray-800" },
                { label: "Paid",         value: `PKR ${(viewTarget.paidAmount || 0).toLocaleString()}`,color: "text-emerald-600" },
                { label: "Remaining",    value: `PKR ${Math.max(0, viewTarget.amount - (viewTarget.paidAmount || 0)).toLocaleString()}`, color: "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className={`text-[14px] font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Payment Progress</span>
                <span>{viewTarget.amount > 0 ? Math.round(((viewTarget.paidAmount || 0) / viewTarget.amount) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${viewTarget.amount > 0 ? Math.min(((viewTarget.paidAmount || 0) / viewTarget.amount) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Due Date",   formatDate(viewTarget.dueDate)],
                ["Paid Date",  formatDate(viewTarget.paidDate)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            {viewTarget.remarks && (
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-1">Remarks</p>
                <p className="text-[13px] text-gray-700">{viewTarget.remarks}</p>
              </div>
            )}

            {/* Payment actions from view */}
            {(viewTarget.status === "UNPAID" || viewTarget.status === "PARTIAL") && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setView(null); setPayModal({ fine: viewTarget, mode: "full" }); setPayRemarks(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle size={13} /> Pay Full
                </button>
                <button
                  onClick={() => { setView(null); setPayModal({ fine: viewTarget, mode: "partial" }); setPayAmount(""); setPayRemarks(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-100 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Wallet size={13} /> Partial
                </button>
                <button
                  onClick={() => { setView(null); setPayModal({ fine: viewTarget, mode: "waive" }); setPayRemarks(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium bg-purple-50 text-purple-700 border border-purple-100 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Slash size={13} /> Waive
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setView(null)}>Close</Button>
          <Button className="flex-1" icon={Pencil} onClick={() => { setView(null); openEdit(viewTarget); }}>Edit</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Fine">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this fine record?</p>
            <p className="text-[12px] text-gray-400 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>
            {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}