"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parentsApi, studentsApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, Users, Search, Eye,
  ToggleLeft, ToggleRight, KeyRound, GraduationCap,
  Phone, Mail, Shield, ShieldOff, RefreshCw, X,
  UserCheck, UserX, Link,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS  = ["Parent", "Contact", "Linked Students", "Portal Access", "PIN", "Actions"];
const RELATIONS = ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Elder Brother", "Elder Sister"];

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

// ─── Sub-components ───────────────────────────────────────────────────────────
function AccessBadge({ access }) {
  return access ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Disabled
    </span>
  );
}

function StudentTag({ student }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
      <GraduationCap size={9} />
      {student.firstName} {student.lastName}
      {student.class && <span className="opacity-60">· {student.class.name}</span>}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ParentPortalPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [portalFilter, setPortalFilter] = useState("");
  const [page,         setPage]         = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal,    setAddModal]   = useState(false);
  const [editTarget,  setEdit]       = useState(null);
  const [deleteId,    setDeleteId]   = useState(null);
  const [viewTarget,  setView]       = useState(null);
  const [pinModal,    setPinModal]   = useState(null); // { id, pin, name }

  // ── Form ─────────────────────────────────────────────────────────────────
  const emptyForm = {
    name: "", email: "", phone: "", cnic: "",
    address: "", relation: "Father", portalAccess: false,
    studentIds: [],
  };
  const [form,        setForm]        = useState(emptyForm);
  const [formErrors,  setFormErrors]  = useState({});
  const [serverError, setServerError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["parents", search, portalFilter, page],
    queryFn:  () => parentsApi.getAll({
      search,
      portalAccess: portalFilter,
      page,
      limit: 20,
    }),
  });

  // Search students for linking
  const { data: studentsData } = useQuery({
    queryKey: ["students-search", studentSearch],
    queryFn:  () => studentsApi.getAll({ search: studentSearch, limit: 20 }),
    enabled:  studentSearch.length >= 2,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: parentsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      closeModal();
      // Show PIN modal after creation
      setPinModal({ id: data.id, pin: data.portalPin, name: data.name });
    },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => parentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      closeModal();
    },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: parentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setDeleteId(null);
    },
  });

  const toggleAccessMutation = useMutation({
    mutationFn: ({ id, portalAccess }) => parentsApi.toggleAccess(id, portalAccess),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parents"] }),
  });

  const regeneratePinMutation = useMutation({
    mutationFn: (id) => parentsApi.regeneratePin(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setPinModal({ id: data.id, pin: data.portalPin, name: data.name });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const addStudentId = (id) => {
    const sid = parseInt(id);
    if (!form.studentIds.includes(sid)) {
      setForm((p) => ({ ...p, studentIds: [...p.studentIds, sid] }));
    }
    setStudentSearch("");
  };

  const removeStudentId = (id) => {
    setForm((p) => ({ ...p, studentIds: p.studentIds.filter((s) => s !== id) }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (!form.relation)     e.relation = "Relation is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEdit(null);
    setForm(emptyForm);
    setFormErrors({});
    setServerError("");
    setStudentSearch("");
    setAddModal(true);
  };

  const openEdit = (parent) => {
    setEdit(parent);
    setForm({
      name:         parent.name,
      email:        parent.email        || "",
      phone:        parent.phone,
      cnic:         parent.cnic         || "",
      address:      parent.address      || "",
      relation:     parent.relation,
      portalAccess: parent.portalAccess,
      studentIds:   parent.students?.map((ps) => ps.studentId) || [],
    });
    setFormErrors({});
    setServerError("");
    setStudentSearch("");
    setAddModal(true);
  };

  const closeModal = () => {
    setAddModal(false);
    setEdit(null);
    setServerError("");
    setStudentSearch("");
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const clearFilters = () => { setSearch(""); setPortalFilter(""); setPage(1); };
  const hasFilters   = search || portalFilter;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const parents      = data?.parents || [];
  const activeCount  = parents.filter((p) => p.portalAccess).length;
  const linkedCount  = parents.filter((p) => p.students?.length > 0).length;

  // ── Find student by id in form for display ────────────────────────────────
  const linkedStudents = editTarget
    ? editTarget.students?.map((ps) => ps.student) || []
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Parent Portal" description="Manage parent accounts, portal access and student links">
        <Button icon={Plus} onClick={openAdd}>Add Parent</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Parents",   value: data?.total || 0, color: "bg-indigo-50 text-indigo-600",  icon: Users     },
          { label: "Portal Active",   value: activeCount,       color: "bg-emerald-50 text-emerald-600",icon: UserCheck },
          { label: "Portal Disabled", value: (data?.total || 0) - activeCount,
                                                                color: "bg-gray-100 text-gray-500",    icon: UserX     },
          { label: "Linked to Students", value: linkedCount,    color: "bg-purple-50 text-purple-600", icon: Link      },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <p className="text-[20px] font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search name, email, phone, CNIC..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select
          value={portalFilter}
          onChange={(e) => { setPortalFilter(e.target.value); setPage(1); }}
          className={selectCls + " max-w-[160px]"}
        >
          <option value="">All Access</option>
          <option value="true">Portal Active</option>
          <option value="false">Portal Disabled</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && parents.length === 0}
          emptyIcon={Users}
          emptyText="No parents registered yet"
          emptySubtext="Click 'Add Parent' to register the first parent account"
        >
          {parents.map((parent) => (
            <Tr key={parent.id}>

              {/* Name + relation */}
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[11px] font-bold">
                      {parent.name[0]}{parent.name.split(" ")[1]?.[0] || ""}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">{parent.name}</p>
                    <p className="text-[11px] text-gray-400">{parent.relation}</p>
                  </div>
                </div>
              </Td>

              {/* Contact */}
              <Td>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[12px] text-gray-600">
                    <Phone size={10} className="text-gray-300" />{parent.phone}
                  </div>
                  {parent.email && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Mail size={10} className="text-gray-300" />{parent.email}
                    </div>
                  )}
                </div>
              </Td>

              {/* Linked students */}
              <Td>
                {parent.students?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {parent.students.map((ps) => (
                      <StudentTag key={ps.studentId} student={ps.student} />
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-300">No students linked</span>
                )}
              </Td>

              {/* Portal access toggle */}
              <Td>
                <button
                  onClick={() => toggleAccessMutation.mutate({ id: parent.id, portalAccess: !parent.portalAccess })}
                  className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                    parent.portalAccess
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {parent.portalAccess
                    ? <><ToggleRight size={13} /> Active</>
                    : <><ToggleLeft  size={13} /> Disabled</>
                  }
                </button>
              </Td>

              {/* PIN */}
              <Td>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[13px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded tracking-widest">
                    {parent.portalPin || "----"}
                  </span>
                  <button
                    onClick={() => regeneratePinMutation.mutate(parent.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    title="Regenerate PIN"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>
              </Td>

              {/* Actions */}
              <Td>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setView(parent)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="View profile"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(parent)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(parent.id)}
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
          totalPages={data?.totalPages}
          total={data?.total}
          label="parents"
          onPageChange={setPage}
        />
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        open={addModal}
        onClose={closeModal}
        title={editTarget ? `Edit — ${editTarget.name}` : "Register Parent"}
        size="md"
      >
        <div className="space-y-3">
          {/* Personal */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              placeholder="e.g. Muhammad Aslam"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={formErrors.name}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Relation *</label>
              <select value={form.relation} onChange={(e) => set("relation", e.target.value)} className={selectCls}>
                {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {formErrors.relation && <p className="text-[11px] text-red-500">{formErrors.relation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone *"
              placeholder="e.g. 03001234567"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={formErrors.phone}
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. parent@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CNIC"
              placeholder="e.g. 35201-1234567-1"
              value={form.cnic}
              onChange={(e) => set("cnic", e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Portal Access</label>
              <select
                value={String(form.portalAccess)}
                onChange={(e) => set("portalAccess", e.target.value === "true")}
                className={selectCls}
              >
                <option value="false">Disabled</option>
                <option value="true">Active</option>
              </select>
            </div>
          </div>

          <Input
            label="Address"
            placeholder="Home address (optional)"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />

          {/* Link students */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Link Students</label>

            {/* Selected students */}
            {form.studentIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                {form.studentIds.map((sid) => {
                  // find student name from search results or existing links
                  const fromSearch = studentsData?.students?.find((s) => s.id === sid);
                  const fromEdit   = editTarget?.students?.find((ps) => ps.studentId === sid)?.student;
                  const student    = fromSearch || fromEdit;
                  return (
                    <span key={sid} className="inline-flex items-center gap-1.5 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-md font-medium">
                      <GraduationCap size={10} />
                      {student ? `${student.firstName} ${student.lastName}` : `Student #${sid}`}
                      <button onClick={() => removeStudentId(sid)} className="text-indigo-300 hover:text-red-500 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Student search */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                placeholder="Search student by name to link..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
              />
            </div>

            {/* Search results dropdown */}
            {studentSearch.length >= 2 && studentsData?.students?.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                {studentsData.students
                  .filter((s) => !form.studentIds.includes(s.id))
                  .slice(0, 5)
                  .map((student) => (
                    <button
                      key={student.id}
                      onClick={() => addStudentId(student.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 text-[9px] font-bold">
                          {student.firstName[0]}{student.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {student.class?.name} · {student.studentId}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {studentSearch.length >= 2 && studentsData?.students?.filter((s) => !form.studentIds.includes(s.id)).length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-2">No students found</p>
            )}
          </div>

          {serverError && (
            <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..." : editTarget ? "Update Parent" : "Register Parent"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Parent Profile" size="md">
        {viewTarget && (
          <div className="space-y-4">
            {/* Top */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-indigo-600 text-[16px] font-bold">
                  {viewTarget.name[0]}{viewTarget.name.split(" ")[1]?.[0] || ""}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-800">{viewTarget.name}</p>
                <p className="text-[12px] text-gray-400">{viewTarget.relation}</p>
              </div>
              <AccessBadge access={viewTarget.portalAccess} />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Phone",    viewTarget.phone],
                ["Email",    viewTarget.email   || "—"],
                ["CNIC",     viewTarget.cnic    || "—"],
                ["Address",  viewTarget.address || "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Portal PIN */}
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-[11px] text-indigo-400 font-medium">Portal PIN</p>
                <p className="text-[22px] font-bold text-indigo-700 tracking-[0.3em] font-mono mt-0.5">
                  {viewTarget.portalPin || "----"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AccessBadge access={viewTarget.portalAccess} />
                <button
                  onClick={() => regeneratePinMutation.mutate(viewTarget.id)}
                  className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  <RefreshCw size={11} /> Regenerate
                </button>
              </div>
            </div>

            {/* Linked students */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Linked Students ({viewTarget.students?.length || 0})
              </p>
              {viewTarget.students?.length > 0 ? (
                <div className="space-y-2">
                  {viewTarget.students.map((ps) => (
                    <div key={ps.studentId} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 text-[10px] font-bold">
                          {ps.student.firstName[0]}{ps.student.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-gray-700">
                          {ps.student.firstName} {ps.student.lastName}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {ps.student.class?.name}
                          {ps.student.section && ` · Section ${ps.student.section}`}
                          {` · ${ps.student.studentId}`}
                        </p>
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        ps.student.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {ps.student.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 gap-1">
                  <p className="text-[12px] text-gray-400">No students linked</p>
                  <button
                    onClick={() => { setView(null); openEdit(viewTarget); }}
                    className="text-[12px] text-indigo-500 hover:underline"
                  >
                    Link a student
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setView(null)}>Close</Button>
          <Button className="flex-1" icon={Pencil} onClick={() => { setView(null); openEdit(viewTarget); }}>
            Edit
          </Button>
        </div>
      </Modal>

      {/* ── PIN Display Modal (after create / regenerate) ──────────────────── */}
      <Modal open={!!pinModal} onClose={() => setPinModal(null)} title="Portal PIN">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <KeyRound size={24} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-[13px] text-gray-500">Portal PIN for</p>
            <p className="text-[16px] font-semibold text-gray-800 mt-0.5">{pinModal?.name}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-8 py-4">
            <p className="text-[11px] text-indigo-400 mb-1">4-Digit PIN</p>
            <p className="text-[36px] font-bold text-indigo-700 tracking-[0.4em] font-mono">
              {pinModal?.pin}
            </p>
          </div>
          <p className="text-[12px] text-gray-400 max-w-[260px]">
            Share this PIN with the parent. They will use it along with their phone number to access the parent portal.
          </p>
        </div>
        <div className="mt-5">
          <Button className="w-full" onClick={() => setPinModal(null)}>Done</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Parent">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this parent account?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              All student links and portal access will be removed permanently.
            </p>
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