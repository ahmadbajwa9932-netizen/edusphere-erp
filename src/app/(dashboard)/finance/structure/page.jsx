"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feeStructuresApi, classesApi } from "../../../../lib/api";
import PageHeader   from "../../../../components/ui/PageHeader";
import StatCard     from "../../../../components/ui/StatCard";
import Button       from "../../../../components/ui/Button";
import Modal        from "../../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Search, Filter, Trash2, Pencil,
  Banknote, CheckCircle, XCircle, ToggleLeft,
  ToggleRight, ChevronDown, ChevronUp, X,
} from "lucide-react";

// ── constants ────────────────────────────────────────────────────────────────
const FEE_TYPES = ["TUITION","ADMISSION","EXAMINATION","LIBRARY","TRANSPORT","SPORTS","LABORATORY","UNIFORM","OTHER"];
const FREQUENCIES = ["MONTHLY","QUARTERLY","ANNUALLY","ONE_TIME"];

const FEE_TYPE_CFG = {
  TUITION:     { cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  ADMISSION:   { cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  EXAMINATION: { cls: "bg-amber-50 text-amber-600 border-amber-100" },
  LIBRARY:     { cls: "bg-cyan-50 text-cyan-600 border-cyan-100" },
  TRANSPORT:   { cls: "bg-orange-50 text-orange-600 border-orange-100" },
  SPORTS:      { cls: "bg-lime-50 text-lime-600 border-lime-100" },
  LABORATORY:  { cls: "bg-purple-50 text-purple-600 border-purple-100" },
  UNIFORM:     { cls: "bg-pink-50 text-pink-600 border-pink-100" },
  OTHER:       { cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const FREQ_CFG = {
  MONTHLY:   { label: "Monthly",   cls: "bg-blue-50 text-blue-600 border-blue-100" },
  QUARTERLY: { label: "Quarterly", cls: "bg-violet-50 text-violet-600 border-violet-100" },
  ANNUALLY:  { label: "Annually",  cls: "bg-rose-50 text-rose-600 border-rose-100" },
  ONE_TIME:  { label: "One-time",  cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const fmt = (n) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const inputCls  = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

const currentYear = () => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

const emptyForm = () => ({
  name: "", classId: "", feeType: "TUITION", amount: "",
  frequency: "MONTHLY", dueDay: "10", academicYear: currentYear(),
  description: "", isActive: true,
  feeItems: [{ label: "", amount: "", isOptional: false }],
});

// ── main ─────────────────────────────────────────────────────────────────────
export default function FeeStructurePage() {
  const qc = useQueryClient();

  // ── filter state ─────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [classId,      setClassId]      = useState("");
  const [feeType,      setFeeType]      = useState("");
  const [frequency,    setFrequency]    = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [isActive,     setIsActive]     = useState("");
  const [page,         setPage]         = useState(1);

  const [committed, setCommitted] = useState({
    search: "", classId: "", feeType: "", frequency: "",
    academicYear: "", isActive: "", page: 1,
  });

  // ── modal state ───────────────────────────────────────────────────────────
  const [addOpen,    setAddOpen]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId,   setExpandedId]   = useState(null);

  // ── form ──────────────────────────────────────────────────────────────────
  const [form,      setForm]      = useState(emptyForm());
  const [formError, setFormError] = useState("");

  // ── queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["fee-structures", committed],
    queryFn:  () => feeStructuresApi.getAll(committed),
    keepPreviousData: true,
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fee-structures"] });

  const createMutation = useMutation({
    mutationFn: feeStructuresApi.create,
    onSuccess: () => { invalidate(); setAddOpen(false); setForm(emptyForm()); setFormError(""); },
    onError: (err) => setFormError(err?.response?.data?.error || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => feeStructuresApi.update(id, data),
    onSuccess: () => { invalidate(); setEditTarget(null); setForm(emptyForm()); setFormError(""); },
    onError: (err) => setFormError(err?.response?.data?.error || "Failed to update"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => feeStructuresApi.toggleActive(id, isActive),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: feeStructuresApi.delete,
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
    onError: (err) => alert(err?.response?.data?.error || "Failed to delete"),
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const apply = () => {
    setPage(1);
    setCommitted({ search, classId, feeType, frequency, academicYear, isActive, page: 1 });
  };

  const reset = () => {
    setSearch(""); setClassId(""); setFeeType(""); setFrequency("");
    setAcademicYear(""); setIsActive(""); setPage(1);
    setCommitted({ search: "", classId: "", feeType: "", frequency: "", academicYear: "", isActive: "", page: 1 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    setCommitted((prev) => ({ ...prev, page: p }));
  };

  const openEdit = (s) => {
    setForm({
      name: s.name, classId: String(s.classId), feeType: s.feeType,
      amount: String(s.amount), frequency: s.frequency, dueDay: String(s.dueDay),
      academicYear: s.academicYear, description: s.description || "",
      isActive: s.isActive,
      feeItems: s.feeItems.length > 0
        ? s.feeItems.map((i) => ({ label: i.label, amount: String(i.amount), isOptional: i.isOptional }))
        : [{ label: "", amount: "", isOptional: false }],
    });
    setFormError("");
    setEditTarget(s);
  };

  // Fee items helpers
  const addItem = () =>
    setForm((f) => ({ ...f, feeItems: [...f.feeItems, { label: "", amount: "", isOptional: false }] }));

  const removeItem = (i) =>
    setForm((f) => ({ ...f, feeItems: f.feeItems.filter((_, idx) => idx !== i) }));

  const updateItem = (i, key, val) =>
    setForm((f) => {
      const items = [...f.feeItems];
      items[i] = { ...items[i], [key]: val };
      return { ...f, feeItems: items };
    });

  const handleSubmit = () => {
    setFormError("");
    const validItems = form.feeItems.filter((i) => i.label.trim() && i.amount);
    const payload = {
      name:        form.name.trim(),
      classId:     parseInt(form.classId),
      feeType:     form.feeType,
      amount:      parseFloat(form.amount),
      frequency:   form.frequency,
      dueDay:      parseInt(form.dueDay) || 10,
      academicYear: form.academicYear.trim(),
      description: form.description.trim() || null,
      isActive:    form.isActive,
      feeItems:    validItems,
    };

    if (!payload.name || !payload.classId || !payload.amount || !payload.academicYear) {
      setFormError("Please fill all required fields.");
      return;
    }

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalFeeItems = (items) => items.reduce((s, i) => s + i.amount, 0);
  const summary = data?.summary || { totalActive: 0, totalInactive: 0 };
  const COLS = ["Structure", "Class", "Fee Type", "Frequency", "Amount", "Due Day", "Year", "Status", "Actions"];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Fee Structure"
        description="Define and manage fee structures for each class and academic year"
      >
        <Button icon={Plus} onClick={() => { setForm(emptyForm()); setFormError(""); setAddOpen(true); }}>
          New Structure
        </Button>
      </PageHeader>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Structures" value={data?.total ?? 0}          icon={Banknote}     color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Active"           value={summary.totalActive}        icon={CheckCircle}  color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Inactive"         value={summary.totalInactive}      icon={XCircle}      color="bg-gray-50 text-gray-500" />
        <StatCard label="Classes Covered"  value={classesData?.length ?? 0}   icon={Banknote}     color="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text" placeholder="Search name, class..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 placeholder:text-gray-300"
            />
          </div>

          {/* Class */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
              <option value="">All Classes</option>
              {classesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Fee Type */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Fee Type</label>
            <select value={feeType} onChange={(e) => setFeeType(e.target.value)} className={selectCls}>
              <option value="">All Types</option>
              {FEE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={selectCls}>
              <option value="">All</option>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQ_CFG[f].label}</option>)}
            </select>
          </div>

          {/* Academic Year */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Academic Year</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
              <option value="">All Years</option>
              {data?.academicYears?.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-gray-400 font-medium">Status</label>
            <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className={selectCls}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-end gap-2 ml-auto mt-auto">
            <button onClick={reset} className="px-3 py-2 text-[12px] text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
              Reset
            </button>
            <button onClick={apply} className="px-4 py-2 text-[12px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
              <Filter size={12} /> Apply
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div>
        <Table
          columns={COLS}
          isLoading={isLoading || isFetching}
          isEmpty={!isLoading && !isFetching && data?.structures?.length === 0}
          emptyIcon={Banknote}
          emptyText="No fee structures found"
          emptySubtext="Create a new structure or adjust your filters"
        >
          {data?.structures?.map((s) => {
            const ftCfg   = FEE_TYPE_CFG[s.feeType];
            const frCfg   = FREQ_CFG[s.frequency];
            const expanded = expandedId === s.id;

            return (
              <React.Fragment key={s.id}>
                <Tr>
                  {/* Structure name */}
                  <Td first>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 leading-tight">{s.name}</p>
                        {s.description && (
                          <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{s.description}</p>
                        )}
                      </div>
                    </div>
                  </Td>

                  {/* Class */}
                  <Td>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border bg-slate-50 text-slate-600 border-slate-200">
                      {s.className}
                    </span>
                  </Td>

                  {/* Fee type */}
                  <Td>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${ftCfg.cls}`}>
                      {s.feeType.charAt(0) + s.feeType.slice(1).toLowerCase()}
                    </span>
                  </Td>

                  {/* Frequency */}
                  <Td>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${frCfg.cls}`}>
                      {frCfg.label}
                    </span>
                  </Td>

                  {/* Amount */}
                  <Td>
                    <p className="text-[13px] font-semibold text-gray-800">{fmt(s.amount)}</p>
                    {s.feeItems.length > 0 && (
                      <p className="text-[11px] text-gray-400">{s.feeItems.length} item(s)</p>
                    )}
                  </Td>

                  {/* Due day */}
                  <Td>
                    <span className="text-[12px] text-gray-600">Day {s.dueDay}</span>
                  </Td>

                  {/* Academic year */}
                  <Td>
                    <span className="text-[12px] font-medium text-gray-600">{s.academicYear}</span>
                  </Td>

                  {/* Status toggle */}
                  <Td>
                    <button
                      onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                        s.isActive
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                          : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {s.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                      {s.isActive ? "Active" : "Inactive"}
                    </button>
                  </Td>

                  {/* Actions */}
                  <Td>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openEdit(s)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Td>
                </Tr>

                {/* ── Expanded fee items row ── */}
                {expanded && s.feeItems.length > 0 && (
                  <Tr key={`${s.id}-expanded`}>
                    <Td colSpan={9} className="bg-gray-50/60 px-6 py-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Fee Breakdown</p>
                      <div className="flex flex-wrap gap-2">
                        {s.feeItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                            <span className="text-[12px] text-gray-700 font-medium">{item.label}</span>
                            <span className="text-[12px] font-semibold text-indigo-600">{fmt(item.amount)}</span>
                            {item.isOptional && (
                              <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1">optional</span>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 ml-auto">
                          <span className="text-[12px] text-indigo-600 font-medium">Total</span>
                          <span className="text-[12px] font-bold text-indigo-700">{fmt(totalFeeItems(s.feeItems))}</span>
                        </div>
                      </div>
                    </Td>
                  </Tr>
                )}
              </React.Fragment>
            );
          })}
        </Table>

        <TableFooter
          page={committed.page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="structures"
          onPageChange={handlePageChange}
        />
      </div>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      <Modal
        open={addOpen || !!editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null); setForm(emptyForm()); setFormError(""); }}
        title={editTarget ? "Edit Fee Structure" : "New Fee Structure"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Structure Name *</label>
            <input
              placeholder="e.g. Class 1 Annual Fee 2025-26"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Class + Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Class *</label>
              <select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} className={inputCls}>
                <option value="">Select class...</option>
                {classesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Academic Year *</label>
              <input
                placeholder="e.g. 2025-26"
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Fee Type + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Fee Type *</label>
              <select value={form.feeType} onChange={(e) => setForm((f) => ({ ...f, feeType: e.target.value }))} className={inputCls}>
                {FEE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Frequency *</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} className={inputCls}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQ_CFG[f].label}</option>)}
              </select>
            </div>
          </div>

          {/* Amount + Due Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Total Amount (PKR) *</label>
              <input
                type="number" min="0" placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Due Day of Month</label>
              <input
                type="number" min="1" max="31" placeholder="10"
                value={form.dueDay}
                onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Description</label>
            <textarea
              rows={2} placeholder="Optional notes..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Fee items breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-gray-400 font-medium">Fee Breakdown (optional)</label>
              <button
                onClick={addItem}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
              >
                <Plus size={11} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {form.feeItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    placeholder="Label (e.g. Tuition Fee)"
                    value={item.label}
                    onChange={(e) => updateItem(i, "label", e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    type="number" min="0" placeholder="Amount"
                    value={item.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    className={`${inputCls} w-28`}
                  />
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isOptional}
                      onChange={(e) => updateItem(i, "isOptional", e.target.checked)}
                      className="rounded"
                    />
                    Optional
                  </label>
                  {form.feeItems.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Items total preview */}
            {form.feeItems.some((i) => i.amount) && (
              <div className="mt-2 flex justify-end">
                <span className="text-[12px] text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-lg">
                  Items total: {fmt(form.feeItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
                </span>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            <button
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                form.isActive ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              {form.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {form.isActive ? "Active" : "Inactive"}
            </button>
            <span className="text-[11px] text-gray-400">Toggle to activate or deactivate this structure</span>
          </div>

          {formError && <p className="text-[12px] text-red-500">{formError}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1"
              onClick={() => { setAddOpen(false); setEditTarget(null); setForm(emptyForm()); setFormError(""); }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={isPending} onClick={handleSubmit}>
              {isPending ? "Saving..." : editTarget ? "Save Changes" : "Create Structure"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ────────────────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Fee Structure">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">
              Delete "<span className="font-semibold">{deleteTarget?.name}</span>"?
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              This cannot be undone. Structures linked to fee collections cannot be deleted.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteTarget.id)}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}