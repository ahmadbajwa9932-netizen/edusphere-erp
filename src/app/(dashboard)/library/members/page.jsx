"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { libraryMembersApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, Pencil, Users, Search, Eye,
  GraduationCap, BookOpen, UserCheck, UserX,
  CalendarClock, ToggleLeft, ToggleRight, Hash,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS = ["Member", "Type", "Class / Ref ID", "Contact", "Membership", "Issued", "Status", "Actions"];

const STATUS_CONFIG = {
  ACTIVE:    { label: "Active",    color: "bg-emerald-50 text-emerald-700 border border-emerald-100", dot: "bg-emerald-400" },
  SUSPENDED: { label: "Suspended", color: "bg-amber-50 text-amber-700 border border-amber-100",      dot: "bg-amber-400"   },
  EXPIRED:   { label: "Expired",   color: "bg-red-50 text-red-600 border border-red-100",            dot: "bg-red-400"     },
};

const TYPE_CONFIG = {
  STUDENT: { label: "Student", color: "bg-indigo-50 text-indigo-600", icon: GraduationCap },
  TEACHER: { label: "Teacher", color: "bg-purple-50 text-purple-600", icon: BookOpen      },
  STAFF:   { label: "Staff",   color: "bg-amber-50 text-amber-700",   icon: Users         },
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const cfg  = TYPE_CONFIG[type] || TYPE_CONFIG.STUDENT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${cfg.color}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const diff = new Date(endDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LibraryMembersPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [memberType, setMemberType] = useState("");
  const [status,     setStatus]     = useState("");
  const [classId,    setClassId]    = useState("");
  const [page,       setPage]       = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addModal,    setAddModal]   = useState(false);
  const [editTarget,  setEdit]       = useState(null);
  const [deleteId,    setDeleteId]   = useState(null);
  const [viewTarget,  setView]       = useState(null);

  const emptyForm = {
    name: "", memberType: "STUDENT", referenceId: "",
    classId: "", phone: "", email: "", address: "",
    membershipStart: new Date().toISOString().split("T")[0],
    membershipEnd: "", status: "ACTIVE",
  };
  const [form,        setForm]        = useState(emptyForm);
  const [formErrors,  setFormErrors]  = useState({});
  const [serverError, setServerError] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["library-members", search, memberType, status, classId, page],
    queryFn:  () => libraryMembersApi.getAll({ search, memberType, status, classId, page, limit: 20 }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: libraryMembersApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-members"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => libraryMembersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-members"] }); closeModal(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const deleteMutation = useMutation({
    mutationFn: libraryMembersApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["library-members"] }); setDeleteId(null); },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => libraryMembersApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library-members"] }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name       = "Name is required";
    if (!form.memberType)    e.memberType = "Type is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEdit(null); setForm(emptyForm); setFormErrors({}); setServerError(""); setAddModal(true);
  };

  const openEdit = (member) => {
    setEdit(member);
    setForm({
      name:            member.name,
      memberType:      member.memberType,
      referenceId:     member.referenceId     || "",
      classId:         member.classId         ? String(member.classId) : "",
      phone:           member.phone           || "",
      email:           member.email           || "",
      address:         member.address         || "",
      membershipStart: member.membershipStart ? new Date(member.membershipStart).toISOString().split("T")[0] : "",
      membershipEnd:   member.membershipEnd   ? new Date(member.membershipEnd).toISOString().split("T")[0]   : "",
      status:          member.status,
    });
    setFormErrors({}); setServerError(""); setAddModal(true);
  };

  const closeModal = () => { setAddModal(false); setEdit(null); setServerError(""); };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) updateMutation.mutate({ id: editTarget.id, ...form });
    else            createMutation.mutate(form);
  };

  const clearFilters = () => { setSearch(""); setMemberType(""); setStatus(""); setClassId(""); setPage(1); };
  const hasFilters   = search || memberType || status || classId;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const members   = data?.members || [];
  const active    = members.filter((m) => m.status === "ACTIVE").length;
  const suspended = members.filter((m) => m.status === "SUSPENDED").length;
  const expired   = members.filter((m) => m.status === "EXPIRED").length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      <PageHeader title="Library Members" description="Manage library membership registrations and access">
        <Button icon={Plus} onClick={openAdd}>Add Member</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: data?.total || 0, color: "bg-indigo-50 text-indigo-600",  icon: Users     },
          { label: "Active",        value: active,            color: "bg-emerald-50 text-emerald-600",icon: UserCheck },
          { label: "Suspended",     value: suspended,         color: "bg-amber-50 text-amber-600",   icon: UserX     },
          { label: "Expired",       value: expired,           color: "bg-red-50 text-red-500",       icon: CalendarClock },
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
            placeholder="Search name, member ID, ref ID, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={memberType} onChange={(e) => { setMemberType(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Types</option>
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
          <option value="STAFF">Staff</option>
        </select>
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} className={selectCls + " max-w-[140px]"}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="EXPIRED">Expired</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">Clear</button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && members.length === 0}
          emptyIcon={Users}
          emptyText="No library members yet"
          emptySubtext="Click 'Add Member' to register the first member"
        >
          {members.map((member) => {
            const days = daysLeft(member.membershipEnd);
            const expiringSoon = days !== null && days > 0 && days <= 30;
            return (
              <Tr key={member.id}>

                {/* Name + member ID */}
                <Td first>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 text-[11px] font-bold">
                        {member.name[0]}{member.name.split(" ")[1]?.[0] || ""}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800 leading-tight">{member.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{member.memberId}</p>
                    </div>
                  </div>
                </Td>

                {/* Type */}
                <Td><TypeBadge type={member.memberType} /></Td>

                {/* Class / Ref ID */}
                <Td>
                  <div className="space-y-0.5">
                    {member.class && (
                      <p className="text-[12px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium inline-block">
                        {member.class.name}
                      </p>
                    )}
                    {member.referenceId && (
                      <p className="text-[11px] text-gray-400 font-mono">{member.referenceId}</p>
                    )}
                    {!member.class && !member.referenceId && (
                      <span className="text-gray-300 text-[12px]">—</span>
                    )}
                  </div>
                </Td>

                {/* Contact */}
                <Td>
                  <div className="space-y-0.5">
                    {member.phone && <p className="text-[12px] text-gray-600">{member.phone}</p>}
                    {member.email && <p className="text-[11px] text-gray-400">{member.email}</p>}
                    {!member.phone && !member.email && <span className="text-gray-300 text-[12px]">—</span>}
                  </div>
                </Td>

                {/* Membership dates */}
                <Td>
                  <div>
                    <p className="text-[11px] text-gray-500">{formatDate(member.membershipStart)}</p>
                    {member.membershipEnd ? (
                      <p className={`text-[11px] font-medium ${expiringSoon ? "text-amber-500" : "text-gray-400"}`}>
                        → {formatDate(member.membershipEnd)}
                        {expiringSoon && <span className="ml-1 text-[10px]">({days}d left)</span>}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400">→ No expiry</p>
                    )}
                  </div>
                </Td>

                {/* Total issued */}
                <Td>
                  <div className="flex items-center gap-1">
                    <Hash size={11} className="text-gray-300" />
                    <span className="text-[13px] font-semibold text-gray-700">{member.totalIssued}</span>
                  </div>
                </Td>

                {/* Status — clickable toggle */}
                <Td>
                  <button
                    onClick={() => {
                      const next = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                      toggleStatusMutation.mutate({ id: member.id, status: next });
                    }}
                    disabled={member.status === "EXPIRED"}
                    className="text-left disabled:cursor-default"
                    title={member.status !== "EXPIRED" ? "Click to toggle" : ""}
                  >
                    <StatusBadge status={member.status} />
                    {member.status !== "EXPIRED" && (
                      <p className="text-[10px] text-gray-300 mt-0.5 hover:text-indigo-400 transition-colors">
                        {member.status === "ACTIVE" ? "Click to suspend" : "Click to activate"}
                      </p>
                    )}
                  </button>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setView(member)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEdit(member)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(member.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>

              </Tr>
            );
          })}
        </Table>

        <TableFooter page={page} totalPages={data?.totalPages} total={data?.total} label="members" onPageChange={setPage} />
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={closeModal} title={editTarget ? "Edit Member" : "Add Member"} size="md">
        <div className="space-y-3">

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              placeholder="e.g. Ahmed Ali"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={formErrors.name}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Member Type *</label>
              <select value={form.memberType} onChange={(e) => set("memberType", e.target.value)} className={selectCls}>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="STAFF">Staff</option>
              </select>
              {formErrors.memberType && <p className="text-[11px] text-red-500">{formErrors.memberType}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Reference ID"
              placeholder={form.memberType === "STUDENT" ? "e.g. STU-2025-001" : "e.g. TCH-2025-001"}
              value={form.referenceId}
              onChange={(e) => set("referenceId", e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Class</label>
              <select
                value={form.classId}
                onChange={(e) => set("classId", e.target.value)}
                className={selectCls}
                disabled={form.memberType !== "STUDENT"}
              >
                <option value="">{form.memberType !== "STUDENT" ? "N/A for this type" : "Select class"}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              placeholder="e.g. 03001234567"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. member@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <Input
            label="Address"
            placeholder="Home address (optional)"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Membership Start"
              type="date"
              value={form.membershipStart}
              onChange={(e) => set("membershipStart", e.target.value)}
            />
            <Input
              label="Membership End"
              type="date"
              value={form.membershipEnd}
              onChange={(e) => set("membershipEnd", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {serverError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..." : editTarget ? "Update Member" : "Add Member"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Member Profile" size="md">
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
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-gray-400 font-mono">{viewTarget.memberId}</p>
                  <TypeBadge type={viewTarget.memberType} />
                </div>
              </div>
              <StatusBadge status={viewTarget.status} />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Phone",      viewTarget.phone       || "—"],
                ["Email",      viewTarget.email       || "—"],
                ["Reference ID", viewTarget.referenceId || "—"],
                ["Class",      viewTarget.class?.name || "—"],
                ["Address",    viewTarget.address     || "—"],
                ["Total Issued", viewTarget.totalIssued],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-medium text-gray-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Membership period */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-[11px] text-indigo-400 font-medium mb-2">Membership Period</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-indigo-300">Start</p>
                  <p className="text-[13px] font-semibold text-indigo-700">{formatDate(viewTarget.membershipStart)}</p>
                </div>
                <div className="text-indigo-300 text-[18px]">→</div>
                <div className="text-right">
                  <p className="text-[10px] text-indigo-300">End</p>
                  <p className="text-[13px] font-semibold text-indigo-700">
                    {viewTarget.membershipEnd ? formatDate(viewTarget.membershipEnd) : "No expiry"}
                  </p>
                </div>
              </div>
              {viewTarget.membershipEnd && (() => {
                const d = daysLeft(viewTarget.membershipEnd);
                if (d === null) return null;
                return (
                  <div className={`mt-2 text-center text-[11px] font-medium rounded-lg py-1 ${
                    d <= 0 ? "bg-red-100 text-red-600" : d <= 30 ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-600"
                  }`}>
                    {d <= 0 ? "Membership expired" : `${d} days remaining`}
                  </div>
                );
              })()}
            </div>

            {/* Quick status toggle */}
            {viewTarget.status !== "EXPIRED" && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                <p className="text-[12px] text-gray-500">Portal Status</p>
                <button
                  onClick={() => {
                    const next = viewTarget.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                    toggleStatusMutation.mutate({ id: viewTarget.id, status: next });
                    setView((p) => ({ ...p, status: next }));
                  }}
                  className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
                    viewTarget.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                  }`}
                >
                  {viewTarget.status === "ACTIVE"
                    ? <><ToggleRight size={14} /> Active — click to suspend</>
                    : <><ToggleLeft  size={14} /> Suspended — click to activate</>
                  }
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setView(null)}>Close</Button>
          <Button className="flex-1" icon={Pencil} onClick={() => { setView(null); openEdit(viewTarget); }}>Edit</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Member">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this member?</p>
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