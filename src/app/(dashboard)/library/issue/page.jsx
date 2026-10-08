"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi, booksApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, BookOpen, Search,
  Eye, RotateCcw, AlertTriangle, CheckCircle,
  Clock, BookX, Banknote, CalendarClock,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS = ["Book", "Borrower", "Issue Date", "Due Date", "Return Date", "Fine", "Status", "Actions"];
const FINE_PER_DAY = 5;

const STATUS_CONFIG = {
  ISSUED:   { label: "Issued",   color: "bg-indigo-50 text-indigo-700 border border-indigo-100",   dot: "bg-indigo-400",  icon: BookOpen    },
  RETURNED: { label: "Returned", color: "bg-emerald-50 text-emerald-700 border border-emerald-100",dot: "bg-emerald-400", icon: CheckCircle },
  OVERDUE:  { label: "Overdue",  color: "bg-red-50 text-red-600 border border-red-100",            dot: "bg-red-400",     icon: AlertTriangle },
  LOST:     { label: "Lost",     color: "bg-orange-50 text-orange-600 border border-orange-100",   dot: "bg-orange-400",  icon: BookX       },
};

const BORROWER_COLORS = {
  STUDENT: "bg-indigo-50 text-indigo-600",
  TEACHER: "bg-purple-50 text-purple-600",
  STAFF:   "bg-amber-50 text-amber-700",
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ISSUED;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function daysOverdue(dueDate) {
  const diff = new Date() - new Date(dueDate);
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IssueReturnPage() {
  const queryClient = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [status,       setStatus]       = useState("");
  const [borrowerType, setBorrowerType] = useState("");
  const [overdueOnly,  setOverdueOnly]  = useState(false);
  const [page,         setPage]         = useState(1);

  const [issueModal,  setIssueModal]  = useState(false);
  const [returnModal, setReturnModal] = useState(null);
  const [viewTarget,  setView]        = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [lostModal,   setLostModal]   = useState(null);

  // Issue form
  const emptyIssue = {
    bookId: "", borrowerName: "", borrowerType: "STUDENT",
    borrowerId: "", dueDate: "", remarks: "",
  };
  const [issueForm,   setIssueForm]   = useState(emptyIssue);
  const [issueErrors, setIssueErrors] = useState({});
  const [issueServerErr, setIssueServerErr] = useState("");
  const [bookSearch,  setBookSearch]  = useState("");

  // Return form
  const [returnRemarks, setReturnRemarks] = useState("");
  const [lostFine,      setLostFine]      = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["issues", search, status, borrowerType, overdueOnly, page],
    queryFn:  () => issuesApi.getAll({
      search, status, borrowerType,
      overdue: overdueOnly ? "true" : "",
      page, limit: 20,
    }),
  });

  const { data: booksData } = useQuery({
    queryKey: ["books-search", bookSearch],
    queryFn:  () => booksApi.getAll({ search: bookSearch, status: "AVAILABLE", limit: 10 }),
    enabled:  bookSearch.length >= 2,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const issueMutation = useMutation({
    mutationFn: issuesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setIssueModal(false);
      setIssueForm(emptyIssue);
      setBookSearch("");
    },
    onError: (err) => setIssueServerErr(err?.response?.data?.error || "Something went wrong."),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id }) => issuesApi.return(id, { remarks: returnRemarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setReturnModal(null);
      setReturnRemarks("");
    },
  });

  const payFineMutation = useMutation({
    mutationFn: issuesApi.payFine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["issues"] }),
  });

  const lostMutation = useMutation({
    mutationFn: ({ id, fine }) => issuesApi.markLost(id, parseFloat(fine) || 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setLostModal(null);
      setLostFine("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: issuesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setDeleteId(null);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setIssue = (field, value) => {
    setIssueForm((p) => ({ ...p, [field]: value }));
    if (issueErrors[field]) setIssueErrors((p) => ({ ...p, [field]: "" }));
    setIssueServerErr("");
  };

  const validateIssue = () => {
    const e = {};
    if (!issueForm.bookId)              e.bookId       = "Please select a book";
    if (!issueForm.borrowerName.trim()) e.borrowerName = "Borrower name is required";
    if (!issueForm.dueDate)             e.dueDate      = "Due date is required";
    setIssueErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleIssue = () => {
    if (!validateIssue()) return;
    issueMutation.mutate(issueForm);
  };

  const clearFilters = () => {
    setSearch(""); setStatus(""); setBorrowerType(""); setOverdueOnly(false); setPage(1);
  };
  const hasFilters = search || status || borrowerType || overdueOnly;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const issues    = data?.issues || [];
  const issued    = issues.filter((i) => i.status === "ISSUED").length;
  const overdue   = issues.filter((i) => i.status === "OVERDUE").length;
  const returned  = issues.filter((i) => i.status === "RETURNED").length;
  const totalFine = issues.reduce((s, i) => s + (i.fineAmount || 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      <PageHeader title="Issue & Return" description="Manage book lending, returns and fines">
        <Button icon={Plus} onClick={() => { setIssueForm(emptyIssue); setIssueErrors({}); setIssueServerErr(""); setBookSearch(""); setIssueModal(true); }}>
          Issue Book
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Currently Issued", value: issued,    color: "bg-indigo-50 text-indigo-600",  icon: BookOpen      },
          { label: "Overdue",          value: overdue,   color: "bg-red-50 text-red-500",        icon: AlertTriangle },
          { label: "Returned",         value: returned,  color: "bg-emerald-50 text-emerald-600",icon: CheckCircle   },
          { label: "Total Fines (PKR)",value: `${totalFine.toLocaleString()}`, color: "bg-amber-50 text-amber-600", icon: Banknote },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <p className="text-[20px] font-bold text-gray-800">{s.value}</p>
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
            placeholder="Search borrower, book title, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls + " max-w-[140px]"}>
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={borrowerType} onChange={(e) => { setBorrowerType(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Borrowers</option>
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
          <option value="STAFF">Staff</option>
        </select>
        <button
          onClick={() => { setOverdueOnly((p) => !p); setPage(1); }}
          className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg border transition-all ${
            overdueOnly
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <CalendarClock size={13} />
          Overdue Only
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">Clear</button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && issues.length === 0}
          emptyIcon={BookOpen}
          emptyText="No issue records found"
          emptySubtext="Click 'Issue Book' to lend a book"
        >
          {issues.map((issue) => {
            const isOverdue = issue.status === "OVERDUE";
            const days      = isOverdue ? daysOverdue(issue.dueDate) : 0;
            return (
              <Tr key={issue.id}>
                {/* Book */}
                <Td first>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 line-clamp-1 max-w-[160px]">{issue.book?.title}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{issue.book?.isbn || "—"}</p>
                  </div>
                </Td>

                {/* Borrower */}
                <Td>
                  <div>
                    <p className="text-[13px] text-gray-700 font-medium">{issue.borrowerName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${BORROWER_COLORS[issue.borrowerType]}`}>
                        {issue.borrowerType}
                      </span>
                      {issue.borrowerId && <span className="text-[10px] text-gray-400 font-mono">{issue.borrowerId}</span>}
                    </div>
                  </div>
                </Td>

                {/* Issue Date */}
                <Td><span className="text-[12px] text-gray-600">{formatDate(issue.issueDate)}</span></Td>

                {/* Due Date */}
                <Td>
                  <span className={`text-[12px] font-medium ${isOverdue ? "text-red-500" : "text-gray-600"}`}>
                    {formatDate(issue.dueDate)}
                    {isOverdue && <span className="block text-[10px] text-red-400">{days}d overdue</span>}
                  </span>
                </Td>

                {/* Return Date */}
                <Td>
                  <span className="text-[12px] text-gray-500">{formatDate(issue.returnDate)}</span>
                </Td>

                {/* Fine */}
                <Td>
                  {issue.fineAmount > 0 ? (
                    <div>
                      <span className={`text-[12px] font-semibold ${issue.finePaid ? "text-gray-400 line-through" : "text-red-600"}`}>
                        PKR {issue.fineAmount}
                      </span>
                      {!issue.finePaid && issue.status === "RETURNED" && (
                        <button
                          onClick={() => payFineMutation.mutate(issue.id)}
                          className="block text-[10px] text-emerald-600 hover:underline mt-0.5"
                        >
                          Mark Paid
                        </button>
                      )}
                      {issue.finePaid && <span className="block text-[10px] text-gray-400">Paid</span>}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-[12px]">—</span>
                  )}
                </Td>

                {/* Status */}
                <Td><StatusBadge status={issue.status} /></Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setView(issue)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    {(issue.status === "ISSUED" || issue.status === "OVERDUE") && (
                      <>
                        <button
                          onClick={() => { setReturnModal(issue); setReturnRemarks(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Return"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => { setLostModal(issue); setLostFine(""); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                          title="Mark Lost"
                        >
                          <BookX size={14} />
                        </button>
                      </>
                    )}
                    <button onClick={() => setDeleteId(issue.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>
        <TableFooter page={page} totalPages={data?.totalPages} total={data?.total} label="records" onPageChange={setPage} />
      </div>

      {/* ── Issue Book Modal ───────────────────────────────────────────────── */}
      <Modal open={issueModal} onClose={() => setIssueModal(false)} title="Issue Book" size="md">
        <div className="space-y-3">
          {/* Book search */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Book *</label>
            {issueForm.bookId ? (
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-indigo-700">
                    {booksData?.books?.find((b) => String(b.id) === String(issueForm.bookId))?.title || `Book #${issueForm.bookId}`}
                  </p>
                  <p className="text-[10px] text-indigo-400">Selected</p>
                </div>
                <button onClick={() => setIssue("bookId", "")} className="text-indigo-300 hover:text-red-500 text-[11px]">Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search available books..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
                  />
                </div>
                {bookSearch.length >= 2 && booksData?.books?.length > 0 && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                    {booksData.books.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => { setIssue("bookId", String(book.id)); setBookSearch(""); }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <p className="text-[12px] font-medium text-gray-700">{book.title}</p>
                          <p className="text-[10px] text-gray-400">{book.author} · {book.category}</p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded shrink-0">
                          {book.availableCopies} available
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {issueErrors.bookId && <p className="text-[11px] text-red-500">{issueErrors.bookId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Borrower Name *"
              placeholder="Full name"
              value={issueForm.borrowerName}
              onChange={(e) => setIssue("borrowerName", e.target.value)}
              error={issueErrors.borrowerName}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Borrower Type</label>
              <select value={issueForm.borrowerType} onChange={(e) => setIssue("borrowerType", e.target.value)} className={selectCls}>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Borrower ID / Roll No"
              placeholder="e.g. STU-2025-001"
              value={issueForm.borrowerId}
              onChange={(e) => setIssue("borrowerId", e.target.value)}
            />
            <Input
              label="Due Date *"
              type="date"
              value={issueForm.dueDate}
              onChange={(e) => setIssue("dueDate", e.target.value)}
              error={issueErrors.dueDate}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Remarks</label>
            <textarea
              rows={2}
              placeholder="Optional notes..."
              value={issueForm.remarks}
              onChange={(e) => setIssue("remarks", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <Clock size={13} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700">Late return fine: <strong>PKR {FINE_PER_DAY} per day</strong> after due date</p>
          </div>

          {issueServerErr && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{issueServerErr}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setIssueModal(false)}>Cancel</Button>
          <Button className="flex-1" disabled={issueMutation.isPending} onClick={handleIssue}>
            {issueMutation.isPending ? "Issuing..." : "Issue Book"}
          </Button>
        </div>
      </Modal>

      {/* ── Return Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!returnModal} onClose={() => setReturnModal(null)} title="Return Book">
        {returnModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-[13px] font-semibold text-gray-800">{returnModal.book?.title}</p>
              <p className="text-[12px] text-gray-500">Borrowed by: <span className="font-medium">{returnModal.borrowerName}</span></p>
              <p className="text-[12px] text-gray-500">Due date: <span className={`font-medium ${returnModal.status === "OVERDUE" ? "text-red-500" : "text-gray-700"}`}>{formatDate(returnModal.dueDate)}</span></p>
            </div>

            {/* Fine preview */}
            {returnModal.status === "OVERDUE" && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-red-400 font-medium">Overdue Fine</p>
                    <p className="text-[20px] font-bold text-red-600 mt-0.5">
                      PKR {(daysOverdue(returnModal.dueDate) * FINE_PER_DAY).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-red-400">{daysOverdue(returnModal.dueDate)} days late</p>
                    <p className="text-[10px] text-red-300">PKR {FINE_PER_DAY}/day</p>
                  </div>
                </div>
              </div>
            )}

            {returnModal.status === "ISSUED" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <CheckCircle size={13} className="text-emerald-500" />
                <p className="text-[11px] text-emerald-700">Returned on time — no fine will be applied.</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Remarks (optional)</label>
              <textarea
                rows={2}
                placeholder="Book condition, notes..."
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
              />
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setReturnModal(null)}>Cancel</Button>
          <Button className="flex-1" disabled={returnMutation.isPending} onClick={() => returnMutation.mutate({ id: returnModal.id })}>
            {returnMutation.isPending ? "Processing..." : "Confirm Return"}
          </Button>
        </div>
      </Modal>

      {/* ── Mark Lost Modal ────────────────────────────────────────────────── */}
      <Modal open={!!lostModal} onClose={() => setLostModal(null)} title="Mark as Lost">
        {lostModal && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center">
                <BookX size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-800">Mark "{lostModal.book?.title}" as lost?</p>
                <p className="text-[12px] text-gray-400 mt-1">Borrowed by {lostModal.borrowerName}</p>
              </div>
            </div>
            <Input
              label="Fine Amount (PKR)"
              type="number"
              placeholder="e.g. 500"
              value={lostFine}
              onChange={(e) => setLostFine(e.target.value)}
            />
            <p className="text-[11px] text-gray-400">Set the replacement/penalty cost for the lost book.</p>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setLostModal(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={lostMutation.isPending}
            onClick={() => lostMutation.mutate({ id: lostModal.id, fine: lostFine })}>
            {lostMutation.isPending ? "Updating..." : "Mark as Lost"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Issue Details" size="md">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14px] font-semibold text-gray-800">{viewTarget.book?.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">by {viewTarget.book?.author}</p>
              </div>
              <StatusBadge status={viewTarget.status} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Borrower",      viewTarget.borrowerName],
                ["Borrower Type", viewTarget.borrowerType],
                ["Borrower ID",   viewTarget.borrowerId || "—"],
                ["Issue Date",    formatDate(viewTarget.issueDate)],
                ["Due Date",      formatDate(viewTarget.dueDate)],
                ["Return Date",   formatDate(viewTarget.returnDate)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            {viewTarget.fineAmount > 0 && (
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${viewTarget.finePaid ? "bg-gray-50" : "bg-red-50 border border-red-100"}`}>
                <div>
                  <p className="text-[11px] text-gray-400">Fine</p>
                  <p className={`text-[18px] font-bold ${viewTarget.finePaid ? "text-gray-400 line-through" : "text-red-600"}`}>
                    PKR {viewTarget.fineAmount}
                  </p>
                </div>
                {viewTarget.finePaid
                  ? <span className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-md font-medium">Paid</span>
                  : viewTarget.status === "RETURNED" && (
                    <button onClick={() => payFineMutation.mutate(viewTarget.id)} className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-md font-medium hover:bg-emerald-100 transition-colors">
                      Mark Paid
                    </button>
                  )
                }
              </div>
            )}

            {viewTarget.remarks && (
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-1">Remarks</p>
                <p className="text-[13px] text-gray-700">{viewTarget.remarks}</p>
              </div>
            )}
          </div>
        )}
        <div className="mt-5">
          <Button variant="secondary" className="w-full" onClick={() => setView(null)}>Close</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Record">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this issue record?</p>
            <p className="text-[12px] text-gray-400 mt-1">If the book is currently issued, it will be marked as returned automatically.</p>
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