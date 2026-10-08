"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableApi, teachersApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import {
  Plus, Trash2, Clock, Pencil, X, BookOpen, ChevronDown,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
};
const DAY_FULL = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

// ─── Cell component ───────────────────────────────────────────────────────────
function TimetableCell({ entry, onAdd, onDelete }) {
  if (entry) {
    return (
      <div className="group relative bg-indigo-50 border border-indigo-100 rounded-lg p-2 min-h-[64px] flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold text-indigo-700 leading-tight">{entry.subject}</p>
          <p className="text-[10px] text-indigo-400 mt-0.5">
            {entry.teacher?.firstName} {entry.teacher?.lastName}
          </p>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-indigo-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      className="w-full min-h-[64px] rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-indigo-400 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
    >
      <Plus size={14} className="group-hover:scale-110 transition-transform" />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TimetablePage() {
  const queryClient = useQueryClient();

  // ── View filter ───────────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState("");

  // ── Slot modal ────────────────────────────────────────────────────────────
  const [slotModal, setSlotModal]     = useState(false);
  const [editSlot, setEditSlot]       = useState(null); // null = add, object = edit
  const [slotForm, setSlotForm]       = useState({ name: "", startTime: "", endTime: "" });
  const [slotErrors, setSlotErrors]   = useState({});

  // ── Entry modal ───────────────────────────────────────────────────────────
  const [entryModal, setEntryModal]   = useState(false);
  const [entryCtx, setEntryCtx]       = useState({ slotId: null, day: null }); // context for which cell
  const [entryForm, setEntryForm]     = useState({ teacherId: "", subject: "" });
  const [entryError, setEntryError]   = useState("");

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [deleteSlotId, setDeleteSlotId]   = useState(null);
  const [deleteEntryId, setDeleteEntryId] = useState(null);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["timetable-slots"],
    queryFn: timetableApi.getSlots,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["timetable-entries", selectedClass],
    queryFn: () => timetableApi.getEntries(selectedClass ? { classId: selectedClass } : {}),
    enabled: !!selectedClass,
  });

  const { data: classesData = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teachersApi.getAll({ status: "ACTIVE", limit: 200 }),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createSlotMutation = useMutation({
    mutationFn: timetableApi.createSlot,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timetable-slots"] }); closeSlotModal(); },
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({ id, ...data }) => timetableApi.updateSlot(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timetable-slots"] }); closeSlotModal(); },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: timetableApi.deleteSlot,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timetable-slots"] }); setDeleteSlotId(null); },
  });

  const createEntryMutation = useMutation({
    mutationFn: timetableApi.createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-entries"] });
      closeEntryModal();
    },
    onError: (err) => {
      setEntryError(err?.response?.data?.error || "This slot is already assigned.");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: timetableApi.deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-entries"] });
      setDeleteEntryId(null);
    },
  });

  // ─── Slot modal helpers ───────────────────────────────────────────────────
  const openAddSlot = () => {
    setEditSlot(null);
    setSlotForm({ name: "", startTime: "", endTime: "" });
    setSlotErrors({});
    setSlotModal(true);
  };

  const openEditSlot = (slot) => {
    setEditSlot(slot);
    setSlotForm({ name: slot.name, startTime: slot.startTime, endTime: slot.endTime });
    setSlotErrors({});
    setSlotModal(true);
  };

  const closeSlotModal = () => { setSlotModal(false); setEditSlot(null); };

  const validateSlot = () => {
    const e = {};
    if (!slotForm.name.trim())      e.name      = "Name is required";
    if (!slotForm.startTime)        e.startTime = "Start time is required";
    if (!slotForm.endTime)          e.endTime   = "End time is required";
    setSlotErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSlotSubmit = () => {
    if (!validateSlot()) return;
    if (editSlot) {
      updateSlotMutation.mutate({ id: editSlot.id, ...slotForm });
    } else {
      createSlotMutation.mutate(slotForm);
    }
  };

  // ─── Entry modal helpers ──────────────────────────────────────────────────
  const openAddEntry = (slotId, day) => {
    setEntryCtx({ slotId, day });
    setEntryForm({ teacherId: "", subject: "" });
    setEntryError("");
    setEntryModal(true);
  };

  const closeEntryModal = () => { setEntryModal(false); setEntryCtx({ slotId: null, day: null }); };

  const handleEntrySubmit = () => {
    if (!entryForm.teacherId || !entryForm.subject.trim()) {
      setEntryError("Please select a teacher and enter a subject.");
      return;
    }
    setEntryError("");
    createEntryMutation.mutate({
      slotId:    entryCtx.slotId,
      teacherId: entryForm.teacherId,
      classId:   selectedClass,
      subject:   entryForm.subject,
      day:       entryCtx.day,
    });
  };

  // ─── Build lookup: entryMap[slotId][day] = entry ─────────────────────────
  const entryMap = {};
  entries.forEach((e) => {
    if (!entryMap[e.slotId]) entryMap[e.slotId] = {};
    entryMap[e.slotId][e.day] = e;
  });

  const isLoading = slotsLoading || (selectedClass && entriesLoading);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Timetable" description="Manage class schedules and period assignments">
        <Button variant="secondary" icon={Clock} onClick={openAddSlot}>
          Manage Periods
        </Button>
      </PageHeader>

      {/* Period slots summary */}
      {slots.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5 group"
            >
              <Clock size={11} className="text-gray-300" />
              <span className="text-[12px] font-medium text-gray-600">{slot.name}</span>
              <span className="text-[11px] text-gray-400">{slot.startTime} – {slot.endTime}</span>
              <button
                onClick={() => openEditSlot(slot)}
                className="text-gray-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all ml-1"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={() => setDeleteSlotId(slot.id)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Class selector */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className={labelCls}>Select Class to View / Edit Timetable</label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={selectCls}
              >
                <option value="">Choose a class...</option>
                {classesData.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedClass && (
            <div className="mt-4">
              <span className="text-[12px] text-gray-400">
                Showing timetable for{" "}
                <span className="font-semibold text-gray-700">
                  {classesData.find((c) => String(c.id) === String(selectedClass))?.name}
                </span>
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* No class selected */}
      {!selectedClass && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-300" />
          </div>
          <p className="text-[13px] text-gray-400">Select a class above to view or edit its timetable</p>
        </div>
      )}

      {/* No slots defined */}
      {selectedClass && slots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            <Clock size={20} className="text-gray-300" />
          </div>
          <p className="text-[13px] text-gray-500 font-medium">No periods defined yet</p>
          <p className="text-[12px] text-gray-400">Click "Manage Periods" to add time slots first</p>
          <Button variant="secondary" icon={Plus} onClick={openAddSlot}>Add First Period</Button>
        </div>
      )}

      {/* Timetable grid */}
      {selectedClass && slots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="space-y-3 w-full">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-[140px]">
                      Period
                    </th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center min-w-[120px]">
                        {DAY_FULL[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, idx) => (
                    <tr key={slot.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      {/* Period label */}
                      <td className="px-4 py-2.5 border-r border-gray-100">
                        <p className="text-[12px] font-semibold text-gray-700">{slot.name}</p>
                        <p className="text-[10px] text-gray-400">{slot.startTime} – {slot.endTime}</p>
                      </td>

                      {/* Day cells */}
                      {DAYS.map((day) => (
                        <td key={day} className="px-2 py-2">
                          <TimetableCell
                            entry={entryMap[slot.id]?.[day]}
                            onAdd={() => openAddEntry(slot.id, day)}
                            onDelete={(id) => setDeleteEntryId(id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Slot Modal (Add/Edit Period) ───────────────────────────────────── */}
      <Modal
        open={slotModal}
        onClose={closeSlotModal}
        title={editSlot ? "Edit Period" : "Add Period"}
      >
        <div className="space-y-3">
          <Input
            label="Period Name *"
            placeholder="e.g. Period 1 or Lunch Break"
            value={slotForm.name}
            onChange={(e) => setSlotForm((p) => ({ ...p, name: e.target.value }))}
            error={slotErrors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time *"
              type="time"
              value={slotForm.startTime}
              onChange={(e) => setSlotForm((p) => ({ ...p, startTime: e.target.value }))}
              error={slotErrors.startTime}
            />
            <Input
              label="End Time *"
              type="time"
              value={slotForm.endTime}
              onChange={(e) => setSlotForm((p) => ({ ...p, endTime: e.target.value }))}
              error={slotErrors.endTime}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeSlotModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
            onClick={handleSlotSubmit}
          >
            {createSlotMutation.isPending || updateSlotMutation.isPending
              ? "Saving..."
              : editSlot ? "Update Period" : "Add Period"}
          </Button>
        </div>
      </Modal>

      {/* ── Entry Modal (Assign Teacher to Cell) ──────────────────────────── */}
      <Modal
        open={entryModal}
        onClose={closeEntryModal}
        title={`Assign — ${DAY_FULL[entryCtx.day] || ""}`}
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Teacher *</label>
            <select
              value={entryForm.teacherId}
              onChange={(e) => setEntryForm((p) => ({ ...p, teacherId: e.target.value }))}
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
            label="Subject *"
            placeholder="e.g. Mathematics"
            value={entryForm.subject}
            onChange={(e) => setEntryForm((p) => ({ ...p, subject: e.target.value }))}
          />
          {entryError && (
            <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{entryError}</p>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeEntryModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createEntryMutation.isPending}
            onClick={handleEntrySubmit}
          >
            {createEntryMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Slot Modal ─────────────────────────────────────────────── */}
      <Modal open={!!deleteSlotId} onClose={() => setDeleteSlotId(null)} title="Delete Period">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this period?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              All timetable entries for this period will also be removed.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteSlotId(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteSlotMutation.isPending}
            onClick={() => deleteSlotMutation.mutate(deleteSlotId)}
          >
            {deleteSlotMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Entry Modal ────────────────────────────────────────────── */}
      <Modal open={!!deleteEntryId} onClose={() => setDeleteEntryId(null)} title="Remove Assignment">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Remove this assignment?</p>
            <p className="text-[12px] text-gray-400 mt-1">The slot will become empty and can be reassigned.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteEntryId(null)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteEntryMutation.isPending}
            onClick={() => deleteEntryMutation.mutate(deleteEntryId)}
          >
            {deleteEntryMutation.isPending ? "Removing..." : "Yes, Remove"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}