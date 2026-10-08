"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { noticesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, Bell, Search, Eye,
  AlertTriangle, Info, CheckCircle, ArrowUp,
  Users, GraduationCap, BookOpen, Globe,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS  = ["Notice", "Category", "Audience", "Priority", "Published", "Status", "Actions"];
const CATEGORIES  = ["General", "Exam", "Holiday", "Event", "Fee", "Urgent", "Meeting", "Sports"];
const AUDIENCES   = ["All", "Students", "Teachers", "Parents"];

const PRIORITY_CONFIG = {
  LOW:    { label: "Low",    color: "bg-gray-50 text-gray-500 border border-gray-200",        icon: ArrowUp,      dot: "bg-gray-300"   },
  NORMAL: { label: "Normal", color: "bg-blue-50 text-blue-600 border border-blue-100",        icon: Info,         dot: "bg-blue-400"   },
  HIGH:   { label: "High",   color: "bg-amber-50 text-amber-700 border border-amber-100",     icon: AlertTriangle,dot: "bg-amber-400"  },
  URGENT: { label: "Urgent", color: "bg-red-50 text-red-600 border border-red-100",           icon: AlertTriangle,dot: "bg-red-500"    },
};

const AUDIENCE_ICON = {
  All: Globe, Students: GraduationCap, Teachers: BookOpen, Parents: Users,
};

