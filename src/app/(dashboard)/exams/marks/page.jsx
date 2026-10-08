"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examsApi, examMarksApi, classesApi, subjectsApi, gradeConfigApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard   from "../../../../components/ui/StatCard";
import Button     from "../../../../components/ui/Button";
import {
  Search, ClipboardList, Users, CheckCircle2,
  XCircle, AlertCircle, Save, ChevronDown, Filter,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_TYPES = ["MIDTERM", "FINAL", "UNIT_TEST", "QUIZ", "PRACTICAL", "MOCK"];
const EXAM_STATUSES = ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"];

const TYPE_LABEL = {
  MIDTERM: "Midterm", FINAL: "Final", UNIT_TEST: "Unit Test",
  QUIZ: "Quiz", PRACTICAL: "Practical", MOCK: "Mock",
};

const STATUS_COLOR = {
  SCHEDULED: "bg-amber-50 text-amber-600",
  ONGOING:   "bg-blue-50 text-blue-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-500",
};

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GRADE_CLS = {
  "A+": "text-emerald-600",
  "A":  "text-emerald-500",
  "B":  "text-blue-500",
  "C":  "text-indigo-500",
  "D":  "text-amber-500",
  "F":  "text-red-500",
};

function getGrade(marks, total, passing, configs = []) {
  if (marks === null || marks === "") return null;
  const pct = (marks / total) * 100;

  // always fail if below passing marks regardless of grade config
  if (parseFloat(marks) < passing) return { label: "Fail", cls: "text-red-500" };

  if (configs.length > 0) {
    const match = configs.find((c) => pct >= c.minPercent && pct <= c.maxPercent);
    if (match) return { label: match.grade, cls: GRADE_CLS[match.grade] || "text-gray-600" };
  }

  // fallback if no config loaded yet
  if (pct >= 90) return { label: "A+", cls: "text-emerald-600" };
  if (pct >= 80) return { label: "A",  cls: "text-emerald-500" };
  if (pct >= 70) return { label: "B",  cls: "text-blue-500" };
  if (pct >= 60) return { label: "C",  cls: "text-indigo-500" };
  if (pct >= 50) return { label: "D",  cls: "text-amber-500" };
  return               { label: "Fail",cls: "text-red-500" };
}

function Chip({ label, colorCls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorCls}`}>
      {label}
    </span>
  );
}

// ─── Step 1: Exam Selector Panel ──────────────────────────────────────────────

function ExamSelector({ onSelect }) {
  const [search,    setSearch]    = useState("");
  const [classId,   setClassId]   = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examType,  setExamType]  = useState("");
  const [status,    setStatus]    = useState("");
  const [page,      setPage]      = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["exams-picker", search, classId, subjectId, examType, status, page],
    queryFn:  () => examsApi.getAll({ search, classId, subjectId, examType, status, page, limit: 20 }),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-picker", classId],
    queryFn:  () => subjectsApi.getAll({ classId }),
    enabled:  !!classId,
  });

  const exams    = data?.exams    || [];
  const classes  = classesData?.classes || classesData || [];
  const subjects = subjectsData?.subjects || subjectsData || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marks Entry"
        description="Select an exam to enter or update student marks"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text" placeholder="Search exam..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setPage(1); }} className={selectCls}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }} disabled={!classId} className={selectCls}>
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={examType} onChange={(e) => { setExamType(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Types</option>
          {EXAM_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Status</option>
          {EXAM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Exam Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 gap-3">
          <ClipboardList size={32} className="text-gray-200" />
          <p className="text-[13px] text-gray-400">No exams found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => onSelect(exam)}
              className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[13px] font-semibold text-gray-800 leading-tight group-hover:text-indigo-700 transition-colors">
                  {exam.title}
                </p>
                <Chip
                  label={exam.status}
                  colorCls={STATUS_COLOR[exam.status] || "bg-gray-100 text-gray-500"}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-gray-500">
                  <span className="text-gray-400">Class:</span> {exam.class?.name} &nbsp;·&nbsp;
                  <span className="text-gray-400">Subject:</span> {exam.subject?.name}
                </p>
                <p className="text-[12px] text-gray-500">
                  <span className="text-gray-400">Date:</span>{" "}
                  {new Date(exam.date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                  &nbsp;·&nbsp;
                  <span className="text-gray-400">Marks:</span> {exam.totalMarks}
                </p>
                <p className="text-[12px] text-gray-400">{TYPE_LABEL[exam.examType]}</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[12px] font-medium">Enter Marks</span>
                <ChevronDown size={12} className="-rotate-90" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-gray-400 pt-1">
          <span>{data.total} exams total</span>
          <div className="flex gap-1">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-[12px] transition-colors ${
                  p === page
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Marks Entry Table ─────────────────────────────────────────────────

function MarksEntryTable({ exam: selectedExam, onBack }) {
  const queryClient = useQueryClient();
  const [localMarks, setLocalMarks] = useState({}); // { studentId: { marksObtained, isAbsent, remarks } }
  const [saved, setSaved] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["exam-marks", selectedExam.id],
    queryFn:  () => examMarksApi.get(selectedExam.id),
  });

  const { data: gradeConfigs = [] } = useQuery({
    queryKey: ["grade-config"],
    queryFn:  gradeConfigApi.getAll,
    staleTime: 1000 * 60 * 5, // cache 5 mins, grade config rarely changes
  });

  // Initialise local state from fetched data
  useEffect(() => {
    if (!data) return;
    const init = {};
    data.students.forEach((s) => {
      init[s.id] = {
        marksObtained: s.marksObtained ?? "",
        isAbsent:      s.isAbsent,
        remarks:       s.remarks || "",
      };
    });
    setLocalMarks(init);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: examMarksApi.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-marks", selectedExam.id] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function setMark(studentId, field, value) {
    setLocalMarks((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  function handleSave() {
    const marks = Object.entries(localMarks).map(([studentId, m]) => ({
      studentId:     parseInt(studentId),
      marksObtained: m.isAbsent ? null : (m.marksObtained === "" ? null : parseFloat(m.marksObtained)),
      isAbsent:      m.isAbsent,
      remarks:       m.remarks || null,
    }));
    saveMutation.mutate({ examId: selectedExam.id, marks });
  }

  const exam     = data?.exam || selectedExam;
  const students = data?.students || [];

  // Section filter
  const sections = [...new Set(students.map((s) => s.section).filter(Boolean))].sort();
  const filtered = sectionFilter
    ? students.filter((s) => s.section === sectionFilter)
    : students;

  // Stats derived from local state
  const entered  = Object.values(localMarks).filter((m) => !m.isAbsent && m.marksObtained !== "").length;
  const absent   = Object.values(localMarks).filter((m) => m.isAbsent).length;
  const passed   = Object.values(localMarks).filter(
    (m) => !m.isAbsent && m.marksObtained !== "" && parseFloat(m.marksObtained) >= exam.passingMarks
  ).length;
  const failed   = entered - passed;

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader
        title="Marks Entry"
        description={`${exam.title} — ${exam.class?.name} · ${exam.subject?.name}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack}>← Back</Button>
          <Button
            icon={Save}
            onClick={handleSave}
            disabled={saveMutation.isPending || students.length === 0}
          >
            {saveMutation.isPending ? "Saving..." : "Save Marks"}
          </Button>
        </div>
      </PageHeader>

      {/* Success toast */}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={15} /> Marks saved successfully!
        </div>
      )}

      {/* Error toast */}
      {saveMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2">
          <XCircle size={15} /> Failed to save. Please try again.
        </div>
      )}

      {/* Exam Info */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap gap-5">
        {[
          { label: "Total Marks",   value: exam.totalMarks },
          { label: "Passing Marks", value: exam.passingMarks },
          { label: "Type",          value: TYPE_LABEL[exam.examType] },
          { label: "Date",          value: new Date(exam.date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) },
          { label: "Status",        value: <Chip label={exam.status} colorCls={STATUS_COLOR[exam.status] || ""} /> },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
            <p className="text-[13px] font-medium text-gray-700">{value}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={students.length}  icon={Users}         color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Marks Entered"  value={entered}          icon={ClipboardList}  color="bg-blue-50 text-blue-600" />
        <StatCard label="Passed"         value={passed}           icon={CheckCircle2}   color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Absent"         value={absent}           icon={XCircle}        color="bg-red-50 text-red-500" />
      </div>

      {/* Section filter + table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

        {/* Table toolbar */}
        {sections.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-3">
            <Filter size={13} className="text-gray-300" />
            <span className="text-[12px] text-gray-400">Section:</span>
            <button
              onClick={() => setSectionFilter("")}
              className={`text-[12px] px-2.5 py-1 rounded-md transition-colors ${
                !sectionFilter ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => setSectionFilter(sec)}
                className={`text-[12px] px-2.5 py-1 rounded-md transition-colors ${
                  sectionFilter === sec ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Users size={28} className="text-gray-200" />
            <p className="text-[13px] text-gray-400">No students found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {["#", "Roll No", "Student Name", "Section", `Marks / ${exam.totalMarks}`, "Grade", "Absent", "Remarks"].map((col) => (
                  <th key={col} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:pl-5 last:pr-5">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, idx) => {
                const m     = localMarks[student.id] || { marksObtained: "", isAbsent: false, remarks: "" };
                const grade = !m.isAbsent ? getGrade(m.marksObtained, exam.totalMarks, exam.passingMarks, gradeConfigs) : null;

                return (
                  <tr
                    key={student.id}
                    className={`border-b border-gray-50 last:border-0 transition-colors ${
                      m.isAbsent ? "bg-red-50/30" : "hover:bg-gray-50/50"
                    }`}
                  >
                    {/* # */}
                    <td className="pl-5 py-2.5 text-[12px] text-gray-400">{idx + 1}</td>

                    {/* Roll No */}
                    <td className="px-4 py-2.5">
                      <span className="text-[12px] font-mono text-gray-500">{student.rollNumber || "—"}</span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-medium text-gray-800">
                        {student.firstName} {student.lastName || ""}
                      </p>
                      <p className="text-[11px] text-gray-400">{student.studentId}</p>
                    </td>

                    {/* Section */}
                    <td className="px-4 py-2.5">
                      <span className="text-[12px] text-gray-500">{student.section || "—"}</span>
                    </td>

                    {/* Marks Input */}
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        max={exam.totalMarks}
                        step="0.5"
                        disabled={m.isAbsent}
                        value={m.isAbsent ? "" : m.marksObtained}
                        onChange={(e) => setMark(student.id, "marksObtained", e.target.value)}
                        placeholder={m.isAbsent ? "Absent" : "0"}
                        className={`w-24 text-[13px] border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-colors ${
                          m.isAbsent
                            ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed"
                            : "border-gray-200"
                        } ${
                          !m.isAbsent && m.marksObtained !== "" && parseFloat(m.marksObtained) < exam.passingMarks
                            ? "border-red-200 bg-red-50/50"
                            : ""
                        }`}
                      />
                    </td>

                    {/* Grade */}
                    <td className="px-4 py-2.5">
                      {m.isAbsent ? (
                        <span className="text-[12px] text-red-400 font-medium">Absent</span>
                      ) : grade ? (
                        <span className={`text-[13px] font-bold ${grade.cls}`}>{grade.label}</span>
                      ) : (
                        <span className="text-[12px] text-gray-300">—</span>
                      )}
                    </td>

                    {/* Absent Toggle */}
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => {
                          setMark(student.id, "isAbsent", !m.isAbsent);
                          if (!m.isAbsent) setMark(student.id, "marksObtained", "");
                        }}
                        className={`w-9 h-5 rounded-full transition-all relative ${
                          m.isAbsent ? "bg-red-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                            m.isAbsent ? "left-4" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Remarks */}
                    <td className="px-4 pr-5 py-2.5">
                      <input
                        type="text"
                        placeholder="Optional note..."
                        value={m.remarks}
                        onChange={(e) => setMark(student.id, "remarks", e.target.value)}
                        className="w-full min-w-[140px] text-[12px] border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer save bar */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-400">
              {entered} of {students.length} marks entered &nbsp;·&nbsp;
              {absent} absent &nbsp;·&nbsp;
              <span className="text-emerald-600">{passed} passed</span>
              {failed > 0 && <> &nbsp;·&nbsp; <span className="text-red-500">{failed} failed</span></>}
            </p>
            <Button
              icon={Save}
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Marks"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarksEntryPage() {
  const [selectedExam, setSelectedExam] = useState(null);

  if (selectedExam) {
    return (
      <MarksEntryTable
        exam={selectedExam}
        onBack={() => setSelectedExam(null)}
      />
    );
  }

  return <ExamSelector onSelect={setSelectedExam} />;
}