"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appraisalsApi, teachersApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Star, TrendingUp, Users, Award,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADE_COLOR = {
  "Excellent":          "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "Good":               "bg-indigo-50 text-indigo-600 border border-indigo-100",
  "Average":            "bg-amber-50 text-amber-700 border border-amber-100",
  "Needs Improvement":  "bg-red-50 text-red-600 border border-red-100",
};

const CATEGORIES = [
  { key: "punctuality",      label: "Punctuality" },
  { key: "teachingQuality",  label: "Teaching Quality" },
  { key: "studentResults",   label: "Student Results" },
  { key: "discipline",       label: "Discipline" },
  { key: "communication",    label: "Communication" },
];

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

const COLUMNS = ["Teacher", "Review Date", "Reviewed By", "Scores", "Overall", "Grade", "Actions"];

// ─── Score slider ─────────────────────────────────────────────────────────────
function ScoreSlider({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={labelCls}>{label}</label>
        <span className="text-[13px] font-semibold text-indigo-600 w-8 text-right">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 rounded-full accent-indigo-600 cursor-pointer"
        />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={11}
              className={value >= s ? "text-amber-400 fill-amber-400" : "text-gray-200"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ label, value }) {
  const color =
    value >= 4.5 ? "bg-emerald-50 text-emerald-700"
    : value >= 3.5 ? "bg-indigo-50 text-indigo-600"
    : value >= 2.5 ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-600";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>
      {label} {value}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AppraisalsPage() {
  const queryClient = useQueryClient();

  const [filterTeacher, setFilterTeacher] = useState("");
  const [page, setPage]                   = useState(1);
  const LIMIT = 20;

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal, setAddModal]     = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [viewAppraisal, setView]    = useState(null);

  // ── Add form ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    teacherId:      "",
    reviewDate:     new Date().toISOString().split("T")[0],
    reviewedBy:     "Admin",
    punctuality:    3,
    teachingQuality:3,
    studentResults: 3,
    discipline:     3,
    communication:  3,
    remarks:        "",
  });
  const [formError, setFormError] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: appraisalsData, isLoading } = useQuery({
    queryKey: ["appraisals", filterTeacher, page],
    queryFn: () => appraisalsApi.getAll(filterTeacher ? { teacherId: filterTeacher } : {}),
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers-all"],
    queryFn: () => teachersApi.getAll({ limit: 200 }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: appraisalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appraisals"] });
      setAddModal(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: appraisalsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appraisals"] });
      setDeleteId(null);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      teacherId: "", reviewDate: new Date().toISOString().split("T")[0],
      reviewedBy: "Admin",
      punctuality: 3, teachingQuality: 3, studentResults: 3,
      discipline: 3, communication: 3, remarks: "",
    });
    setFormError("");
  };

  const setScore = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const liveOverall = parseFloat(
    ((form.punctuality + form.teachingQuality + form.studentResults +
      form.discipline + form.communication) / 5).toFixed(2)
  );

  const liveGrade =
    liveOverall >= 4.5 ? "Excellent"
    : liveOverall >= 3.5 ? "Good"
    : liveOverall >= 2.5 ? "Average"
    : "Needs Improvement";

  const handleSubmit = () => {
    if (!form.teacherId)       { setFormError("Please select a teacher."); return; }
    if (!form.reviewDate)      { setFormError("Please enter a review date."); return; }
    if (!form.reviewedBy.trim()){ setFormError("Reviewed by is required."); return; }
    setFormError("");
    createMutation.mutate(form);
  };

  // Pagination (client-side slice since we fetch all for a teacher)
  const allAppraisals = appraisalsData || [];
  const total         = allAppraisals.length;
  const totalPages    = Math.ceil(total / LIMIT);
  const paginated     = allAppraisals.slice((page - 1) * LIMIT, page * LIMIT);

  // Stats
  const excellent = allAppraisals.filter((a) => a.grade === "Excellent").length;
  const avgScore  = allAppraisals.length
    ? (allAppraisals.reduce((s, a) => s + a.overallScore, 0) / allAppraisals.length).toFixed(2)
    : "—";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Appraisals" description="Teacher performance reviews and evaluations">
        <Button icon={Plus} onClick={() => { resetForm(); setAddModal(true); }}>
          New Appraisal
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Total Reviews</p>
              <p className="text-[18px] font-bold text-gray-800">{total}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Award size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Excellent</p>
              <p className="text-[18px] font-bold text-gray-800">{excellent}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Avg Score</p>
              <p className="text-[18px] font-bold text-gray-800">{avgScore}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users size={16} className="text-purple-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Teachers Reviewed</p>
              <p className="text-[18px] font-bold text-gray-800">
                {new Set(allAppraisals.map((a) => a.teacherId)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Filter by Teacher</label>
          <select
            value={filterTeacher}
            onChange={(e) => { setFilterTeacher(e.target.value); setPage(1); }}
            className={selectCls + " min-w-[220px]"}
          >
            <option value="">All Teachers</option>
            {teachersData?.teachers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName} ({t.employeeId})
              </option>
            ))}
          </select>
        </div>
        {filterTeacher && (
          <button
            onClick={() => setFilterTeacher("")}
            className="text-[12px] text-gray-400 hover:text-gray-600 mt-4"
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
          emptyIcon={Star}
          emptyText="No appraisals yet"
          emptySubtext="Click 'New Appraisal' to add the first review"
        >
          {paginated.map((appraisal) => (
            <Tr key={appraisal.id}>
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[10px] font-semibold">
                      {appraisal.teacher?.firstName?.[0]}{appraisal.teacher?.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">
                      {appraisal.teacher?.firstName} {appraisal.teacher?.lastName}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">{appraisal.teacher?.employeeId}</p>
                  </div>
                </div>
              </Td>
              <Td>
                {new Date(appraisal.reviewDate).toLocaleDateString("en-PK", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </Td>
              <Td>{appraisal.reviewedBy}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <ScorePill label="P"  value={appraisal.punctuality} />
                  <ScorePill label="TQ" value={appraisal.teachingQuality} />
                  <ScorePill label="SR" value={appraisal.studentResults} />
                  <ScorePill label="D"  value={appraisal.discipline} />
                  <ScorePill label="C"  value={appraisal.communication} />
                </div>
              </Td>
              <Td>
                <span className="text-[14px] font-bold text-gray-800">{appraisal.overallScore}</span>
                <span className="text-[11px] text-gray-400"> / 5</span>
              </Td>
              <Td>
                <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${GRADE_COLOR[appraisal.grade] || ""}`}>
                  {appraisal.grade}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setView(appraisal)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-[11px] font-medium"
                    title="View details"
                  >
                    <Star size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(appraisal.id)}
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
          label="appraisals"
          onPageChange={setPage}
        />
      </div>

      {/* ── Add Appraisal Modal ────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="New Appraisal" size="md">
        <div className="space-y-4">
          {/* Teacher + meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className={labelCls}>Teacher *</label>
              <select
                value={form.teacherId}
                onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
                className={selectCls}
              >
                <option value="">Select teacher</option>
                {teachersData?.teachers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} — {t.department}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Review Date *"
              type="date"
              value={form.reviewDate}
              onChange={(e) => setForm((p) => ({ ...p, reviewDate: e.target.value }))}
            />
            <Input
              label="Reviewed By *"
              placeholder="e.g. Principal"
              value={form.reviewedBy}
              onChange={(e) => setForm((p) => ({ ...p, reviewedBy: e.target.value }))}
            />
          </div>

          {/* Score sliders */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <p className="text-[12px] font-semibold text-gray-600 uppercase tracking-wider">Performance Scores (1–5)</p>
            {CATEGORIES.map((cat) => (
              <ScoreSlider
                key={cat.key}
                label={cat.label}
                value={form[cat.key]}
                onChange={(v) => setScore(cat.key, v)}
              />
            ))}
          </div>

          {/* Live overall preview */}
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-[11px] text-gray-400">Overall Score</p>
              <p className="text-[22px] font-bold text-gray-800">{liveOverall} <span className="text-[13px] font-normal text-gray-400">/ 5</span></p>
            </div>
            <span className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg ${GRADE_COLOR[liveGrade]}`}>
              {liveGrade}
            </span>
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Remarks (optional)</label>
            <textarea
              rows={2}
              placeholder="Any additional notes..."
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
            />
          </div>

          {formError && (
            <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
          <Button className="flex-1" disabled={createMutation.isPending} onClick={handleSubmit}>
            {createMutation.isPending ? "Saving..." : "Save Appraisal"}
          </Button>
        </div>
      </Modal>

      {/* ── View Appraisal Modal ───────────────────────────────────────────── */}
      <Modal open={!!viewAppraisal} onClose={() => setView(null)} title="Appraisal Details" size="md">
        {viewAppraisal && (
          <div className="space-y-4">
            {/* Teacher */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 text-[13px] font-bold">
                  {viewAppraisal.teacher?.firstName?.[0]}{viewAppraisal.teacher?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-800">
                  {viewAppraisal.teacher?.firstName} {viewAppraisal.teacher?.lastName}
                </p>
                <p className="text-[11px] text-gray-400">{viewAppraisal.teacher?.employeeId}</p>
              </div>
              <span className={`ml-auto text-[12px] font-semibold px-3 py-1.5 rounded-lg ${GRADE_COLOR[viewAppraisal.grade]}`}>
                {viewAppraisal.grade}
              </span>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-gray-400 text-[10px]">Review Date</p>
                <p className="font-medium text-gray-700">
                  {new Date(viewAppraisal.reviewDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-gray-400 text-[10px]">Reviewed By</p>
                <p className="font-medium text-gray-700">{viewAppraisal.reviewedBy}</p>
              </div>
            </div>

            {/* Scores */}
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const val = viewAppraisal[cat.key];
                const pct = (val / 5) * 100;
                return (
                  <div key={cat.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] text-gray-500">{cat.label}</span>
                      <span className="text-[12px] font-semibold text-gray-700">{val} / 5</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          val >= 4.5 ? "bg-emerald-400"
                          : val >= 3.5 ? "bg-indigo-400"
                          : val >= 2.5 ? "bg-amber-400"
                          : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-[12px] text-gray-500">Overall Score</span>
              <span className="text-[20px] font-bold text-gray-800">
                {viewAppraisal.overallScore}
                <span className="text-[13px] font-normal text-gray-400"> / 5</span>
              </span>
            </div>

            {/* Remarks */}
            {viewAppraisal.remarks && (
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-1">Remarks</p>
                <p className="text-[12px] text-gray-700">{viewAppraisal.remarks}</p>
              </div>
            )}
          </div>
        )}
        <div className="mt-5">
          <Button variant="secondary" className="w-full" onClick={() => setView(null)}>Close</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Appraisal">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this appraisal?</p>
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