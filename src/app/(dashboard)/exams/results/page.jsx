"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resultsApi, examsApi, classesApi, subjectsApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard   from "../../../../components/ui/StatCard";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import Modal      from "../../../../components/ui/Modal";
import Button     from "../../../../components/ui/Button";
import {
  Search, Trophy, Users, CheckCircle2,
  XCircle, AlertCircle, Clock, ChevronDown, Eye,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_COLOR = {
  "A+": "bg-emerald-50 text-emerald-700",
  "A":  "bg-emerald-50 text-emerald-600",
  "B":  "bg-blue-50 text-blue-600",
  "C":  "bg-indigo-50 text-indigo-600",
  "D":  "bg-amber-50 text-amber-600",
  "F":  "bg-red-50 text-red-500",
};

const STATUS_COLOR = {
  PASS:    "bg-emerald-50 text-emerald-600",
  FAIL:    "bg-red-50 text-red-500",
  ABSENT:  "bg-gray-100 text-gray-500",
  PENDING: "bg-amber-50 text-amber-500",
};

const EXAM_STATUS_COLOR = {
  SCHEDULED: "bg-amber-50 text-amber-600",
  ONGOING:   "bg-blue-50 text-blue-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-500",
};

const TYPE_LABEL = {
  MIDTERM: "Midterm", FINAL: "Final", UNIT_TEST: "Unit Test",
  QUIZ: "Quiz", PRACTICAL: "Practical", MOCK: "Mock",
};

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

function Chip({ label, colorCls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorCls}`}>
      {label}
    </span>
  );
}

// ─── Step 1: Exam Selector ────────────────────────────────────────────────────

function ExamSelector({ onSelect }) {
  const [search,   setSearch]   = useState("");
  const [classId,  setClassId]  = useState("");
  const [examType, setExamType] = useState("");
  const [status,   setStatus]   = useState("COMPLETED");
  const [page,     setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["exams-results-picker", search, classId, examType, status, page],
    queryFn:  () => examsApi.getAll({ search, classId, examType, status, page, limit: 12 }),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  const exams   = data?.exams   || [];
  const classes = classesData?.classes || classesData || [];

  return (
    <div className="space-y-5">
      <PageHeader title="Results" description="Select a completed exam to view results" />

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
        <select value={classId}  onChange={(e) => { setClassId(e.target.value);  setPage(1); }} className={selectCls}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={examType} onChange={(e) => { setExamType(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Types</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status}   onChange={(e) => { setStatus(e.target.value);   setPage(1); }} className={selectCls}>
          <option value="">All Status</option>
          {["SCHEDULED","ONGOING","COMPLETED","CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-36" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 gap-3">
          <Trophy size={32} className="text-gray-200" />
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
                  colorCls={EXAM_STATUS_COLOR[exam.status] || "bg-gray-100 text-gray-500"}
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
                  <span className="text-gray-400">Total:</span> {exam.totalMarks} marks
                </p>
                <p className="text-[12px] text-gray-400">{TYPE_LABEL[exam.examType]}</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[12px] font-medium">View Results</span>
                <ChevronDown size={12} className="-rotate-90" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-gray-400 pt-1">
          <span>{data.total} exams</span>
          <div className="flex gap-1">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-[12px] transition-colors ${
                  p === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-500"
                }`}
              >{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Results Table ────────────────────────────────────────────────────

function ResultsTable({ exam: selectedExam, onBack }) {
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [page,        setPage]        = useState(1);
  const [viewStudent, setViewStudent] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["results", selectedExam.id, search, statusFilter, page],
    queryFn:  () => resultsApi.get({
      examId: selectedExam.id, search, status: statusFilter, page, limit: 30,
    }),
  });

  const results = data?.results  || [];
  const summary = data?.summary  || {};
  const exam    = data?.exam     || selectedExam;

  const COLUMNS = ["#", "Roll No", "Student", "Section", "Marks", "Percentage", "Grade", "Status", "Actions"];

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader
        title="Results"
        description={`${exam.title} — ${exam.class?.name} · ${exam.subject?.name}`}
      >
        <Button variant="secondary" onClick={onBack}>← Back</Button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={summary.total    ?? 0} icon={Users}        color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Passed"         value={summary.passed   ?? 0} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Failed"         value={summary.failed   ?? 0} icon={XCircle}      color="bg-red-50 text-red-500" />
        <StatCard label="Absent"         value={summary.absent   ?? 0} icon={AlertCircle}  color="bg-gray-100 text-gray-500" />
      </div>

      {/* Exam info + pass rate bar */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 space-y-3">
        <div className="flex flex-wrap gap-5">
          {[
            { label: "Total Marks",   value: exam.totalMarks },
            { label: "Passing Marks", value: exam.passingMarks },
            { label: "Average",       value: summary.average ? `${summary.average}` : "—" },
            { label: "Highest",       value: summary.highest ?? "—" },
            { label: "Lowest",        value: summary.lowest  ?? "—" },
            { label: "Pass Rate",     value: summary.passRate ? `${summary.passRate}%` : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
              <p className="text-[13px] font-semibold text-gray-700">{value}</p>
            </div>
          ))}
        </div>

        {/* Pass rate visual bar */}
        {summary.passRate && (
          <div>
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>Pass Rate</span>
              <span>{summary.passRate}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${summary.passRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text" placeholder="Search student name or roll no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        {["", "PASS", "FAIL", "ABSENT", "PENDING"].map((s) => (
          <button key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
              statusFilter === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && results.length === 0}
          emptyIcon={Trophy}
          emptyText="No results found"
          emptySubtext="Marks have not been entered yet"
        >
          {results.map((r, idx) => (
            <Tr key={r.studentId}>
              <Td first>
                <span className="text-[12px] text-gray-400">
                  {(page - 1) * 30 + idx + 1}
                </span>
              </Td>
              <Td>
                <span className="text-[12px] font-mono text-gray-500">{r.rollNumber || "—"}</span>
              </Td>
              <Td>
                <p className="text-[13px] font-medium text-gray-800">
                  {r.firstName} {r.lastName || ""}
                </p>
                <p className="text-[11px] text-gray-400">{r.studentCode}</p>
              </Td>
              <Td>
                <span className="text-[12px] text-gray-500">{r.section || "—"}</span>
              </Td>
              <Td>
                {r.isAbsent ? (
                  <span className="text-[12px] text-gray-400">—</span>
                ) : r.marksObtained !== null ? (
                  <span className="text-[13px] font-medium text-gray-700">
                    {r.marksObtained}
                    <span className="text-[11px] text-gray-400"> / {r.totalMarks}</span>
                  </span>
                ) : (
                  <span className="text-[12px] text-gray-300">Pending</span>
                )}
              </Td>
              <Td>
                {r.percentage ? (
                  <span className="text-[13px] text-gray-600">{r.percentage}%</span>
                ) : (
                  <span className="text-[12px] text-gray-300">—</span>
                )}
              </Td>
              <Td>
                {r.grade ? (
                  <Chip label={r.grade} colorCls={GRADE_COLOR[r.grade] || "bg-gray-100 text-gray-500"} />
                ) : (
                  <span className="text-[12px] text-gray-300">—</span>
                )}
              </Td>
              <Td>
                <Chip
                  label={r.status}
                  colorCls={STATUS_COLOR[r.status] || "bg-gray-100 text-gray-500"}
                />
              </Td>
              <Td>
                <button
                  onClick={() => setViewStudent(r)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="View Detail"
                >
                  <Eye size={14} />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>

        <TableFooter
          page={page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="results"
          onPageChange={setPage}
        />
      </div>

      {/* Student Detail Modal */}
      <Modal open={!!viewStudent} onClose={() => setViewStudent(null)} title="Student Result Detail">
        {viewStudent && (
          <div className="space-y-4">
            {/* Student info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-indigo-600 text-[13px] font-bold">
                  {viewStudent.firstName?.[0]}{viewStudent.lastName?.[0] || ""}
                </span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">
                  {viewStudent.firstName} {viewStudent.lastName || ""}
                </p>
                <p className="text-[11px] text-gray-400">
                  {viewStudent.studentCode} &nbsp;·&nbsp; Roll: {viewStudent.rollNumber || "—"}
                  {viewStudent.section && <> &nbsp;·&nbsp; Section: {viewStudent.section}</>}
                </p>
              </div>
              <div className="ml-auto">
                <Chip
                  label={viewStudent.status}
                  colorCls={STATUS_COLOR[viewStudent.status] || "bg-gray-100 text-gray-500"}
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Result grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Marks Obtained</p>
                <p className="text-[15px] font-bold text-gray-800">
                  {viewStudent.isAbsent ? "—" : (viewStudent.marksObtained ?? "Pending")}
                  {!viewStudent.isAbsent && viewStudent.marksObtained !== null && (
                    <span className="text-[12px] font-normal text-gray-400"> / {viewStudent.totalMarks}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Percentage</p>
                <p className="text-[15px] font-bold text-gray-800">
                  {viewStudent.percentage ? `${viewStudent.percentage}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Grade</p>
                <p className="text-[15px] font-bold text-gray-800">
                  {viewStudent.grade || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Passing Marks</p>
                <p className="text-[13px] font-medium text-gray-700">{viewStudent.passingMarks}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Exam</p>
                <p className="text-[13px] font-medium text-gray-700">{exam.title}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Subject</p>
                <p className="text-[13px] font-medium text-gray-700">{exam.subject?.name}</p>
              </div>
            </div>

            {viewStudent.remarks && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">Remarks</p>
                  <p className="text-[13px] text-gray-600">{viewStudent.remarks}</p>
                </div>
              </>
            )}

            <div className="pt-1">
              <Button variant="secondary" className="w-full" onClick={() => setViewStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [selectedExam, setSelectedExam] = useState(null);

  if (selectedExam) {
    return <ResultsTable exam={selectedExam} onBack={() => setSelectedExam(null)} />;
  }

  return <ExamSelector onSelect={setSelectedExam} />;
}