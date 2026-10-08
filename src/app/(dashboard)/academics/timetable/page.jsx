"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { timetableApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import { BookOpen, Printer, GraduationCap } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const DAY_FULL = {
  MONDAY:    "Monday",
  TUESDAY:   "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY:  "Thursday",
  FRIDAY:    "Friday",
  SATURDAY:  "Saturday",
};

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

// subject color cycling
const CELL_COLORS = [
  "bg-indigo-50 border-indigo-100 text-indigo-700",
  "bg-emerald-50 border-emerald-100 text-emerald-700",
  "bg-amber-50 border-amber-100 text-amber-700",
  "bg-purple-50 border-purple-100 text-purple-700",
  "bg-pink-50 border-pink-100 text-pink-700",
  "bg-sky-50 border-sky-100 text-sky-700",
  "bg-orange-50 border-orange-100 text-orange-700",
  "bg-teal-50 border-teal-100 text-teal-700",
];

function cellColor(subject) {
  const idx = (subject?.charCodeAt(0) || 0) % CELL_COLORS.length;
  return CELL_COLORS[idx];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AcademicsTimetablePage() {
  const [selectedClass, setSelectedClass] = useState("");
  const printRef = useRef(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["timetable-slots"],
    queryFn: timetableApi.getSlots,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["timetable-entries", selectedClass],
    queryFn: () => timetableApi.getEntries({ classId: selectedClass }),
    enabled: !!selectedClass,
  });

  // ── Build lookup: entryMap[slotId][day] = entry ───────────────────────────
  const entryMap = {};
  entries.forEach((e) => {
    if (!entryMap[e.slotId]) entryMap[e.slotId] = {};
    entryMap[e.slotId][e.day] = e;
  });

  const selectedClassName = classes.find((c) => String(c.id) === String(selectedClass))?.name;
  const isLoading = slotsLoading || (selectedClass && entriesLoading);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Check if timetable has any entries ───────────────────────────────────
  const hasEntries = entries.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Timetable" description="View weekly class schedules">
        {selectedClass && hasEntries && (
          <Button variant="secondary" icon={Printer} onClick={handlePrint}>
            Print
          </Button>
        )}
      </PageHeader>

      {/* Class selector */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-gray-600">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={selectCls + " min-w-[200px]"}
            >
              <option value="">Choose a class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          {selectedClass && (
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-[12px] text-gray-500">
                Showing timetable for{" "}
                <span className="font-semibold text-gray-700">{selectedClassName}</span>
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* No class selected */}
      {!selectedClass && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <GraduationCap size={24} className="text-indigo-300" />
          </div>
          <p className="text-[14px] font-medium text-gray-500">Select a class to view its timetable</p>
          <p className="text-[12px] text-gray-400">
            To manage or edit timetable entries, go to{" "}
            <span className="text-indigo-500 font-medium">Teachers → Timetable</span>
          </p>
        </div>
      )}

      {/* No slots */}
      {selectedClass && !isLoading && slots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            <BookOpen size={20} className="text-gray-300" />
          </div>
          <p className="text-[13px] text-gray-500 font-medium">No periods defined yet</p>
          <p className="text-[12px] text-gray-400">
            Go to <span className="text-indigo-500 font-medium">Teachers → Timetable</span> to add periods first
          </p>
        </div>
      )}

      {/* No entries for this class */}
      {selectedClass && !isLoading && slots.length > 0 && !hasEntries && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            <BookOpen size={20} className="text-gray-300" />
          </div>
          <p className="text-[13px] text-gray-500 font-medium">No timetable assigned for {selectedClassName}</p>
          <p className="text-[12px] text-gray-400">
            Go to <span className="text-indigo-500 font-medium">Teachers → Timetable</span> to assign periods
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Timetable grid ─────────────────────────────────────────────────── */}
      {selectedClass && !isLoading && slots.length > 0 && hasEntries && (
        <div ref={printRef}>

          {/* Print header — only visible when printing */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold text-gray-900">Weekly Timetable — {selectedClassName}</h1>
            <p className="text-sm text-gray-500 mt-1">Printed on {new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden print:rounded-none print:border-0 print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {/* Period col */}
                    <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-[140px] border-r border-gray-100">
                      Period
                    </th>
                    {DAYS.map((day) => {
                      const dayHasEntry = slots.some((s) => entryMap[s.id]?.[day]);
                      return (
                        <th
                          key={day}
                          className={`px-3 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-center min-w-[130px] ${
                            dayHasEntry ? "text-gray-700" : "text-gray-300"
                          }`}
                        >
                          {DAY_FULL[day]}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, idx) => {
                    const rowHasEntry = DAYS.some((d) => entryMap[slot.id]?.[d]);
                    return (
                      <tr
                        key={slot.id}
                        className={`border-b border-gray-50 last:border-0 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        } ${!rowHasEntry ? "opacity-40" : ""}`}
                      >
                        {/* Period label */}
                        <td className="px-4 py-3 border-r border-gray-100">
                          <p className="text-[12px] font-semibold text-gray-700">{slot.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {slot.startTime} – {slot.endTime}
                          </p>
                        </td>

                        {/* Day cells */}
                        {DAYS.map((day) => {
                          const entry = entryMap[slot.id]?.[day];
                          return (
                            <td key={day} className="px-2 py-2 text-center">
                              {entry ? (
                                <div className={`rounded-lg border px-2.5 py-2 text-left ${cellColor(entry.subject)}`}>
                                  <p className="text-[12px] font-semibold leading-tight">{entry.subject}</p>
                                  <p className="text-[10px] mt-0.5 opacity-70">
                                    {entry.teacher?.firstName} {entry.teacher?.lastName}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-200 text-[11px]">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 flex-wrap print:mt-4">
            <p className="text-[11px] text-gray-400 font-medium">Teachers:</p>
            {[...new Map(entries.map((e) => [e.teacherId, e.teacher])).values()].map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 text-[9px] font-bold">
                    {t.firstName?.[0]}{t.lastName?.[0]}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500">{t.firstName} {t.lastName}</span>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #timetable-print, #timetable-print * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block  !important; }
        }
      `}</style>

    </div>
  );
}