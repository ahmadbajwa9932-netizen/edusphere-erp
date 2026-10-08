"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherAttendanceApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import StatCard from "../../../../components/ui/StatCard";
import {
  Users, UserCheck, UserX, Clock, FileCheck,
  Save, CheckCircle, AlertCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  PRESENT: { label: "Present", color: "bg-emerald-500 text-white", ring: "ring-emerald-400", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ABSENT:  { label: "Absent",  color: "bg-red-500 text-white",     ring: "ring-red-400",     light: "bg-red-50 text-red-700 border-red-200"             },
  LATE:    { label: "Late",    color: "bg-amber-500 text-white",   ring: "ring-amber-400",   light: "bg-amber-50 text-amber-700 border-amber-200"       },
  LEAVE:   { label: "Leave",   color: "bg-blue-500 text-white",    ring: "ring-blue-400",    light: "bg-blue-50 text-blue-700 border-blue-200"          },
};

const today = () => new Date().toISOString().split("T")[0];

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

const inputCls =
  "w-full text-[12px] border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-300 placeholder:text-gray-200 bg-transparent";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarkTeacherAttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [department, setDepartment] = useState("");
  const [attendance, setAttendance] = useState({}); // { teacherId: { status, checkIn, checkOut, remarks } }
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["teacher-attendance", date, department],
    queryFn: () => teacherAttendanceApi.get({ date, department }),
    enabled: !!date,
  });

  // Sync fetched data into local state
  useEffect(() => {
    if (!data?.teachers) return;
    const map = {};
    data.teachers.forEach((t) => {
      map[t.id] = {
        status: t.status || "PRESENT",
        checkIn: t.checkIn || "",
        checkOut: t.checkOut || "",
        remarks: t.remarks || "",
      };
    });
    setAttendance(map);
    setSaved(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: teacherAttendanceApi.save,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance", date, department] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const setField = (teacherId, field, value) => {
    setAttendance((prev) => ({
      ...prev,
      [teacherId]: { ...prev[teacherId], [field]: value },
    }));
    setSaved(false);
  };

  const handleBulkMark = (status) => {
    if (!data?.teachers) return;
    setAttendance((prev) => {
      const next = { ...prev };
      data.teachers.forEach((t) => {
        next[t.id] = { ...next[t.id], status };
      });
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!data?.teachers) return;
    const records = data.teachers.map((t) => ({
      teacherId: t.id,
      status:   attendance[t.id]?.status   || "PRESENT",
      checkIn:  attendance[t.id]?.checkIn  || null,
      checkOut: attendance[t.id]?.checkOut || null,
      remarks:  attendance[t.id]?.remarks  || "",
    }));
    saveMutation.mutate({ date, records });
  };

  // Live summary from local state
  const summary = (() => {
    const teachers = data?.teachers || [];
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
    teachers.forEach((t) => {
      const st = attendance[t.id]?.status || "PRESENT";
      counts[st] = (counts[st] || 0) + 1;
    });
    return { total: teachers.length, ...counts };
  })();

  // Group teachers by department for display
  const grouped = (() => {
    if (!data?.teachers) return {};
    return data.teachers.reduce((acc, t) => {
      if (!acc[t.department]) acc[t.department] = [];
      acc[t.department].push(t);
      return acc;
    }, {});
  })();

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <PageHeader
        title="Mark Teacher Attendance"
        description="Record daily attendance for teaching and non-teaching staff"
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
          <label className="text-[11px] text-gray-400 font-medium">Department (optional)</label>
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setSaved(false); }}
            className={selectCls}
          >
            <option value="">All Departments</option>
            {data?.departments?.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Bulk mark */}
        {data?.teachers?.length > 0 && (
          <div className="flex flex-col gap-0.5 ml-auto">
            <label className="text-[11px] text-gray-400 font-medium">Mark All As</label>
            <div className="flex gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleBulkMark(key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-all ${cfg.light} hover:opacity-80`}
                >
                  All {cfg.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Staff" value={summary.total} icon={Users} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Present" value={summary.PRESENT} icon={UserCheck} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Absent" value={summary.ABSENT} icon={UserX} color="bg-red-50 text-red-500" />
        <StatCard label="Late" value={summary.LATE} icon={Clock} color="bg-amber-50 text-amber-600" />
        <StatCard label="On Leave" value={summary.LEAVE} icon={FileCheck} color="bg-blue-50 text-blue-600" />
      </div>

      {/* Loading */}
      {(isLoading || isFetching) && (
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] text-gray-400">Loading teachers...</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isFetching && data?.teachers?.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-2">
          <Users size={24} className="text-gray-200" />
          <p className="text-[13px] text-gray-400">No active teachers found</p>
        </div>
      )}

      {/* Attendance — grouped by department */}
      {!isLoading && data?.teachers?.length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dept, teachers]) => (
            <div key={dept} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Department header */}
              <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">{dept}</p>
                <span className="text-[11px] text-gray-400">{teachers.length} staff</span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_240px_100px_100px_150px] gap-0 border-b border-gray-50 px-4 py-2">
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Teacher</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Status</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Check In</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Check Out</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Remarks</div>
              </div>

              {/* Teacher rows */}
              <div className="divide-y divide-gray-50">
                {teachers.map((teacher) => {
                  const rec = attendance[teacher.id] || { status: "PRESENT", checkIn: "", checkOut: "", remarks: "" };
                  const isLate = rec.status === "LATE";
                  const isAbsent = rec.status === "ABSENT";
                  const isLeave = rec.status === "LEAVE";
                  return (
                    <div
                      key={teacher.id}
                      className={`grid grid-cols-[1fr_240px_100px_100px_150px] gap-0 items-center px-4 py-3 transition-colors ${
                        isAbsent ? "bg-red-50/30" : isLate ? "bg-amber-50/30" : isLeave ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* Teacher info */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                          <span className="text-purple-600 text-[10px] font-semibold">
                            {teacher.firstName[0]}{teacher.lastName?.[0] || ""}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-800 leading-tight">
                            {teacher.firstName} {teacher.lastName}
                          </p>
                          <p className="text-[11px] text-gray-400">{teacher.designation} · <span className="font-mono">{teacher.employeeId}</span></p>
                        </div>
                      </div>

                      {/* Status buttons */}
                      <div className="flex items-center gap-1">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => setField(teacher.id, "status", key)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              rec.status === key
                                ? `${cfg.color} border-transparent ring-2 ${cfg.ring} ring-offset-1 scale-105`
                                : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                            }`}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>

                      {/* Check In */}
                      <div className="pr-2">
                        <input
                          type="time"
                          value={rec.checkIn}
                          onChange={(e) => setField(teacher.id, "checkIn", e.target.value)}
                          disabled={isAbsent || isLeave}
                          className={`${inputCls} ${isAbsent || isLeave ? "opacity-30 cursor-not-allowed" : ""}`}
                        />
                      </div>

                      {/* Check Out */}
                      <div className="pr-2">
                        <input
                          type="time"
                          value={rec.checkOut}
                          onChange={(e) => setField(teacher.id, "checkOut", e.target.value)}
                          disabled={isAbsent || isLeave}
                          className={`${inputCls} ${isAbsent || isLeave ? "opacity-30 cursor-not-allowed" : ""}`}
                        />
                      </div>

                      {/* Remarks */}
                      <div>
                        <input
                          type="text"
                          placeholder="Optional..."
                          value={rec.remarks}
                          onChange={(e) => setField(teacher.id, "remarks", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save bar */}
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-400">
              {summary.total} staff · {summary.PRESENT} present · {summary.ABSENT} absent
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
              <Button onClick={handleSave} disabled={saveMutation.isPending} icon={Save}>
                {saveMutation.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}