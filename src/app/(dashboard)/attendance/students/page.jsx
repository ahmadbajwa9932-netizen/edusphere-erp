"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, studentAttendanceApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import StatCard from "../../../../components/ui/StatCard";
import {
  Users, UserCheck, UserX, Clock, FileCheck,
  ChevronDown, Save, CheckCircle, AlertCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  PRESENT: { label: "P", fullLabel: "Present", color: "bg-emerald-500 text-white", ring: "ring-emerald-400", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ABSENT:  { label: "A", fullLabel: "Absent",  color: "bg-red-500 text-white",     ring: "ring-red-400",     light: "bg-red-50 text-red-700 border-red-200"         },
  LATE:    { label: "L", fullLabel: "Late",    color: "bg-amber-500 text-white",   ring: "ring-amber-400",   light: "bg-amber-50 text-amber-700 border-amber-200"   },
  LEAVE:   { label: "LV", fullLabel: "Leave",  color: "bg-blue-500 text-white",    ring: "ring-blue-400",    light: "bg-blue-50 text-blue-700 border-blue-200"      },
};

const today = () => new Date().toISOString().split("T")[0];

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

// ─── API helpers ─────────────────────────────────────────────────────────────

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarkStudentAttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [classId, setClassId] = useState("");
  const [attendance, setAttendance] = useState({}); // { studentId: { status, remarks } }
  const [saved, setSaved] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["student-attendance", date, classId],
    queryFn: () => studentAttendanceApi.get({ date, classId }),
    enabled: !!classId && !!date,
  });

  // Sync fetched attendance into local state
  useEffect(() => {
    if (!data?.students) return;
    const map = {};
    data.students.forEach((s) => {
      map[s.id] = { status: s.status || "PRESENT", remarks: s.remarks || "" };
    });
    setAttendance(map);
    setSaved(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: studentAttendanceApi.save,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["student-attendance", date, classId] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const setStatus = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setSaved(false);
  };

  const setRemarks = (studentId, remarks) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleBulkMark = (status) => {
    if (!data?.students) return;
    const map = {};
    data.students.forEach((s) => {
      map[s.id] = { status, remarks: attendance[s.id]?.remarks || "" };
    });
    setAttendance(map);
    setBulkStatus("");
    setSaved(false);
  };

  const handleSave = () => {
    if (!data?.students) return;
    const records = data.students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id]?.status || "PRESENT",
      remarks: attendance[s.id]?.remarks || "",
    }));
    saveMutation.mutate({ date, records });
  };

  // Live summary from local state
  const summary = (() => {
    const students = data?.students || [];
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
    students.forEach((s) => {
      const st = attendance[s.id]?.status || "PRESENT";
      counts[st] = (counts[st] || 0) + 1;
    });
    return { total: students.length, ...counts };
  })();

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <PageHeader
        title="Mark Student Attendance"
        description="Record daily attendance for students by class"
      />

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] text-gray-400 font-medium">Date</label>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => { setDate(e.target.value); setSaved(false); }}
            className={selectCls}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] text-gray-400 font-medium">Class *</label>
          <select
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setSaved(false); }}
            className={selectCls}
          >
            <option value="">Select class</option>
            {classesData?.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {/* Bulk mark */}
        {classId && data?.students?.length > 0 && (
          <div className="flex flex-col gap-0.5 ml-auto">
            <label className="text-[11px] text-gray-400 font-medium">Mark All As</label>
            <div className="flex gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleBulkMark(key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-all ${cfg.light} hover:opacity-80`}
                >
                  All {cfg.fullLabel}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {classId && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={summary.total} icon={Users} color="bg-indigo-50 text-indigo-600" />
          <StatCard label="Present" value={summary.PRESENT} icon={UserCheck} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Absent" value={summary.ABSENT} icon={UserX} color="bg-red-50 text-red-500" />
          <StatCard label="Late" value={summary.LATE} icon={Clock} color="bg-amber-50 text-amber-600" />
          <StatCard label="On Leave" value={summary.LEAVE} icon={FileCheck} color="bg-blue-50 text-blue-600" />
        </div>
      )}

      {/* Attendance Table */}
      {!classId && (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
            <Users size={20} className="text-indigo-400" />
          </div>
          <p className="text-[13px] font-medium text-gray-500">Select a class to mark attendance</p>
          <p className="text-[12px] text-gray-300">Choose a class and date from the controls above</p>
        </div>
      )}

      {classId && (isLoading || isFetching) && (
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] text-gray-400">Loading students...</p>
          </div>
        </div>
      )}

      {classId && !isLoading && !isFetching && data?.students?.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-2">
          <Users size={24} className="text-gray-200" />
          <p className="text-[13px] text-gray-400">No active students found in this class</p>
        </div>
      )}

      {classId && !isLoading && data?.students?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_120px_280px_160px] gap-0 border-b border-gray-100">
            <div className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">#</div>
            <div className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Student</div>
            <div className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Roll / Sec</div>
            <div className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</div>
            <div className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Remarks</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {data.students.map((student, idx) => {
              const currentStatus = attendance[student.id]?.status || "PRESENT";
              const currentRemarks = attendance[student.id]?.remarks || "";
              return (
                <div
                  key={student.id}
                  className={`grid grid-cols-[40px_1fr_120px_280px_160px] gap-0 items-center transition-colors ${
                    currentStatus === "ABSENT" ? "bg-red-50/40" :
                    currentStatus === "LATE"   ? "bg-amber-50/40" :
                    currentStatus === "LEAVE"  ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Index */}
                  <div className="px-4 py-3 text-[12px] text-gray-300 font-medium">{idx + 1}</div>

                  {/* Student info */}
                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 text-[10px] font-semibold">
                        {student.firstName[0]}{student.lastName?.[0] || ""}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800 leading-tight">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">{student.studentId}</p>
                    </div>
                  </div>

                  {/* Roll / Section */}
                  <div className="px-4 py-3">
                    <p className="text-[13px] text-gray-600">{student.rollNumber || "—"}</p>
                    {student.section && (
                      <p className="text-[11px] text-gray-400">Sec {student.section}</p>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div className="px-4 py-3 flex items-center gap-1.5">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setStatus(student.id, key)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${
                          currentStatus === key
                            ? `${cfg.color} border-transparent ring-2 ${cfg.ring} ring-offset-1 scale-105`
                            : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        {cfg.fullLabel}
                      </button>
                    ))}
                  </div>

                  {/* Remarks */}
                  <div className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Optional remark..."
                      value={currentRemarks}
                      onChange={(e) => setRemarks(student.id, e.target.value)}
                      className="w-full text-[12px] border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-300 placeholder:text-gray-200 bg-transparent"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50/50">
            <p className="text-[12px] text-gray-400">
              {summary.total} students · {summary.PRESENT} present · {summary.ABSENT} absent
            </p>
            <div className="flex items-center gap-3">
              {saved && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle size={14} />
                  <span className="text-[12px] font-medium">Saved successfully</span>
                </div>
              )}
              {saveMutation.isError && (
                <div className="flex items-center gap-1.5 text-red-500">
                  <AlertCircle size={14} />
                  <span className="text-[12px]">Save failed. Try again.</span>
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                icon={Save}
              >
                {saveMutation.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}