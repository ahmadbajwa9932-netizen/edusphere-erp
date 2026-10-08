"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, sectionsApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import {
  Plus, Trash2, Pencil, GraduationCap,
  Users, ChevronDown, ChevronRight, BookOpen, Hash,
} from "lucide-react";

const labelCls = "text-[12px] font-medium text-gray-600";

// ─── Inline editable section row ──────────────────────────────────────────────
function SectionRow({ section, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
          <span className="text-indigo-600 text-[10px] font-bold">{section.name}</span>
        </div>
        <span className="text-[13px] text-gray-700 font-medium">Section {section.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-gray-400">
          <Users size={11} />
          <span className="text-[11px]">Capacity: {section.capacity}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(section)}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Class card ───────────────────────────────────────────────────────────────
function ClassCard({ cls, onEditClass, onDeleteClass, onAddSection, onEditSection, onDeleteSection }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      {/* Class header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[12px] font-bold">{cls.name.slice(0, 2)}</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[14px] font-semibold text-gray-800">{cls.name}</p>
            <p className="text-[11px] text-gray-400">
              {cls.sections?.length || 0} section{cls.sections?.length !== 1 ? "s" : ""}
              &nbsp;·&nbsp;
              {cls._count?.students || 0} student{cls._count?.students !== 1 ? "s" : ""}
              &nbsp;·&nbsp;
              {cls.subjects?.length || 0} subject{cls.subjects?.length !== 1 ? "s" : ""}
            </p>
          </div>
          {expanded
            ? <ChevronDown size={14} className="text-gray-300 shrink-0" />
            : <ChevronRight size={14} className="text-gray-300 shrink-0" />
          }
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onAddSection(cls)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
          >
            <Plus size={11} /> Section
          </button>
          <button
            onClick={() => onEditClass(cls)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDeleteClass(cls)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Sections list */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          {cls.sections?.length > 0 ? (
            <div className="space-y-0.5">
              {cls.sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  onEdit={onEditSection}
                  onDelete={onDeleteSection}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2">
              <p className="text-[12px] text-gray-400">No sections added yet</p>
              <button
                onClick={() => onAddSection(cls)}
                className="text-[12px] text-indigo-500 hover:underline"
              >
                Add first section
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClassesPage() {
  const queryClient = useQueryClient();

  // ── Modals ────────────────────────────────────────────────────────────────
  const [classModal, setClassModal]     = useState(false);
  const [editClass, setEditClass]       = useState(null);
  const [classForm, setClassForm]       = useState({ name: "" });
  const [classError, setClassError]     = useState("");

  const [sectionModal, setSectionModal] = useState(false);
  const [editSection, setEditSection]   = useState(null);
  const [sectionCtx, setSectionCtx]     = useState(null); // which class
  const [sectionForm, setSectionForm]   = useState({ name: "", capacity: "40" });
  const [sectionError, setSectionError] = useState("");

  const [deleteClassTarget, setDeleteClassTarget]     = useState(null);
  const [deleteSectionId, setDeleteSectionId]         = useState(null);
  const [deleteError, setDeleteError]                 = useState("");

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes-full"],
    queryFn: classesApi.getAll,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createClassMutation = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes-full"] }); queryClient.invalidateQueries({ queryKey: ["classes"] }); closeClassModal(); },
    onError: (err) => setClassError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, ...data }) => classesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes-full"] }); queryClient.invalidateQueries({ queryKey: ["classes"] }); closeClassModal(); },
    onError: (err) => setClassError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id) => classesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes-full"] }); queryClient.invalidateQueries({ queryKey: ["classes"] }); setDeleteClassTarget(null); setDeleteError(""); },
    onError: (err) => setDeleteError(err?.response?.data?.error || "Cannot delete this class."),
  });

  const createSectionMutation = useMutation({
    mutationFn: sectionsApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes-full"] }); closeSectionModal(); },
    onError: (err) => setSectionError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, ...data }) => sectionsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes-full"] }); closeSectionModal(); },
    onError: (err) => setSectionError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: sectionsApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes-full"] }); setDeleteSectionId(null); },
  });

  // ── Class modal helpers ───────────────────────────────────────────────────
  const openAddClass = () => {
    setEditClass(null);
    setClassForm({ name: "" });
    setClassError("");
    setClassModal(true);
  };

  const openEditClass = (cls) => {
    setEditClass(cls);
    setClassForm({ name: cls.name });
    setClassError("");
    setClassModal(true);
  };

  const closeClassModal = () => { setClassModal(false); setEditClass(null); setClassError(""); };

  const handleClassSubmit = () => {
    if (!classForm.name.trim()) { setClassError("Class name is required."); return; }
    if (editClass) {
      updateClassMutation.mutate({ id: editClass.id, name: classForm.name });
    } else {
      createClassMutation.mutate({ name: classForm.name });
    }
  };

  // ── Section modal helpers ─────────────────────────────────────────────────
  const openAddSection = (cls) => {
    setEditSection(null);
    setSectionCtx(cls);
    setSectionForm({ name: "", capacity: "40" });
    setSectionError("");
    setSectionModal(true);
  };

  const openEditSection = (section) => {
    setEditSection(section);
    setSectionCtx(null);
    setSectionForm({ name: section.name, capacity: String(section.capacity) });
    setSectionError("");
    setSectionModal(true);
  };

  const closeSectionModal = () => { setSectionModal(false); setEditSection(null); setSectionCtx(null); setSectionError(""); };

  const handleSectionSubmit = () => {
    if (!sectionForm.name.trim()) { setSectionError("Section name is required."); return; }
    if (editSection) {
      updateSectionMutation.mutate({ id: editSection.id, ...sectionForm });
    } else {
      createSectionMutation.mutate({ ...sectionForm, classId: sectionCtx.id });
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSections = classes.reduce((s, c) => s + (c.sections?.length || 0), 0);
  const totalStudents = classes.reduce((s, c) => s + (c._count?.students || 0), 0);
  const totalSubjects = classes.reduce((s, c) => s + (c.subjects?.length || 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Classes & Sections" description="Manage classes and their sections">
        <Button icon={Plus} onClick={openAddClass}>Add Class</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Classes",   value: classes.length, icon: GraduationCap, color: "bg-indigo-50 text-indigo-600" },
          { label: "Total Sections",  value: totalSections,  icon: Hash,          color: "bg-purple-50 text-purple-600" },
          { label: "Total Students",  value: totalStudents,  icon: Users,         color: "bg-emerald-50 text-emerald-600" },
          { label: "Total Subjects",  value: totalSubjects,  icon: BookOpen,      color: "bg-amber-50 text-amber-600" },
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

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-32 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
            <GraduationCap size={20} className="text-indigo-300" />
          </div>
          <p className="text-[13px] text-gray-500 font-medium">No classes yet</p>
          <p className="text-[12px] text-gray-400">Click "Add Class" to create the first one</p>
          <Button icon={Plus} onClick={openAddClass}>Add First Class</Button>
        </div>
      )}

      {/* Classes grid */}
      {!isLoading && classes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onEditClass={openEditClass}
              onDeleteClass={(c) => { setDeleteClassTarget(c); setDeleteError(""); }}
              onAddSection={openAddSection}
              onEditSection={openEditSection}
              onDeleteSection={(id) => setDeleteSectionId(id)}
            />
          ))}
        </div>
      )}

      {/* ── Add/Edit Class Modal ───────────────────────────────────────────── */}
      <Modal open={classModal} onClose={closeClassModal} title={editClass ? "Edit Class" : "Add Class"}>
        <div className="space-y-3">
          <Input
            label="Class Name *"
            placeholder="e.g. Class 1, Grade 5, KG-A"
            value={classForm.name}
            onChange={(e) => { setClassForm({ name: e.target.value }); setClassError(""); }}
            error={classError}
          />
          <p className="text-[11px] text-gray-400">
            Use a clear name like "Class 1", "Grade 9", or "KG". Sections are added separately.
          </p>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeClassModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createClassMutation.isPending || updateClassMutation.isPending}
            onClick={handleClassSubmit}
          >
            {createClassMutation.isPending || updateClassMutation.isPending
              ? "Saving..." : editClass ? "Update Class" : "Add Class"}
          </Button>
        </div>
      </Modal>

      {/* ── Add/Edit Section Modal ─────────────────────────────────────────── */}
      <Modal
        open={sectionModal}
        onClose={closeSectionModal}
        title={editSection
          ? `Edit Section ${editSection.name}`
          : `Add Section to ${sectionCtx?.name}`}
      >
        <div className="space-y-3">
          <Input
            label="Section Name *"
            placeholder="e.g. A, B, C or Blue, Red"
            value={sectionForm.name}
            onChange={(e) => { setSectionForm((p) => ({ ...p, name: e.target.value })); setSectionError(""); }}
            error={sectionError}
          />
          <Input
            label="Capacity (students)"
            type="number"
            placeholder="e.g. 40"
            value={sectionForm.capacity}
            onChange={(e) => setSectionForm((p) => ({ ...p, capacity: e.target.value }))}
          />
          <p className="text-[11px] text-gray-400">
            Section name will be saved in uppercase automatically (e.g. "a" → "A").
          </p>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeSectionModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createSectionMutation.isPending || updateSectionMutation.isPending}
            onClick={handleSectionSubmit}
          >
            {createSectionMutation.isPending || updateSectionMutation.isPending
              ? "Saving..." : editSection ? "Update Section" : "Add Section"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Class Modal ─────────────────────────────────────────────── */}
      <Modal open={!!deleteClassTarget} onClose={() => { setDeleteClassTarget(null); setDeleteError(""); }} title="Delete Class">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete {deleteClassTarget?.name}?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              All sections and subjects in this class will also be deleted.
            </p>
          </div>
          {deleteError && (
            <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg w-full">{deleteError}</p>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => { setDeleteClassTarget(null); setDeleteError(""); }}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteClassMutation.isPending}
            onClick={() => deleteClassMutation.mutate(deleteClassTarget.id)}
          >
            {deleteClassMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Section Modal ───────────────────────────────────────────── */}
      <Modal open={!!deleteSectionId} onClose={() => setDeleteSectionId(null)} title="Delete Section">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this section?</p>
            <p className="text-[12px] text-gray-400 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteSectionId(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteSectionMutation.isPending}
            onClick={() => deleteSectionMutation.mutate(deleteSectionId)}
          >
            {deleteSectionMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}