"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gradeConfigApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button     from "../../../../components/ui/Button";
import Modal      from "../../../../components/ui/Modal";
import { Table, Tr, Td } from "../../../../components/ui/Table";
import {
  Plus, Pencil, Trash2, GraduationCap, AlertTriangle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  grade: "", minPercent: "", maxPercent: "",
  label: "", gpaPoints: "", order: "",
};

const GRADE_PREVIEW_COLOR = {
  "A+": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "A":  "bg-emerald-50 text-emerald-600 border-emerald-200",
  "B":  "bg-blue-50 text-blue-600 border-blue-200",
  "C":  "bg-indigo-50 text-indigo-600 border-indigo-200",
  "D":  "bg-amber-50 text-amber-600 border-amber-200",
  "F":  "bg-red-50 text-red-500 border-red-200",
};

const inputCls =
  "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300";

function Field({ label, required, children, error }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] font-medium text-gray-600">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ─── Visual grade scale bar ───────────────────────────────────────────────────

function GradeScaleBar({ grades }) {
  if (!grades || grades.length === 0) return null;

  const colors = [
    "bg-emerald-500", "bg-emerald-400", "bg-blue-400",
    "bg-indigo-400",  "bg-amber-400",   "bg-red-400",
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 space-y-3">
      <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Grade Scale Preview</p>
      <div className="flex rounded-lg overflow-hidden h-8">
        {grades.map((g, i) => {
          const width = g.maxPercent - g.minPercent + (i === grades.length - 1 ? 1 : 0);
          return (
            <div
              key={g.id}
              className={`${colors[i] || "bg-gray-400"} flex items-center justify-center transition-all`}
              style={{ width: `${width}%` }}
              title={`${g.grade}: ${g.minPercent}% – ${g.maxPercent}%`}
            >
              <span className="text-white text-[10px] font-bold drop-shadow">{g.grade}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GradeConfigPage() {
  const queryClient = useQueryClient();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [errors,     setErrors]     = useState({});

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ["grade-config"],
    queryFn:  gradeConfigApi.getAll,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: gradeConfigApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["grade-config"] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => gradeConfigApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["grade-config"] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: gradeConfigApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["grade-config"] }); setDeleteId(null); },
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    const nextOrder = grades.length > 0 ? Math.max(...grades.map((g) => g.order)) + 1 : 1;
    setForm({ ...EMPTY_FORM, order: String(nextOrder) });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(g) {
    setEditTarget(g);
    setForm({
      grade:      g.grade,
      minPercent: String(g.minPercent),
      maxPercent: String(g.maxPercent),
      label:      g.label,
      gpaPoints:  g.gpaPoints !== null ? String(g.gpaPoints) : "",
      order:      String(g.order),
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.grade.trim())             e.grade      = "Grade is required";
    if (form.minPercent === "")         e.minPercent = "Min % is required";
    if (form.maxPercent === "")         e.maxPercent = "Max % is required";
    if (!form.label.trim())             e.label      = "Label is required";
    if (parseFloat(form.minPercent) > parseFloat(form.maxPercent))
                                        e.minPercent = "Min % must be less than Max %";
    if (parseFloat(form.minPercent) < 0 || parseFloat(form.maxPercent) > 100)
                                        e.maxPercent = "Percentage must be between 0 and 100";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const COLUMNS = ["Order", "Grade", "Range", "Label", "GPA Points", "Preview", "Actions"];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Grade Configuration" description="Define grading scale used across results and report cards">
        <Button icon={Plus} onClick={openAdd}>Add Grade</Button>
      </PageHeader>

      {/* Warning banner if no grades */}
      {!isLoading && grades.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-[13px] text-amber-700">
            No grade configuration found. Results and report cards will use fallback grading.
            Add grades to enable custom grading.
          </p>
        </div>
      )}

      {/* Grade scale bar */}
      <GradeScaleBar grades={grades} />

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Grades",  value: grades.length },
          { label: "Passing Grade", value: grades.find((g) => g.grade === "D")?.minPercent !== undefined ? `${grades.find((g) => g.grade === "D")?.minPercent}%` : "—" },
          { label: "Highest Grade", value: grades[0]?.grade || "—" },
          { label: "GPA Scale",     value: grades.some((g) => g.gpaPoints !== null) ? `${Math.max(...grades.filter(g => g.gpaPoints).map(g => g.gpaPoints))} pts` : "Not set" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-[11px] text-gray-400 mb-1">{label}</p>
            <p className="text-[18px] font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Table
        columns={COLUMNS}
        isLoading={isLoading}
        isEmpty={!isLoading && grades.length === 0}
        emptyIcon={GraduationCap}
        emptyText="No grade configuration"
        emptySubtext="Click 'Add Grade' to define your grading scale"
      >
        {grades.map((g) => (
          <Tr key={g.id}>
            <Td first>
              <span className="text-[12px] text-gray-400 font-mono">#{g.order}</span>
            </Td>
            <Td>
              <span className="text-[14px] font-bold text-gray-800">{g.grade}</span>
            </Td>
            <Td>
              <span className="text-[13px] text-gray-600">
                {g.minPercent}% – {g.maxPercent}%
              </span>
            </Td>
            <Td>
              <span className="text-[13px] text-gray-700">{g.label}</span>
            </Td>
            <Td>
              <span className="text-[13px] text-gray-600">
                {g.gpaPoints !== null ? g.gpaPoints.toFixed(1) : "—"}
              </span>
            </Td>
            <Td>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${GRADE_PREVIEW_COLOR[g.grade] || "bg-gray-50 text-gray-400 border-gray-200"}`}>
                {g.grade} — {g.label}
              </span>
            </Td>
            <Td>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => openEdit(g)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(g.id)}
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

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? "Edit Grade" : "Add Grade"}
      >
        <div className="grid grid-cols-2 gap-4">

          <Field label="Grade Symbol" required error={errors.grade}>
            <input
              className={inputCls}
              placeholder="e.g. A+"
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
            />
          </Field>

          <Field label="Label" required error={errors.label}>
            <input
              className={inputCls}
              placeholder="e.g. Outstanding"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
            />
          </Field>

          <Field label="Min Percentage (%)" required error={errors.minPercent}>
            <input
              type="number" min="0" max="100" className={inputCls}
              placeholder="e.g. 90"
              value={form.minPercent}
              onChange={(e) => set("minPercent", e.target.value)}
            />
          </Field>

          <Field label="Max Percentage (%)" required error={errors.maxPercent}>
            <input
              type="number" min="0" max="100" className={inputCls}
              placeholder="e.g. 100"
              value={form.maxPercent}
              onChange={(e) => set("maxPercent", e.target.value)}
            />
          </Field>

          <Field label="GPA Points">
            <input
              type="number" min="0" max="4" step="0.1" className={inputCls}
              placeholder="e.g. 4.0"
              value={form.gpaPoints}
              onChange={(e) => set("gpaPoints", e.target.value)}
            />
          </Field>

          <Field label="Display Order">
            <input
              type="number" min="1" className={inputCls}
              placeholder="e.g. 1"
              value={form.order}
              onChange={(e) => set("order", e.target.value)}
            />
          </Field>

          {/* Live preview */}
          {form.grade && (
            <div className="col-span-2 bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Preview</p>
                <p className="text-[12px] text-gray-600">
                  {form.minPercent || "?"}% – {form.maxPercent || "?"}% → <strong>{form.grade}</strong> ({form.label || "—"})
                  {form.gpaPoints && <> · GPA {form.gpaPoints}</>}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-[13px] font-bold border ${GRADE_PREVIEW_COLOR[form.grade] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                {form.grade}
              </span>
            </div>
          )}

        </div>

        {(createMutation.isError || updateMutation.isError) && (
          <p className="text-[12px] text-red-500 mt-3">Something went wrong. Please try again.</p>
        )}

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..." : editTarget ? "Update Grade" : "Add Grade"}
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Grade">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Are you sure?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              Deleting this grade will affect how results and report cards are computed.
            </p>
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
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}