"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectsApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, BookOpen, Search,
  GraduationCap, Hash,
} from "lucide-react";

const COLUMNS = ["Subject", "Code", "Class", "Description", "Actions"];

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

// subject color based on name initial
const SUBJECT_COLORS = [
  "bg-indigo-100 text-indigo-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-purple-100 text-purple-600",
  "bg-pink-100 text-pink-600",
  "bg-sky-100 text-sky-600",
  "bg-orange-100 text-orange-600",
  "bg-teal-100 text-teal-600",
];

function subjectColor(name) {
  const idx = (name?.charCodeAt(0) || 0) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[idx];
}

export default function SubjectsPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]     = useState("");
  const [classId, setClassId]   = useState("");
  const [page, setPage]         = useState(1);
  const LIMIT = 20;

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal, setAddModal]   = useState(false);
  const [editTarget, setEdit]     = useState(null);
  const [deleteId, setDeleteId]   = useState(null);

  const emptyForm = { name: "", code: "", description: "", classId: "" };
  const [form, setForm]           = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects", search, classId],
    queryFn: () => subjectsApi.getAll({ search, classId }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subjects"] }); queryClient.invalidateQueries({ queryKey: ["classes-full"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => subjectsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subjects"] }); queryClient.invalidateQueries({ queryKey: ["classes-full"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subjects"] }); queryClient.invalidateQueries({ queryKey: ["classes-full"] }); setDeleteId(null); },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name    = "Subject name is required";
    if (!form.classId)     e.classId = "Please select a class";
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

  const openEdit = (subject) => {
    setEdit(subject);
    setForm({
      name:        subject.name,
      code:        subject.code        || "",
      description: subject.description || "",
      classId:     String(subject.classId),
    });
    setFormErrors({});
    setServerError("");
    setAddModal(true);
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

  // ── Pagination ────────────────────────────────────────────────────────────
  const total      = subjects.length;
  const totalPages = Math.ceil(total / LIMIT);
  const paginated  = subjects.slice((page - 1) * LIMIT, page * LIMIT);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const uniqueClasses = new Set(subjects.map((s) => s.classId)).size;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Subjects" description="Manage subjects assigned to each class">
        <Button icon={Plus} onClick={openAdd}>Add Subject</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Subjects", value: total,         icon: BookOpen,      color: "bg-indigo-50 text-indigo-600" },
          { label: "Classes Covered",value: uniqueClasses, icon: GraduationCap, color: "bg-emerald-50 text-emerald-600" },
          { label: "With Code",      value: subjects.filter((s) => s.code).length, icon: Hash, color: "bg-amber-50 text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">{stat.label}</p>
                <p className="text-[20px] font-bold text-gray-800">{stat.value}</p>
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
            placeholder="Search subject name or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setPage(1); }}
          className={selectCls + " max-w-[180px]"}
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(search || classId) && (
          <button
            onClick={() => { setSearch(""); setClassId(""); setPage(1); }}
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
          emptyText="No subjects found"
          emptySubtext="Add a subject to get started"
        >
          {paginated.map((subject) => (
            <Tr key={subject.id}>
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${subjectColor(subject.name)}`}>
                    <span className="text-[11px] font-bold">{subject.name[0]}</span>
                  </div>
                  <span className="text-[13px] font-medium text-gray-800">{subject.name}</span>
                </div>
              </Td>
              <Td>
                {subject.code ? (
                  <span className="font-mono text-[12px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {subject.code}
                  </span>
                ) : (
                  <span className="text-gray-300 text-[12px]">—</span>
                )}
              </Td>
              <Td>
                <span className="text-[12px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">
                  {subject.class?.name}
                </span>
              </Td>
              <Td>
                <span className="text-[12px] text-gray-500 line-clamp-1 max-w-[200px]">
                  {subject.description || "—"}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => openEdit(subject)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(subject.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
          label="subjects"
          onPageChange={setPage}
        />
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        open={addModal}
        onClose={closeModal}
        title={editTarget ? "Edit Subject" : "Add Subject"}
      >
        <div className="space-y-3">
          <Input
            label="Subject Name *"
            placeholder="e.g. Mathematics, Urdu, Physics"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={formErrors.name}
          />
          <Input
            label="Subject Code"
            placeholder="e.g. MATH-01, PHY-09"
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Class *</label>
            <select
              value={form.classId}
              onChange={(e) => set("classId", e.target.value)}
              className={selectCls}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {formErrors.classId && (
              <p className="text-[11px] text-red-500">{formErrors.classId}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Description</label>
            <textarea
              rows={2}
              placeholder="Optional — brief description of this subject"
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
              ? "Saving..." : editTarget ? "Update Subject" : "Add Subject"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Subject">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this subject?</p>
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