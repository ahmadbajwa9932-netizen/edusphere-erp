"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { booksApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, BookOpen, Search,
  Eye, Library, BookMarked, BookX, Package,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS   = ["Book", "Author", "Category", "Copies", "Shelf", "Status", "Actions"];
const CATEGORIES = [
  "Islamic Studies", "Mathematics", "Science", "English", "Urdu",
  "History", "Geography", "Computer Science", "Fiction", "Non-Fiction",
  "Reference", "Biography", "Sports", "Arts", "Other",
];
const LANGUAGES  = ["Urdu", "English", "Arabic", "Punjabi", "Other"];

const STATUS_CONFIG = {
  AVAILABLE:    { label: "Available",    color: "bg-emerald-50 text-emerald-700 border border-emerald-100", dot: "bg-emerald-400" },
  OUT_OF_STOCK: { label: "Out of Stock", color: "bg-amber-50 text-amber-700 border border-amber-100",      dot: "bg-amber-400"   },
  LOST:         { label: "Lost",         color: "bg-red-50 text-red-600 border border-red-100",             dot: "bg-red-400"     },
  DAMAGED:      { label: "Damaged",      color: "bg-orange-50 text-orange-600 border border-orange-100",   dot: "bg-orange-400"  },
};

const CATEGORY_COLORS = [
  "bg-indigo-50 text-indigo-600", "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-700",   "bg-purple-50 text-purple-600",
  "bg-pink-50 text-pink-600",     "bg-sky-50 text-sky-600",
  "bg-orange-50 text-orange-600", "bg-teal-50 text-teal-600",
];

const categoryColor = (cat) => CATEGORY_COLORS[(cat?.charCodeAt(0) || 0) % CATEGORY_COLORS.length];

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.AVAILABLE;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CopyBar({ available, total }) {
  const pct = total > 0 ? (available / total) * 100 : 0;
  const color = pct === 0 ? "bg-red-400" : pct < 40 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-gray-500">{available}/{total}</span>
    </div>
  );
}

