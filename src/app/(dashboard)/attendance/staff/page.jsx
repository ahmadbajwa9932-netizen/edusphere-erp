"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffAttendanceApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import StatCard from "../../../../components/ui/StatCard";
import {
  Users, UserCheck, UserX, Clock, FileCheck,
  Save, CheckCircle, AlertCircle, Briefcase,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PRESENT: {
    label: "Present",
    color: "bg-emerald-500 text-white",
    ring:  "ring-emerald-400",
    light: "bg-emerald-50 text-emerald-700 border-emerald-200",
    row:   "",
  },
  ABSENT: {
    label: "Absent",
    color: "bg-red-500 text-white",
    ring:  "ring-red-400",
    light: "bg-red-50 text-red-700 border-red-200",
    row:   "bg-red-50/30",
  },
  LATE: {
    label: "Late",
    color: "bg-amber-500 text-white",
    ring:  "ring-amber-400",
    light: "bg-amber-50 text-amber-700 border-amber-200",
    row:   "bg-amber-50/30",
  },
  LEAVE: {
    label: "Leave",
    color: "bg-blue-500 text-white",
    ring:  "ring-blue-400",
    light: "bg-blue-50 text-blue-700 border-blue-200",
    row:   "bg-blue-50/30",
  },
};

const today = () => new Date().toISOString().split("T")[0];

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

const inputCls =
  "w-full text-[12px] border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-300 placeholder:text-gray-300 bg-transparent";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate initials avatar background colour from name */
const avatarColor = (name = "") => {
  const colors = [
    "bg-violet-100 text-violet-600",
    "bg-sky-100 text-sky-600",
    "bg-teal-100 text-teal-600",
    "bg-rose-100 text-rose-600",
    "bg-orange-100 text-orange-600",
    "bg-indigo-100 text-indigo-600",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

function formatTime(time) {
    if (!time) return "—";
    const [hour, minute] = time.split(":").map(Number);
  
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
  
    return date.toLocaleTimeString("en-PK", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarkStaffAttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate]           = useState(today());
  const [department, setDepartment] = useState("");
  const [attendance, setAttendance] = useState({});
  // { staffId: { status, checkIn, checkOut, remarks } }
  const [saved, setSaved] = useState(false);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["staff-attendance", date, department],
    queryFn:  () => staffAttendanceApi.get({ date, department }),
    enabled:  !!date,
  });

  // ── Sync fetched data → local state ────────────────────────────────────────
  useEffect(() => {
    if (!data?.staff) return;
    const map = {};
    data.staff.forEach((s) => {
      map[s.id] = {
        status:   s.status   || "PRESENT",
        checkIn:  s.checkIn  || "",
        checkOut: s.checkOut || "",
        remarks:  s.remarks  || "",
      };
    });
    setAttendance(map);
    setSaved(false);
  }, [data]);

  // ── Save mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: staffAttendanceApi.save,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["staff-attendance"] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setField = (staffId, field, value) => {
    setAttendance((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [field]: value },
    }));
    setSaved(false);
  };

  const handleBulkMark = (status) => {
    if (!data?.staff) return;
    setAttendance((prev) => {
      const next = { ...prev };
      data.staff.forEach((s) => { next[s.id] = { ...next[s.id], status }; });
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!data?.staff) return;
    const records = data.staff.map((s) => ({
      staffId:  s.id,
      status:   attendance[s.id]?.status   || "PRESENT",
      checkIn:  attendance[s.id]?.checkIn  || null,
      checkOut: attendance[s.id]?.checkOut || null,
      remarks:  attendance[s.id]?.remarks  || "",
    }));
    saveMutation.mutate({ date, records });
  };

  // ── Live summary ────────────────────────────────────────────────────────────
  const summary = (() => {
    const staff = data?.staff || [];
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
    staff.forEach((s) => {
      const st = attendance[s.id]?.status || "PRESENT";
      counts[st] = (counts[st] || 0) + 1;
    });
    return { total: staff.length, ...counts };
  })();

  // ── Group by department ─────────────────────────────────────────────────────
  const grouped = (() => {
    if (!data?.staff) return {};
    return data.staff.reduce((acc, s) => {
      const dept = s.department || "General";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(s);
      return acc;
    }, {});
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
<div className="space-y-5 max-w-7xl mx-auto px-4">

      {/* Header */}
      <PageHeader
        title="Mark Staff Attendance"
        description="Record daily attendance for administrative and support staff"
      />

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Date */}
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

        {/* Department */}
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
        {data?.staff?.length > 0 && (
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
        <StatCard label="Total Staff"  value={summary.total}   icon={Users}     color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Present"      value={summary.PRESENT} icon={UserCheck} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Absent"       value={summary.ABSENT}  icon={UserX}     color="bg-red-50 text-red-500" />
        <StatCard label="Late"         value={summary.LATE}    icon={Clock}     color="bg-amber-50 text-amber-600" />
        <StatCard label="On Leave"     value={summary.LEAVE}   icon={FileCheck} color="bg-blue-50 text-blue-600" />
      </div>

      {/* Loading */}
      {(isLoading || isFetching) && (
        <div className="bg-white rounded-xl border border-gray-100 flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] text-gray-400">Loading staff members...</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isFetching && data?.staff?.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-2">
          <Briefcase size={24} className="text-gray-200" />
          <p className="text-[13px] text-gray-400">No active staff members found</p>
        </div>
      )}

      {/* Attendance — grouped by department */}
      {!isLoading && data?.staff?.length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dept, members]) => (
            <div key={dept} className="bg-white rounded-xl border border-gray-100 overflow-hidden">

              {/* Department header */}
              <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">{dept}</p>
                <span className="text-[11px] text-gray-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_240px_100px_100px_150px] gap-0 border-b border-gray-50 px-4 py-2">
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Staff Member</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Status</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Check In</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Check Out</div>
                <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Remarks</div>
              </div>

              {/* Staff rows */}
              <div className="divide-y divide-gray-50">
                {members.map((member) => {
                  const rec      = attendance[member.id] || { status: "PRESENT", checkIn: "", checkOut: "", remarks: "" };
                  const isAbsent = rec.status === "ABSENT";
                  const isLeave  = rec.status === "LEAVE";
                  const rowBg    = STATUS_CONFIG[rec.status]?.row || "";
                  const initials = `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase();
                  const avColor  = avatarColor(member.firstName);

                  return (
                    <div
                      key={member.id}
                      className={`grid grid-cols-[1fr_240px_100px_100px_150px] gap-0 items-center px-4 py-3 transition-colors ${rowBg}`}
                    >
                      {/* Staff info */}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${avColor}`}>
                          <span className="text-[10px] font-semibold">{initials}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-800 leading-tight">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {member.designation}
                            {member.dutyStartTime && member.dutyEndTime
                              ? ` · ${formatTime(member.dutyStartTime)}–${formatTime(member.dutyEndTime)}`
                              : ""}
                            {" · "}
                            <span className="font-mono">{member.employeeId}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status buttons */}
                      <div className="flex items-center gap-1">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => setField(member.id, "status", key)}
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
                          onChange={(e) => setField(member.id, "checkIn", e.target.value)}
                          disabled={isAbsent || isLeave}
                          className={`${inputCls} ${isAbsent || isLeave ? "opacity-30 cursor-not-allowed" : ""}`}
                        />
                      </div>

                      {/* Check Out */}
                      <div className="pr-2">
                        <input
                          type="time"
                          value={rec.checkOut}
                          onChange={(e) => setField(member.id, "checkOut", e.target.value)}
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
                          onChange={(e) => setField(member.id, "remarks", e.target.value)}
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