"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { teachersApi, classesApi } from "../../../lib/api";
import StatCard from "../../../components/ui/StatCard";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import PageHeader from "../../../components/ui/PageHeader";
import Modal from "../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../components/ui/Table";
import {
  Search, Plus, Eye, Pencil, Trash2,
  Users, UserCheck, UserX, Briefcase,
  ToggleLeft, ToggleRight,
} from "lucide-react";

const COLUMNS = ["Teacher", "Employee ID", "Designation", "Department", "Phone", "Type", "Status", "Actions"];

const DEPARTMENTS = [
  "Science", "Mathematics", "English", "Urdu", "Islamic Studies",
  "Social Studies", "Computer Science", "Physical Education",
  "Arts", "Commerce", "Administration",
];

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

// Map status → Badge-compatible value
// If your Badge component already supports these strings, great.
// Otherwise we pass a display label and color manually below.
const STATUS_LABEL = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On Leave",
  TERMINATED: "Terminated",
};

const STATUS_COLOR = {
  ACTIVE:     "bg-emerald-50 text-emerald-600",
  INACTIVE:   "bg-gray-100 text-gray-500",
  ON_LEAVE:   "bg-amber-50 text-amber-600",
  TERMINATED: "bg-red-50 text-red-500",
};

const TYPE_LABEL = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT:  "Contract",
};

const TYPE_COLOR = {
  FULL_TIME: "bg-indigo-50 text-indigo-600",
  PART_TIME: "bg-purple-50 text-purple-600",
  CONTRACT:  "bg-orange-50 text-orange-600",
};