export default function BookCatalogPage() {
  const queryClient = useQueryClient();

  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [status,   setStatus]   = useState("");
  const [language, setLanguage] = useState("");
  const [page,     setPage]     = useState(1);

  const [addModal,   setAddModal]  = useState(false);
  const [editTarget, setEdit]      = useState(null);
  const [deleteId,   setDeleteId]  = useState(null);
  const [viewTarget, setView]      = useState(null);
  const [deleteError,setDeleteErr] = useState("");

  const emptyForm = {
    title: "", author: "", isbn: "", category: "Islamic Studies",
    publisher: "", publishYear: "", totalCopies: "1",
    shelf: "", language: "Urdu", description: "",
  };
  const [form,        setForm]        = useState(emptyForm);
  const [formErrors,  setFormErrors]  = useState({});
  const [serverError, setServerError] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["books", search, category, status, language, page],
    queryFn:  () => booksApi.getAll({ search, category, status, language, page, limit: 20 }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: booksApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["books"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => booksApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["books"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: booksApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["books"] }); setDeleteId(null); setDeleteErr(""); },
    onError: (err) => setDeleteErr(err?.response?.data?.error || "Cannot delete this book."),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())    e.title    = "Title is required";
    if (!form.author.trim())   e.author   = "Author is required";
    if (!form.category)        e.category = "Category is required";
    if (!form.totalCopies || parseInt(form.totalCopies) < 1) e.totalCopies = "At least 1 copy required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEdit(null); setForm(emptyForm); setFormErrors({}); setServerError(""); setAddModal(true);
  };

  const openEdit = (book) => {
    setEdit(book);
    setForm({
      title:       book.title,
      author:      book.author,
      isbn:        book.isbn        || "",
      category:    book.category,
      publisher:   book.publisher   || "",
      publishYear: book.publishYear ? String(book.publishYear) : "",
      totalCopies: String(book.totalCopies),
      shelf:       book.shelf       || "",
      language:    book.language,
      description: book.description || "",
      status:      book.status,
    });
    setFormErrors({}); setServerError(""); setAddModal(true);
  };

  const closeModal = () => { setAddModal(false); setEdit(null); setServerError(""); };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) updateMutation.mutate({ id: editTarget.id, ...form });
    else            createMutation.mutate(form);
  };

  const clearFilters = () => { setSearch(""); setCategory(""); setStatus(""); setLanguage(""); setPage(1); };
  const hasFilters   = search || category || status || language;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const books     = data?.books || [];
  const available = books.filter((b) => b.status === "AVAILABLE").length;
  const outOfStock= books.filter((b) => b.status === "OUT_OF_STOCK").length;
  const totalCopies = books.reduce((s, b) => s + b.totalCopies, 0);

  return (
    <div className="space-y-5">

      <PageHeader title="Book Catalog" description="Manage the library book collection">
        <Button icon={Plus} onClick={openAdd}>Add Book</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Titles",  value: data?.total || 0, color: "bg-indigo-50 text-indigo-600",  icon: Library    },
          { label: "Total Copies",  value: totalCopies,       color: "bg-purple-50 text-purple-600",  icon: Package    },
          { label: "Available",     value: available,          color: "bg-emerald-50 text-emerald-600",icon: BookMarked },
          { label: "Out of Stock",  value: outOfStock,         color: "bg-amber-50 text-amber-600",   icon: BookX      },
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
            placeholder="Search title, author, ISBN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={selectCls + " max-w-[170px]"}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Languages</option>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls + " max-w-[140px]"}>
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
          isEmpty={!isLoading && books.length === 0}
          emptyIcon={BookOpen}
          emptyText="No books in catalog"
          emptySubtext="Click 'Add Book' to add the first book"
        >
          {books.map((book) => (
            <Tr key={book.id}>
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${categoryColor(book.category)}`}>
                    <BookOpen size={13} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight line-clamp-1 max-w-[200px]">{book.title}</p>
                    {book.isbn && <p className="text-[10px] text-gray-400 font-mono">ISBN: {book.isbn}</p>}
                  </div>
                </div>
              </Td>
              <Td><span className="text-[12px] text-gray-600">{book.author}</span></Td>
              <Td>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${categoryColor(book.category)}`}>
                  {book.category}
                </span>
              </Td>
              <Td><CopyBar available={book.availableCopies} total={book.totalCopies} /></Td>
              <Td>
                {book.shelf
                  ? <span className="text-[12px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{book.shelf}</span>
                  : <span className="text-gray-300 text-[12px]">—</span>
                }
              </Td>
              <Td><StatusBadge status={book.status} /></Td>
              <Td>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setView(book)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => openEdit(book)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { setDeleteId(book.id); setDeleteErr(""); }} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
        <TableFooter page={page} totalPages={data?.totalPages} total={data?.total} label="books" onPageChange={setPage} />
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={closeModal} title={editTarget ? "Edit Book" : "Add Book"} size="md">
        <div className="space-y-3">
          <Input label="Title *" placeholder="e.g. Urdu Grammar Part 1" value={form.title} onChange={(e) => set("title", e.target.value)} error={formErrors.title} />
          <Input label="Author *" placeholder="e.g. Dr. Abdul Haq" value={form.author} onChange={(e) => set("author", e.target.value)} error={formErrors.author} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Category *</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={selectCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {formErrors.category && <p className="text-[11px] text-red-500">{formErrors.category}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Language</label>
              <select value={form.language} onChange={(e) => set("language", e.target.value)} className={selectCls}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="ISBN" placeholder="e.g. 978-0-00-000000-0" value={form.isbn} onChange={(e) => set("isbn", e.target.value)} />
            <Input label="Publisher" placeholder="e.g. Oxford University Press" value={form.publisher} onChange={(e) => set("publisher", e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Publish Year" type="number" placeholder="e.g. 2020" value={form.publishYear} onChange={(e) => set("publishYear", e.target.value)} />
            <Input label="Total Copies *" type="number" placeholder="e.g. 5" value={form.totalCopies} onChange={(e) => set("totalCopies", e.target.value)} error={formErrors.totalCopies} />
            <Input label="Shelf / Rack" placeholder="e.g. A-12" value={form.shelf} onChange={(e) => set("shelf", e.target.value)} />
          </div>

          {editTarget && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Description</label>
            <textarea rows={2} placeholder="Brief description (optional)" value={form.description} onChange={(e) => set("description", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300" />
          </div>

          {serverError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button className="flex-1" disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : editTarget ? "Update Book" : "Add Book"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Book Details" size="md">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${categoryColor(viewTarget.category)}`}>
                <BookOpen size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-800">{viewTarget.title}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">by {viewTarget.author}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${categoryColor(viewTarget.category)}`}>{viewTarget.category}</span>
                  <StatusBadge status={viewTarget.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["ISBN",         viewTarget.isbn        || "—"],
                ["Publisher",    viewTarget.publisher   || "—"],
                ["Publish Year", viewTarget.publishYear || "—"],
                ["Language",     viewTarget.language],
                ["Shelf / Rack", viewTarget.shelf       || "—"],
                ["Total Issues", viewTarget._count?.issues || 0],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Copy availability bar */}
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex justify-between mb-2">
                <span className="text-[12px] text-gray-500">Copy Availability</span>
                <span className="text-[12px] font-semibold text-gray-700">
                  {viewTarget.availableCopies} / {viewTarget.totalCopies} available
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    viewTarget.availableCopies === 0 ? "bg-red-400"
                    : viewTarget.availableCopies / viewTarget.totalCopies < 0.4 ? "bg-amber-400"
                    : "bg-emerald-400"
                  }`}
                  style={{ width: `${viewTarget.totalCopies > 0 ? (viewTarget.availableCopies / viewTarget.totalCopies) * 100 : 0}%` }}
                />
              </div>
            </div>

            {viewTarget.description && (
              <div className="bg-gray-50 rounded-lg px-3 py-3">
                <p className="text-[10px] text-gray-400 mb-1">Description</p>
                <p className="text-[13px] text-gray-700 leading-relaxed">{viewTarget.description}</p>
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
      <Modal open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteErr(""); }} title="Delete Book">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this book?</p>
            <p className="text-[12px] text-gray-400 mt-1">All issue history will also be deleted.</p>
          </div>
          {deleteError && <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg w-full">{deleteError}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => { setDeleteId(null); setDeleteErr(""); }}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>
            {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}