"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportCardsApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard   from "../../../../components/ui/StatCard";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import Modal      from "../../../../components/ui/Modal";
import Button     from "../../../../components/ui/Button";
import {
  Search, Award, Users, TrendingUp,
  Star, Eye, Printer, ChevronDown, BookOpen,
  CheckCircle2, XCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_TYPES = ["MIDTERM", "FINAL", "UNIT_TEST", "QUIZ", "PRACTICAL", "MOCK"];
const TYPE_LABEL = {
  MIDTERM: "Midterm", FINAL: "Final", UNIT_TEST: "Unit Test",
  QUIZ: "Quiz", PRACTICAL: "Practical", MOCK: "Mock",
};

const GRADE_COLOR = {
  "A+": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "A":  "bg-emerald-50 text-emerald-600 border-emerald-200",
  "B":  "bg-blue-50 text-blue-600 border-blue-200",
  "C":  "bg-indigo-50 text-indigo-600 border-indigo-200",
  "D":  "bg-amber-50 text-amber-600 border-amber-200",
  "F":  "bg-red-50 text-red-500 border-red-200",
  "AB": "bg-gray-100 text-gray-400 border-gray-200",
  "—":  "bg-gray-50 text-gray-300 border-gray-100",
};

const GRADE_BG_PRINT = {
  "A+": "#d1fae5", "A": "#d1fae5", "B": "#dbeafe",
  "C":  "#e0e7ff", "D": "#fef3c7", "F": "#fee2e2",
  "AB": "#f3f4f6", "—": "#f9fafb",
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

// ─── Step 1: Class Selector ───────────────────────────────────────────────────

function ClassSelector({ onSelect }) {
  const [examType, setExamType] = useState("");

  const { data: classesData, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  const classes = classesData?.classes || classesData || [];

  return (
    <div className="space-y-5">
      <PageHeader title="Report Cards" description="Select a class to generate report cards" />

      {/* Exam type filter */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-[12px] text-gray-400 font-medium">Filter by exam type:</span>
        {["", ...EXAM_TYPES].map((t) => (
          <button key={t}
            onClick={() => setExamType(t)}
            className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
              examType === t
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t ? TYPE_LABEL[t] : "All Types"}
          </button>
        ))}
      </div>

      {/* Class cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen size={32} className="text-gray-200" />
          <p className="text-[13px] text-gray-400">No classes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => onSelect({ cls, examType })}
              className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                <BookOpen size={18} className="text-indigo-500" />
              </div>
              <p className="text-[14px] font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                {cls.name}
              </p>
              {examType && (
                <p className="text-[11px] text-gray-400 mt-0.5">{TYPE_LABEL[examType]} exams</p>
              )}
              <div className="mt-3 flex items-center gap-1 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[12px] font-medium">Generate Cards</span>
                <ChevronDown size={11} className="-rotate-90" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Print-ready Report Card ───────────────────────────────────────────────────

function PrintCard({ student, exams, className, generatedOn }) {
  const passColor  = student.overallPassed ? "#059669" : "#ef4444";
  const passBg     = student.overallPassed ? "#d1fae5" : "#fee2e2";
  const passLabel  = student.overallPassed ? "PASS" : "FAIL";

  return (
    <div
      id={`print-card-${student.studentId}`}
      style={{
        fontFamily:      "'Georgia', serif",
        width:           "100%",
        maxWidth:        "720px",
        margin:          "0 auto",
        border:          "2px solid #1e293b",
        borderRadius:    "12px",
        overflow:        "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header */}
      <div style={{ background: "#1e293b", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700", margin: 0 }}>Al-Noor School</p>
          <p style={{ color: "#94a3b8", fontSize: "11px", margin: "2px 0 0" }}>Academic Report Card</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "#94a3b8", fontSize: "10px", margin: 0 }}>Generated: {generatedOn}</p>
          <p style={{ color: "#64748b", fontSize: "10px", margin: "2px 0 0" }}>Class: {className}</p>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ padding: "16px 28px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
        <div>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
            {student.firstName} {student.lastName || ""}
          </p>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0" }}>
            ID: {student.studentCode} &nbsp;|&nbsp; Roll No: {student.rollNumber || "—"}
            {student.section && <> &nbsp;|&nbsp; Section: {student.section}</>}
          </p>
        </div>
        <div style={{ textAlign: "center", background: passBg, border: `1.5px solid ${passColor}`, borderRadius: "8px", padding: "6px 16px" }}>
          <p style={{ fontSize: "14px", fontWeight: "700", color: passColor, margin: 0 }}>{passLabel}</p>
          <p style={{ fontSize: "10px", color: passColor, margin: "1px 0 0", opacity: 0.8 }}>Overall</p>
        </div>
      </div>

      {/* Marks Table */}
      <div style={{ padding: "16px 28px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#1e293b" }}>
              {["Subject / Exam", "Total", "Obtained", "%", "Grade", "Status"].map((h) => (
                <th key={h} style={{ color: "#e2e8f0", fontWeight: "600", padding: "8px 10px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {student.examResults.map((r, i) => (
              <tr key={r.examId} style={{ background: i % 2 === 0 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", color: "#1e293b", fontWeight: "500" }}>
                  {r.subjectName}
                  <span style={{ color: "#94a3b8", fontSize: "10px", marginLeft: "6px" }}>({TYPE_LABEL[r.examType] || r.examType})</span>
                </td>
                <td style={{ padding: "8px 10px", color: "#475569" }}>{r.totalMarks}</td>
                <td style={{ padding: "8px 10px", color: "#0f172a", fontWeight: "600" }}>
                  {r.isAbsent ? "—" : (r.obtained ?? "—")}
                </td>
                <td style={{ padding: "8px 10px", color: "#475569" }}>
                  {r.percentage !== null ? `${r.percentage}%` : "—"}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ background: GRADE_BG_PRINT[r.grade] || "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontWeight: "700", color: "#1e293b", fontSize: "11px" }}>
                    {r.grade}
                  </span>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  {r.isAbsent ? (
                    <span style={{ color: "#94a3b8" }}>Absent</span>
                  ) : r.obtained === null ? (
                    <span style={{ color: "#d1d5db" }}>Pending</span>
                  ) : (
                    <span style={{ color: r.passed ? "#059669" : "#ef4444", fontWeight: "600" }}>
                      {r.passed ? "Pass" : "Fail"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div style={{ margin: "0 28px 20px", background: "#1e293b", borderRadius: "8px", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        {[
          { label: "Total Marks",    value: student.totalPossible },
          { label: "Marks Obtained", value: student.totalObtained },
          { label: "Percentage",     value: student.overallPct !== null ? `${student.overallPct}%` : "—" },
          { label: "Overall Grade",  value: student.overallGrade },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: "9px", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            <p style={{ color: "#ffffff", fontSize: "15px", fontWeight: "700", margin: "3px 0 0" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Signature Row */}
      <div style={{ padding: "10px 28px 20px", display: "flex", justifyContent: "space-between" }}>
        {["Class Teacher", "Principal", "Parent / Guardian"].map((role) => (
          <div key={role} style={{ textAlign: "center" }}>
            <div style={{ width: "120px", borderBottom: "1px solid #cbd5e1", marginBottom: "4px", height: "24px" }} />
            <p style={{ fontSize: "9px", color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Report Cards View ────────────────────────────────────────────────

function ReportCardsView({ selection, onBack }) {
  const { cls, examType } = selection;
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [viewStudent, setViewStudent] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["report-cards", cls.id, examType, search, page],
    queryFn:  () => reportCardsApi.get({ classId: cls.id, examType, search, page, limit: 30 }),
  });

  const students = data?.students || [];
  const summary  = data?.summary  || {};
  const exams    = data?.exams    || [];

  const generatedOn = new Date().toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  });

  function handlePrint(student) {
    const printWindow = window.open("", "_blank");
    const cardHtml    = document.getElementById(`print-card-${student.studentId}`)?.outerHTML;
    if (!cardHtml || !printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Report Card — ${student.firstName} ${student.lastName || ""}</title>
          <style>
            body { margin: 20px; background: #f1f5f9; display: flex; justify-content: center; }
            @media print {
              body { margin: 0; background: white; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${cardHtml}
          <script>window.onload = () => window.print();<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const COLUMNS = ["Roll No", "Student", "Section", "Exams", "Total", "Obtained", "%", "Grade", "Result", "Actions"];

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader
        title={`Report Cards — ${cls.name}`}
        description={`${examType ? TYPE_LABEL[examType] + " · " : ""}${exams.length} exam${exams.length !== 1 ? "s" : ""} · ${summary.total ?? 0} students`}
      >
        <Button variant="secondary" onClick={onBack}>← Back</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={summary.total   ?? 0} icon={Users}      color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Passed"         value={summary.passed  ?? 0} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Class Average"  value={summary.classAvg ? `${summary.classAvg}%` : "—"} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
        <StatCard label="Top Scorer"     value={summary.topScorer ? `${summary.topScorerPct}%` : "—"} icon={Star} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Exams included */}
      {exams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Included Exams:</span>
          {exams.map((e) => (
            <span key={e.id} className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">
              {e.subjectName} — {TYPE_LABEL[e.examType] || e.examType} ({e.totalMarks}m)
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
        <div className="relative max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text" placeholder="Search student..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && students.length === 0}
          emptyIcon={Award}
          emptyText="No report cards available"
          emptySubtext={exams.length === 0 ? "No completed exams found for this class" : "No students found"}
        >
          {students.map((s) => (
            <Tr key={s.studentId}>
              <Td first>
                <span className="text-[12px] font-mono text-gray-500">{s.rollNumber || "—"}</span>
              </Td>
              <Td>
                <p className="text-[13px] font-medium text-gray-800">{s.firstName} {s.lastName || ""}</p>
                <p className="text-[11px] text-gray-400">{s.studentCode}</p>
              </Td>
              <Td>
                <span className="text-[12px] text-gray-500">{s.section || "—"}</span>
              </Td>
              <Td>
                <span className="text-[12px] text-gray-600">{s.examResults.length}</span>
              </Td>
              <Td>
                <span className="text-[13px] text-gray-600">{s.totalPossible}</span>
              </Td>
              <Td>
                <span className="text-[13px] font-medium text-gray-700">{s.totalObtained}</span>
              </Td>
              <Td>
                <span className="text-[13px] text-gray-600">
                  {s.overallPct !== null ? `${s.overallPct}%` : "—"}
                </span>
              </Td>
              <Td>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${GRADE_COLOR[s.overallGrade] || "bg-gray-50 text-gray-400 border-gray-100"}`}>
                  {s.overallGrade}
                </span>
              </Td>
              <Td>
                {s.overallPct === null ? (
                  <Chip label="Pending" colorCls="bg-amber-50 text-amber-500" />
                ) : s.overallPassed ? (
                  <Chip label="PASS" colorCls="bg-emerald-50 text-emerald-600" />
                ) : (
                  <Chip label="FAIL" colorCls="bg-red-50 text-red-500" />
                )}
              </Td>
              <Td>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setViewStudent(s)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="View Report Card"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => { setViewStudent(s); setTimeout(() => handlePrint(s), 300); }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Print Report Card"
                  >
                    <Printer size={14} />
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
          label="students"
          onPageChange={setPage}
        />
      </div>

      {/* Hidden print cards (rendered off-screen for print capture) */}
      <div className="hidden">
        {students.map((s) => (
          <PrintCard
            key={s.studentId}
            student={s}
            exams={exams}
            className={cls.name}
            generatedOn={generatedOn}
          />
        ))}
      </div>

      {/* View Modal */}
      <Modal open={!!viewStudent} onClose={() => setViewStudent(null)} title="Report Card" size="lg">
        {viewStudent && (
          <div className="space-y-4">
            <PrintCard
              student={viewStudent}
              exams={exams}
              className={cls.name}
              generatedOn={generatedOn}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setViewStudent(null)}>
                Close
              </Button>
              <Button className="flex-1" icon={Printer} onClick={() => handlePrint(viewStudent)}>
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportCardsPage() {
  const [selection, setSelection] = useState(null);

  if (selection) {
    return <ReportCardsView selection={selection} onBack={() => setSelection(null)} />;
  }

  return <ClassSelector onSelect={setSelection} />;
}