const CATEGORY_COLOR = {
  General: "bg-gray-100 text-gray-600",
  Exam:    "bg-indigo-50 text-indigo-600",
  Holiday: "bg-emerald-50 text-emerald-600",
  Event:   "bg-purple-50 text-purple-600",
  Fee:     "bg-amber-50 text-amber-700",
  Urgent:  "bg-red-50 text-red-600",
  Meeting: "bg-sky-50 text-sky-600",
  Sports:  "bg-orange-50 text-orange-600",
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NoticeBoardPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState("");
  const [category,  setCategory]  = useState("");
  const [priority,  setPriority]  = useState("");
  const [audience,  setAudience]  = useState("");
  const [published, setPublished] = useState("");
  const [page,      setPage]      = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal,   setAddModal]  = useState(false);
  const [editTarget, setEdit]      = useState(null);
  const [deleteId,   setDeleteId]  = useState(null);
  const [viewTarget, setView]      = useState(null);

  const emptyForm = {
    title: "", content: "", category: "General",
    priority: "NORMAL", targetAudience: "All",
    publishDate: new Date().toISOString().split("T")[0],
    expiryDate: "", isPublished: true,
  };
  const [form,       setForm]       = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [serverError,setServerError]= useState("");

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["notices", search, category, priority, audience, published, page],
    queryFn:  () => noticesApi.getAll({ search, category, priority, audience, published, page, limit: 20 }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: noticesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notices"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => noticesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notices"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: noticesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notices"] }); setDeleteId(null); },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }) => noticesApi.update(id, { isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())         e.title         = "Title is required";
    if (!form.content.trim())       e.content       = "Content is required";
    if (!form.category)             e.category      = "Category is required";
    if (!form.targetAudience)       e.targetAudience= "Audience is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEdit(null); setForm(emptyForm); setFormErrors({}); setServerError(""); setAddModal(true);
  };

  const openEdit = (notice) => {
    setEdit(notice);
    setForm({
      title:          notice.title,
      content:        notice.content,
      category:       notice.category,
      priority:       notice.priority,
      targetAudience: notice.targetAudience,
      publishDate:    notice.publishDate ? new Date(notice.publishDate).toISOString().split("T")[0] : "",
      expiryDate:     notice.expiryDate  ? new Date(notice.expiryDate).toISOString().split("T")[0]  : "",
      isPublished:    notice.isPublished,
    });
    setFormErrors({}); setServerError(""); setAddModal(true);
  };

  const closeModal = () => { setAddModal(false); setEdit(null); setServerError(""); };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const clearFilters = () => {
    setSearch(""); setCategory(""); setPriority("");
    setAudience(""); setPublished(""); setPage(1);
  };
  const hasFilters = search || category || priority || audience || published;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const notices   = data?.notices || [];
  const urgent    = notices.filter((n) => n.priority === "URGENT").length;
  const active    = notices.filter((n) => n.isPublished).length;
  const expired   = notices.filter((n) => n.expiryDate && new Date(n.expiryDate) < new Date()).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Notice Board" description="Post and manage announcements for students, teachers and parents">
        <Button icon={Plus} onClick={openAdd}>Post Notice</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Notices", value: data?.total || 0,  color: "bg-indigo-50 text-indigo-600",  icon: Bell          },
          { label: "Active",        value: active,             color: "bg-emerald-50 text-emerald-600",icon: CheckCircle   },
          { label: "Urgent",        value: urgent,             color: "bg-red-50 text-red-500",        icon: AlertTriangle },
          { label: "Expired",       value: expired,            color: "bg-gray-100 text-gray-500",     icon: Info          },
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
            placeholder="Search title or content..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={category}  onChange={(e) => { setCategory(e.target.value);  setPage(1); }} className={selectCls + " max-w-[140px]"}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priority}  onChange={(e) => { setPriority(e.target.value);  setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={audience}  onChange={(e) => { setAudience(e.target.value);  setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Audience</option>
          {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={published} onChange={(e) => { setPublished(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Status</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
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
          isEmpty={!isLoading && notices.length === 0}
          emptyIcon={Bell}
          emptyText="No notices found"
          emptySubtext="Click 'Post Notice' to create the first announcement"
        >
          {notices.map((notice) => {
            const AudienceIcon = AUDIENCE_ICON[notice.targetAudience] || Globe;
            const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();
            return (
              <Tr key={notice.id}>
                {/* Notice title */}
                <Td first>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${CATEGORY_COLOR[notice.category] || "bg-gray-100 text-gray-600"}`}>
                      <Bell size={12} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800 leading-tight line-clamp-1 max-w-[220px]">
                        {notice.title}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatDate(notice.publishDate)}
                        {notice.expiryDate && <> · Expires {formatDate(notice.expiryDate)}</>}
                      </p>
                    </div>
                  </div>
                </Td>

                {/* Category */}
                <Td>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${CATEGORY_COLOR[notice.category] || "bg-gray-100 text-gray-600"}`}>
                    {notice.category}
                  </span>
                </Td>

                {/* Audience */}
                <Td>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <AudienceIcon size={12} />
                    <span className="text-[12px]">{notice.targetAudience}</span>
                  </div>
                </Td>

                {/* Priority */}
                <Td><PriorityBadge priority={notice.priority} /></Td>

                {/* Publish date */}
                <Td>
                  <span className="text-[12px] text-gray-600">{formatDate(notice.publishDate)}</span>
                </Td>

                {/* Status toggle */}
                <Td>
                  <button
                    onClick={() => togglePublish.mutate({ id: notice.id, isPublished: !notice.isPublished })}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                      notice.isPublished
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {notice.isPublished ? (isExpired ? "Expired" : "Published") : "Draft"}
                  </button>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setView(notice)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEdit(notice)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(notice.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>

        <TableFooter page={page} totalPages={data?.totalPages} total={data?.total} label="notices" onPageChange={setPage} />
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={closeModal} title={editTarget ? "Edit Notice" : "Post Notice"} size="md">
        <div className="space-y-3">
          <Input
            label="Title *"
            placeholder="e.g. Annual Sports Day Announcement"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            error={formErrors.title}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Category *</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={selectCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {formErrors.category && <p className="text-[11px] text-red-500">{formErrors.category}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={selectCls}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Target Audience *</label>
              <select value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} className={selectCls}>
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {formErrors.targetAudience && <p className="text-[11px] text-red-500">{formErrors.targetAudience}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Status</label>
              <select value={String(form.isPublished)} onChange={(e) => set("isPublished", e.target.value === "true")} className={selectCls}>
                <option value="true">Published</option>
                <option value="false">Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Publish Date" type="date" value={form.publishDate} onChange={(e) => set("publishDate", e.target.value)} />
            <Input label="Expiry Date"  type="date" value={form.expiryDate}  onChange={(e) => set("expiryDate",  e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Content *</label>
            <textarea
              rows={5}
              placeholder="Write the full notice content here..."
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
            />
            {formErrors.content && <p className="text-[11px] text-red-500">{formErrors.content}</p>}
          </div>

          {serverError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button className="flex-1" disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : editTarget ? "Update Notice" : "Post Notice"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Notice Details" size="md">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-800 leading-snug">{viewTarget.title}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${CATEGORY_COLOR[viewTarget.category] || "bg-gray-100 text-gray-600"}`}>
                    {viewTarget.category}
                  </span>
                  <PriorityBadge priority={viewTarget.priority} />
                  <span className="text-[11px] text-gray-400">{viewTarget.targetAudience}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Publish Date", formatDate(viewTarget.publishDate)],
                ["Expiry Date",  formatDate(viewTarget.expiryDate)],
                ["Status",       viewTarget.isPublished ? "Published" : "Draft"],
                ["Audience",     viewTarget.targetAudience],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1.5">Content</p>
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{viewTarget.content}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setView(null)}>Close</Button>
          <Button className="flex-1" icon={Pencil} onClick={() => { setView(null); openEdit(viewTarget); }}>Edit</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Notice">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this notice?</p>
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