function Chip({ label, colorCls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorCls}`}>
      {label}
    </span>
  );
}

export default function TeachersPage() {
  const queryClient = useQueryClient();

  // ── Filter state (all server-side) ────────────────────────────────────────
  const [search, setSearch]               = useState("");
  const [department, setDepartment]       = useState("");
  const [status, setStatus]               = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [page, setPage]                   = useState(1);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [deleteId, setDeleteId]           = useState(null);
  const [toggleTarget, setToggleTarget]   = useState(null); // { id, currentStatus, name }

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["teachers", search, department, status, employmentType, page],
    queryFn: () =>
      teachersApi.getAll({ search, department, status, employmentType, page, limit: 20 }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => teachersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setDeleteId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, newStatus }) =>
      teachersApi.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setToggleTarget(null);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch(""); setDepartment(""); setStatus("");
    setEmploymentType(""); setPage(1);
  };
  const hasFilters = search || department || status || employmentType;

  const activeCount     = data?.teachers?.filter((t) => t.status === "ACTIVE").length     || 0;
  const inactiveCount   = data?.teachers?.filter((t) => t.status !== "ACTIVE").length     || 0;
  const fullTimeCount   = data?.teachers?.filter((t) => t.employmentType === "FULL_TIME").length || 0;

  // ── Toggle modal label ────────────────────────────────────────────────────
  const isActivating = toggleTarget?.currentStatus !== "ACTIVE";
  const newToggleStatus = isActivating ? "ACTIVE" : "INACTIVE";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Teachers" description="Manage and view all teacher records">
        <Link href="/teachers/add">
          <Button icon={Plus}>Add Teacher</Button>
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Teachers"
          value={data?.total || 0}
          icon={Users}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={UserCheck}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Inactive / On Leave"
          value={inactiveCount}
          icon={UserX}
          color="bg-red-50 text-red-500"
        />
        <StatCard
          label="Full Time"
          value={fullTimeCount}
          icon={Briefcase}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Filters — all changes reset to page 1 and hit server */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search name, ID, designation..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>

        {/* Department */}
        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Employment Type */}
        <select
          value={employmentType}
          onChange={(e) => { setEmploymentType(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Types</option>
          <option value="FULL_TIME">Full Time</option>
          <option value="PART_TIME">Part Time</option>
          <option value="CONTRACT">Contract</option>
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
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
          isEmpty={!isLoading && data?.teachers?.length === 0}
          emptyIcon={Users}
          emptyText="No teachers found"
          emptySubtext="Add a teacher to get started"
        >
          {data?.teachers?.map((teacher) => (
            <Tr key={teacher.id}>

              {/* Name + city */}
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[10px] font-semibold">
                      {teacher.firstName[0]}{teacher.lastName?.[0] || ""}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">
                      {teacher.firstName} {teacher.lastName}
                    </p>
                    <p className="text-[11px] text-gray-400">{teacher.city}</p>
                  </div>
                </div>
              </Td>

              {/* Employee ID */}
              <Td>
                <span className="font-mono text-[12px] text-gray-500">{teacher.employeeId}</span>
              </Td>

              {/* Designation */}
              <Td>
                <span className="text-[13px] text-gray-700">{teacher.designation}</span>
              </Td>

              {/* Department */}
              <Td>
                <span className="text-[13px] text-gray-600">{teacher.department}</span>
              </Td>

              {/* Phone */}
              <Td>
                <span className="text-[13px] text-gray-600">{teacher.phone}</span>
              </Td>

              {/* Employment Type */}
              <Td>
                <Chip
                  label={TYPE_LABEL[teacher.employmentType] || teacher.employmentType}
                  colorCls={TYPE_COLOR[teacher.employmentType] || "bg-gray-100 text-gray-500"}
                />
              </Td>

              {/* Status */}
              <Td>
                <Chip
                  label={STATUS_LABEL[teacher.status] || teacher.status}
                  colorCls={STATUS_COLOR[teacher.status] || "bg-gray-100 text-gray-500"}
                />
              </Td>

              {/* Actions */}
              <Td>
                <div className="flex items-center gap-0.5">
                  {/* View */}
                  <Link
                    href={`/teachers/${teacher.id}`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="View profile"
                  >
                    <Eye size={14} />
                  </Link>

                  {/* Edit */}
                  <Link
                    href={`/teachers/${teacher.id}/edit`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Edit teacher"
                  >
                    <Pencil size={14} />
                  </Link>

                  {/* Activate / Deactivate toggle */}
                  <button
                    onClick={() =>
                      setToggleTarget({
                        id: teacher.id,
                        currentStatus: teacher.status,
                        name: `${teacher.firstName} ${teacher.lastName || ""}`.trim(),
                      })
                    }
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      teacher.status === "ACTIVE"
                        ? "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                        : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                    title={teacher.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  >
                    {teacher.status === "ACTIVE"
                      ? <ToggleRight size={14} />
                      : <ToggleLeft size={14} />
                    }
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteId(teacher.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete teacher"
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
          label="teachers"
          onPageChange={setPage}
        />
      </div>

      {/* ── Delete Modal ────────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Teacher">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Are you sure?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              This teacher record will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteId)}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      {/* ── Activate / Deactivate Modal ─────────────────────────────────────── */}
      <Modal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={isActivating ? "Activate Teacher" : "Deactivate Teacher"}
      >
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            isActivating ? "bg-emerald-50" : "bg-amber-50"
          }`}>
            {isActivating
              ? <ToggleRight size={18} className="text-emerald-500" />
              : <ToggleLeft  size={18} className="text-amber-500" />
            }
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">
              {isActivating ? "Activate" : "Deactivate"} {toggleTarget?.name}?
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              {isActivating
                ? "This teacher will be marked as Active and can be assigned classes."
                : "This teacher will be marked as Inactive and removed from active assignments."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setToggleTarget(null)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={toggleMutation.isPending}
            onClick={() =>
              toggleMutation.mutate({ id: toggleTarget.id, newStatus: newToggleStatus })
            }
          >
            {toggleMutation.isPending
              ? "Updating..."
              : isActivating ? "Yes, Activate" : "Yes, Deactivate"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}