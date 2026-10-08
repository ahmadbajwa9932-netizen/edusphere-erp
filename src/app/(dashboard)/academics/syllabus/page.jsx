"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { syllabusApi, classesApi, subjectsApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, BookOpen, Search,
  CheckCircle2, Clock, Circle, Eye,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS = ["Title", "Class", "Subject", "Term", "Dates", "Status", "Actions"];
const LIMIT   = 20;

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year", "Mid Term", "Final Term"];

const STATUS_CONFIG = {
  PLANNED:     { label: "Planned",     icon: Circle,       color: "bg-gray-50 text-gray-500 border border-gray-200",         dot: "bg-gray-400"   },
  IN_PROGRESS: { label: "In Progress", icon: Clock,        color: "bg-amber-50 text-amber-700 border border-amber-100",      dot: "bg-amber-400"  },
  COMPLETED:   { label: "Completed",   icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border border-emerald-100", dot: "bg-emerald-400"},
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLANNED;
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
export default function SyllabusPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState("");
  const [classId,   setClassId]   = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status,    setStatus]    = useState("");
  const [term,      setTerm]      = useState("");
  const [page,      setPage]      = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal,    setAddModal]  = useState(false);
  const [editTarget,  setEdit]      = useState(null);
  const [deleteId,    setDeleteId]  = useState(null);
  const [viewTarget,  setView]      = useState(null);

  const emptyForm = {
    classId: "", subjectId: "", term: "",
    title: "", description: "",
    status: "PLANNED", startDate: "", endDate: "",
  };
  const [form,        setForm]       = useState(emptyForm);
  const [formErrors,  setFormErrors] = useState({});
  const [serverError, setServerError]= useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: syllabus = [], isLoading } = useQuery({
    queryKey: ["syllabus", search, classId, subjectId, status, term],
    queryFn:  () => syllabusApi.getAll({ search, classId, subjectId, status, term }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // subjects filtered by selected class in form
  const { data: formSubjects = [] } = useQuery({
    queryKey: ["subjects", form.classId],
    queryFn:  () => subjectsApi.getAll({ classId: form.classId }),
    enabled:  !!form.classId,
  });

  // subjects for filter bar (all)
  const { data: allSubjects = [] } = useQuery({
    queryKey: ["subjects", classId, "filter"],
    queryFn:  () => subjectsApi.getAll(classId ? { classId } : {}),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: syllabusApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      closeModal();
    },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => syllabusApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      closeModal();
    },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: syllabusApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus"] });
      setDeleteId(null);
    },
  });

  // ── Quick status update (inline from table) ───────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => syllabusApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["syllabus"] }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => {
      const next = { ...p, [field]: value };
      // reset subjectId when class changes
      if (field === "classId") next.subjectId = "";
      return next;
    });
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.classId)       e.classId   = "Please select a class";
    if (!form.subjectId)     e.subjectId = "Please select a subject";
    if (!form.term.trim())   e.term      = "Term is required";
    if (!form.title.trim())  e.title     = "Title is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEdit(null);
    setForm(emptyForm);
    setFormErrors({});
    setServerError("");
    setAddModal(true);
  };

  const openEdit = (item) => {
    setEdit(item);
    setForm({
      classId:     String(item.classId),
      subjectId:   String(item.subjectId),
      term:        item.term,
      title:       item.title,
      description: item.description || "",
      status:      item.status,
      startDate:   item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : "",
      endDate:     item.endDate   ? new Date(item.endDate).toISOString().split("T")[0]   : "",
    });
    setFormErrors({});
    setServerError("");
    setAddModal(true);
  };

  const closeModal = () => {
    setAddModal(false);
    setEdit(null);
    setServerError("");
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const clearFilters = () => {
    setSearch(""); setClassId(""); setSubjectId("");
    setStatus(""); setTerm(""); setPage(1);
  };
  const hasFilters = search || classId || subjectId || status || term;

  // ── Pagination (client side slice) ────────────────────────────────────────
  const total      = syllabus.length;
  const totalPages = Math.ceil(total / LIMIT);
  const paginated  = syllabus.slice((page - 1) * LIMIT, page * LIMIT);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const planned    = syllabus.filter((s) => s.status === "PLANNED").length;
  const inProgress = syllabus.filter((s) => s.status === "IN_PROGRESS").length;
  const completed  = syllabus.filter((s) => s.status === "COMPLETED").length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Syllabus" description="Manage syllabus and curriculum plans per class and subject">
        <Button icon={Plus} onClick={openAdd}>Add Syllabus</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total",       value: total,      color: "bg-indigo-50 text-indigo-600",   icon: BookOpen      },
          { label: "Planned",     value: planned,    color: "bg-gray-50 text-gray-500",       icon: Circle        },
          { label: "In Progress", value: inProgress, color: "bg-amber-50 text-amber-600",     icon: Clock         },
          { label: "Completed",   value: completed,  color: "bg-emerald-50 text-emerald-600", icon: CheckCircle2  },
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
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search title or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>

        {/* Class filter */}
        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setPage(1); }}
          className={selectCls + " max-w-[150px]"}
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Subject filter */}
        <select
          value={subjectId}
          onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
          className={selectCls + " max-w-[170px]"}
        >
          <option value="">All Subjects</option>
          {allSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Term filter */}
        <select
          value={term}
          onChange={(e) => { setTerm(e.target.value); setPage(1); }}
          className={selectCls + " max-w-[140px]"}
        >
          <option value="">All Terms</option>
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={selectCls + " max-w-[150px]"}
        >
          <option value="">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && paginated.length === 0}
          emptyIcon={BookOpen}
          emptyText="No syllabus entries found"
          emptySubtext="Click 'Add Syllabus' to create the first entry"
        >
          {paginated.map((item) => (
            <Tr key={item.id}>

              {/* Title */}
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <BookOpen size={13} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight line-clamp-1">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-gray-400 line-clamp-1 max-w-[220px]">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </Td>

              {/* Class */}
              <Td>
                <span className="text-[12px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">
                  {item.class?.name}
                </span>
              </Td>

              {/* Subject */}
              <Td>
                <span className="text-[13px] text-gray-700">{item.subject?.name}</span>
              </Td>

              {/* Term */}
              <Td>
                <span className="text-[12px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                  {item.term}
                </span>
              </Td>

              {/* Dates */}
              <Td>
                <div>
                  <p className="text-[11px] text-gray-500">{formatDate(item.startDate)}</p>
                  <p className="text-[11px] text-gray-400">to {formatDate(item.endDate)}</p>
                </div>
              </Td>

              {/* Status — clickable to cycle */}
              <Td>
                <div className="relative group">
                  <StatusBadge status={item.status} />
                  {/* Quick change dropdown on hover */}
                  <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-gray-100 rounded-lg shadow-lg py-1 hidden group-hover:block min-w-[130px]">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => statusMutation.mutate({ id: item.id, status: key })}
                        className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-50 flex items-center gap-2 ${item.status === key ? "font-semibold text-indigo-600" : "text-gray-600"}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Td>

              {/* Actions */}
              <Td>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setView(item)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="View details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Td>

            </Tr>
          ))}
        </Table>

        <TableFooter
          page={page}
          totalPages={totalPages}
          total={total}
          label="entries"
          onPageChange={setPage}
        />
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        open={addModal}
        onClose={closeModal}
        title={editTarget ? "Edit Syllabus" : "Add Syllabus"}
        size="md"
      >
        <div className="space-y-3">
          {/* Class */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Class *</label>
              <select
                value={form.classId}
                onChange={(e) => set("classId", e.target.value)}
                className={selectCls}
              >
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {formErrors.classId && <p className="text-[11px] text-red-500">{formErrors.classId}</p>}
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Subject *</label>
              <select
                value={form.subjectId}
                onChange={(e) => set("subjectId", e.target.value)}
                className={selectCls}
                disabled={!form.classId}
              >
                <option value="">{form.classId ? "Select subject" : "Select class first"}</option>
                {formSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {formErrors.subjectId && <p className="text-[11px] text-red-500">{formErrors.subjectId}</p>}
            </div>
          </div>

          {/* Term + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Term *</label>
              <select
                value={form.term}
                onChange={(e) => set("term", e.target.value)}
                className={selectCls}
              >
                <option value="">Select term</option>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {formErrors.term && <p className="text-[11px] text-red-500">{formErrors.term}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={selectCls}
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <Input
            label="Title *"
            placeholder="e.g. Chapter 1-5: Algebra & Geometry"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            error={formErrors.title}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Description</label>
            <textarea
              rows={3}
              placeholder="Topics covered, learning objectives, notes..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
            />
          </div>

          {serverError && (
            <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..." : editTarget ? "Update" : "Add Syllabus"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Syllabus Details" size="md">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-gray-800">{viewTarget.title}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {viewTarget.subject?.name} &nbsp;·&nbsp; {viewTarget.class?.name}
                </p>
              </div>
              <StatusBadge status={viewTarget.status} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Term",       viewTarget.term],
                ["Class",      viewTarget.class?.name],
                ["Subject",    viewTarget.subject?.name],
                ["Start Date", formatDate(viewTarget.startDate)],
                ["End Date",   formatDate(viewTarget.endDate)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value || "—"}</p>
                </div>
              ))}
            </div>

            {viewTarget.description && (
              <div className="bg-gray-50 rounded-lg px-3 py-3">
                <p className="text-[10px] text-gray-400 mb-1">Description</p>
                <p className="text-[13px] text-gray-700 leading-relaxed">{viewTarget.description}</p>
              </div>
            )}

            {/* Quick status change in view */}
            <div>
              <p className="text-[11px] text-gray-400 mb-2">Change Status</p>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => {
                      statusMutation.mutate({ id: viewTarget.id, status: key });
                      setView((p) => ({ ...p, status: key }));
                    }}
                    className={`flex-1 text-[11px] font-medium px-2 py-1.5 rounded-lg border transition-all ${
                      viewTarget.status === key
                        ? cfg.color + " font-semibold"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setView(null)}>Close</Button>
          <Button className="flex-1" icon={Pencil} onClick={() => { setView(null); openEdit(viewTarget); }}>
            Edit
          </Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Syllabus">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this syllabus entry?</p>
            <p className="text-[12px] text-gray-400 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteId)}
          >
            {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}