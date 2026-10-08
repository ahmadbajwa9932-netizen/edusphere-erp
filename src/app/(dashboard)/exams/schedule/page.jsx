"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examsApi, classesApi, subjectsApi } from "../../../../lib/api";
import PageHeader   from "../../../../components/ui/PageHeader";
import StatCard     from "../../../../components/ui/StatCard";
import Button       from "../../../../components/ui/Button";
import Modal        from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Search, Pencil, Trash2,
  CalendarDays, BookOpen, Clock, CheckCircle2, Eye
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_TYPES = ["MIDTERM", "FINAL", "UNIT_TEST", "QUIZ", "PRACTICAL", "MOCK"];
const EXAM_STATUSES = ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"];

const TYPE_LABEL = {
  MIDTERM:   "Midterm",
  FINAL:     "Final",
  UNIT_TEST: "Unit Test",
  QUIZ:      "Quiz",
  PRACTICAL: "Practical",
  MOCK:      "Mock",
};

const TYPE_COLOR = {
  MIDTERM:   "bg-blue-50 text-blue-600",
  FINAL:     "bg-purple-50 text-purple-600",
  UNIT_TEST: "bg-orange-50 text-orange-600",
  QUIZ:      "bg-cyan-50 text-cyan-600",
  PRACTICAL: "bg-green-50 text-green-600",
  MOCK:      "bg-gray-100 text-gray-500",
};

const STATUS_LABEL = {
  SCHEDULED: "Scheduled",
  ONGOING:   "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR = {
  SCHEDULED: "bg-amber-50 text-amber-600",
  ONGOING:   "bg-blue-50 text-blue-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-500",
};

const COLUMNS = [
  "Exam Title", "Class", "Subject", "Date & Time",
  "Duration", "Marks", "Type", "Status", "Actions",
];

const EMPTY_FORM = {
  title: "", examType: "MIDTERM", classId: "", subjectId: "",
  date: "", startTime: "", duration: 60, totalMarks: 100,
  passingMarks: 40, venue: "", status: "SCHEDULED", remarks: "",
};

// ─── Small reusable chip ──────────────────────────────────────────────────────

function Chip({ label, colorCls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorCls}`}>
      {label}
    </span>
  );
}

// ─── Input helper ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300";

const selectCls =
"text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-800 bg-white [&>option]:text-gray-800 [&>option]:bg-white";

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] font-medium text-gray-600">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExamSchedulePage() {
  const queryClient = useQueryClient();

  // Filters
  const [search,    setSearch]    = useState("");
  const [classId,   setClassId]   = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examType,  setExamType]  = useState("");
  const [status,    setStatus]    = useState("");
  const [page,      setPage]      = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // exam object or null
  const [deleteId,  setDeleteId]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [viewTarget, setViewTarget] = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["exams", search, classId, subjectId, examType, status, page],
    queryFn:  () => examsApi.getAll({ search, classId, subjectId, examType, status, page, limit: 20 }),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  () => classesApi.getAll(),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects", classId],
    queryFn:  () => subjectsApi.getAll({ classId }),
    enabled:  !!classId || !!form.classId,
  });

  // Load subjects for the form's selected class
  const { data: formSubjects } = useQuery({
    queryKey: ["subjects-form", form.classId],
    queryFn:  () => subjectsApi.getAll({ classId: form.classId }),
    enabled:  !!form.classId && form.classId !== "",
    staleTime: 0,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => examsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: examsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setDeleteId(null);
    },
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(exam) {
    setEditTarget(exam);
    setForm({
      title:        exam.title,
      examType:     exam.examType,
      classId:      String(exam.classId),
      subjectId:    String(exam.subjectId),
      date:         exam.date?.slice(0, 10) || "",
      startTime:    exam.startTime,
      duration:     exam.duration,
      totalMarks:   exam.totalMarks,
      passingMarks: exam.passingMarks,
      venue:        exam.venue || "",
      status:       exam.status,
      remarks:      exam.remarks || "",
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
    if (field === "classId") {
      setForm((p) => ({ ...p, classId: value, subjectId: "" }));
    } else {
      setForm((p) => ({ ...p, [field]: value }));
    }
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.title.trim())  e.title      = "Title is required";
    if (!form.classId)       e.classId    = "Class is required";
    if (!form.subjectId)     e.subjectId  = "Subject is required";
    if (!form.date)          e.date       = "Date is required";
    if (!form.startTime)     e.startTime  = "Start time is required";
    if (!form.duration || form.duration < 1)  e.duration   = "Duration must be > 0";
    if (!form.totalMarks || form.totalMarks < 1) e.totalMarks = "Total marks required";
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

  // ── Stats ─────────────────────────────────────────────────────────────────

  const exams      = data?.exams || [];
  const scheduled  = exams.filter((e) => e.status === "SCHEDULED").length;
  const ongoing    = exams.filter((e) => e.status === "ONGOING").length;
  const completed  = exams.filter((e) => e.status === "COMPLETED").length;

  const hasFilters = search || classId || subjectId || examType || status;

  const classes  = classesData?.classes || classesData || [];
  const subjects = subjectsData?.subjects || subjectsData || [];
  const fSubjects = formSubjects?.subjects || formSubjects || [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Exam Schedule" description="Manage all scheduled exams">
        <Button icon={Plus} onClick={openAdd}>Add Exam</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Exams"  value={data?.total || 0}  icon={CalendarDays} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Scheduled"    value={scheduled}          icon={BookOpen}     color="bg-amber-50 text-amber-600" />
        <StatCard label="Ongoing"      value={ongoing}            icon={Clock}        color="bg-blue-50 text-blue-600" />
        <StatCard label="Completed"    value={completed}          icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text" placeholder="Search exam title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>

        {/* Class filter */}
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setPage(1); }} className={selectCls}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Subject filter */}
        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Type */}
        <select value={examType} onChange={(e) => { setExamType(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Types</option>
          {EXAM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>

        {/* Status */}
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Status</option>
          {EXAM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setClassId(""); setSubjectId(""); setExamType(""); setStatus(""); setPage(1); }}
            className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
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
          isEmpty={!isLoading && exams.length === 0}
          emptyIcon={CalendarDays}
          emptyText="No exams scheduled"
          emptySubtext="Click 'Add Exam' to schedule one"
        >
          {exams.map((exam) => (
            <Tr key={exam.id}>

              {/* Title */}
              <Td first>
                <p className="text-[13px] font-medium text-gray-800">{exam.title}</p>
                {exam.venue && <p className="text-[11px] text-gray-400">{exam.venue}</p>}
              </Td>

              {/* Class */}
              <Td>
                <span className="text-[13px] text-gray-700">{exam.class?.name}</span>
              </Td>

              {/* Subject */}
              <Td>
                <span className="text-[13px] text-gray-700">{exam.subject?.name}</span>
              </Td>

              {/* Date & Time */}
              <Td>
                <p className="text-[13px] text-gray-700">
                  {new Date(exam.date).toLocaleDateString("en-PK", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </p>
                <p className="text-[11px] text-gray-400">{exam.startTime}</p>
              </Td>

              {/* Duration */}
              <Td>
                <span className="text-[13px] text-gray-600">{exam.duration} min</span>
              </Td>

              {/* Marks */}
              <Td>
                <span className="text-[13px] text-gray-700">{exam.totalMarks}</span>
                <span className="text-[11px] text-gray-400"> / pass {exam.passingMarks}</span>
              </Td>

              {/* Type */}
              <Td>
                <Chip
                  label={TYPE_LABEL[exam.examType] || exam.examType}
                  colorCls={TYPE_COLOR[exam.examType] || "bg-gray-100 text-gray-500"}
                />
              </Td>

              {/* Status */}
              <Td>
                <Chip
                  label={STATUS_LABEL[exam.status] || exam.status}
                  colorCls={STATUS_COLOR[exam.status] || "bg-gray-100 text-gray-500"}
                />
              </Td>

              {/* Actions */}
              <Td>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => openEdit(exam)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
  onClick={() => setViewTarget(exam)}
  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
  title="View"
>
  <Eye size={14} />
</button>
                  <button
                    onClick={() => setDeleteId(exam.id)}
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
          totalPages={data?.totalPages}
          total={data?.total}
          label="exams"
          onPageChange={setPage}
        />
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? "Edit Exam" : "Schedule New Exam"}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Title */}
          <div className="sm:col-span-2">
            <Field label="Exam Title" required>
              <input
                className={inputCls}
                placeholder="e.g. Mathematics Midterm 2025"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
              {errors.title && <p className="text-[11px] text-red-500 mt-0.5">{errors.title}</p>}
            </Field>
          </div>

          {/* Class */}
          <Field label="Class" required>
            <select className={`${inputCls} ${!form.classId ? "text-gray-300" : "text-gray-700"}`}
              value={form.classId}
              onChange={(e) => set("classId", e.target.value)}
            >
              <option value="">Select Class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.classId && <p className="text-[11px] text-red-500 mt-0.5">{errors.classId}</p>}
          </Field>

          {/* Subject */}
          <Field label="Subject" required>
            <select
              className={`${inputCls} ${!form.subjectId ? "text-gray-300" : "text-gray-700"}`}
              value={form.subjectId}
              onChange={(e) => set("subjectId", e.target.value)}
              disabled={!form.classId}
            >
              <option value="">{form.classId ? "Select Subject" : "Select class first"}</option>
              {fSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.subjectId && <p className="text-[11px] text-red-500 mt-0.5">{errors.subjectId}</p>}
          </Field>

          {/* Exam Type */}
          <Field label="Exam Type">
            <select className={`${inputCls} text-gray-700`} value={form.examType} onChange={(e) => set("examType", e.target.value)}>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </Field>

          {/* Status */}
          <Field label="Status">
            <select className={`${inputCls} text-gray-700`} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {EXAM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>

          {/* Date */}
          <Field label="Date" required>
            <input type="date" className={`${inputCls} text-gray-700`} value={form.date} onChange={(e) => set("date", e.target.value)} />
            {errors.date && <p className="text-[11px] text-red-500 mt-0.5">{errors.date}</p>}
          </Field>

          {/* Start Time */}
          <Field label="Start Time" required>
            <input type="time" className={`${inputCls} text-gray-700`} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            {errors.startTime && <p className="text-[11px] text-red-500 mt-0.5">{errors.startTime}</p>}
          </Field>

          {/* Duration */}
          <Field label="Duration (minutes)" required>
            <input
              type="number" min="1" className={inputCls}
              placeholder="e.g. 90"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
            />
            {errors.duration && <p className="text-[11px] text-red-500 mt-0.5">{errors.duration}</p>}
          </Field>

          {/* Total Marks */}
          <Field label="Total Marks" required>
            <input
              type="number" min="1" className={inputCls}
              placeholder="e.g. 100"
              value={form.totalMarks}
              onChange={(e) => set("totalMarks", e.target.value)}
            />
            {errors.totalMarks && <p className="text-[11px] text-red-500 mt-0.5">{errors.totalMarks}</p>}
          </Field>

          {/* Passing Marks */}
          <Field label="Passing Marks">
            <input
              type="number" min="1" className={inputCls}
              placeholder="e.g. 40"
              value={form.passingMarks}
              onChange={(e) => set("passingMarks", e.target.value)}
            />
          </Field>

          {/* Venue */}
          <Field label="Venue">
            <input
              className={inputCls}
              placeholder="e.g. Hall A, Room 5"
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
            />
          </Field>

          {/* Remarks */}
          <div className="sm:col-span-2">
            <Field label="Remarks">
              <textarea
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Any additional notes..."
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </Field>
          </div>

        </div>

        {/* Error from server */}
        {(createMutation.isError || updateMutation.isError) && (
          <p className="text-[12px] text-red-500 mt-3">
            Something went wrong. Please try again.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : editTarget ? "Update Exam" : "Schedule Exam"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Exam">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Are you sure?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              This exam and all associated marks will be permanently deleted.
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
      {/* ── View Modal ───────────────────────────────────────────────────── */}
<Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Exam Details" size="lg">
  {viewTarget && (
    <div className="space-y-4">

      {/* Title + Status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-gray-800">{viewTarget.title}</p>
          {viewTarget.venue && <p className="text-[12px] text-gray-400 mt-0.5">{viewTarget.venue}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Chip label={TYPE_LABEL[viewTarget.examType]} colorCls={TYPE_COLOR[viewTarget.examType]} />
          <Chip label={STATUS_LABEL[viewTarget.status]} colorCls={STATUS_COLOR[viewTarget.status]} />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Detail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Class</p>
          <p className="text-[13px] font-medium text-gray-700">{viewTarget.class?.name || "—"}</p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Subject</p>
          <p className="text-[13px] font-medium text-gray-700">{viewTarget.subject?.name || "—"}</p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Date</p>
          <p className="text-[13px] font-medium text-gray-700">
            {new Date(viewTarget.date).toLocaleDateString("en-PK", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Start Time</p>
          <p className="text-[13px] font-medium text-gray-700">{viewTarget.startTime}</p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Duration</p>
          <p className="text-[13px] font-medium text-gray-700">{viewTarget.duration} minutes</p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Total Marks</p>
          <p className="text-[13px] font-medium text-gray-700">{viewTarget.totalMarks}</p>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Passing Marks</p>
          <p className="text-[13px] font-medium text-gray-700">{viewTarget.passingMarks}</p>
        </div>

      </div>

      {/* Remarks */}
      {viewTarget.remarks && (
        <>
          <hr className="border-gray-100" />
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Remarks</p>
            <p className="text-[13px] text-gray-600 leading-relaxed">{viewTarget.remarks}</p>
          </div>
        </>
      )}

      {/* Close */}
      <div className="pt-2">
        <Button variant="secondary" className="w-full" onClick={() => setViewTarget(null)}>
          Close
        </Button>
      </div>

    </div>
  )}
</Modal>

    </div>
  );
}