"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { staffApi } from "../../../lib/api";
import StatCard from "../../../components/ui/StatCard";
import Button from "../../../components/ui/Button";
import PageHeader from "../../../components/ui/PageHeader";
import Modal from "../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../components/ui/Table";
import {
  Search, Plus, Eye, Pencil, Trash2,
  Users, UserCheck, UserX, Briefcase,
  ToggleLeft, ToggleRight, Clock,
} from "lucide-react";

const COLUMNS = [
  "Staff Member", "Employee ID", "Designation", "Department",
  "Phone", "Duty Hours", "Type", "Status", "Actions",
];

const STATUS_LABEL = {
  ACTIVE: "Active", INACTIVE: "Inactive",
  ON_LEAVE: "On Leave", TERMINATED: "Terminated",
};
const STATUS_COLOR = {
  ACTIVE:     "bg-emerald-50 text-emerald-600",
  INACTIVE:   "bg-gray-100 text-gray-500",
  ON_LEAVE:   "bg-amber-50 text-amber-600",
  TERMINATED: "bg-red-50 text-red-500",
};
const TYPE_LABEL = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time", CONTRACT: "Contract",
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

const selectCls =
  "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

export default function StaffPage() {
  const queryClient = useQueryClient();

  const [search,         setSearch]         = useState("");
  const [department,     setDepartment]     = useState("");
  const [status,         setStatus]         = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [page,           setPage]           = useState(1);

  const [deleteId,      setDeleteId]      = useState(null);
  const [toggleTarget,  setToggleTarget]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff", search, department, status, employmentType, page],
    queryFn: () =>
      staffApi.getAll({ search, department, status, employmentType, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => staffApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDeleteId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, newStatus }) => staffApi.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setToggleTarget(null);
    },
  });

  const clearFilters = () => {
    setSearch(""); setDepartment(""); setStatus(""); setEmploymentType(""); setPage(1);
  };
  const hasFilters = search || department || status || employmentType;

  const activeCount   = data?.staff?.filter((s) => s.status === "ACTIVE").length   || 0;
  const inactiveCount = data?.staff?.filter((s) => s.status !== "ACTIVE").length   || 0;
  const fullTimeCount = data?.staff?.filter((s) => s.employmentType === "FULL_TIME").length || 0;

  const isActivating   = toggleTarget?.currentStatus !== "ACTIVE";
  const newToggleStatus = isActivating ? "ACTIVE" : "INACTIVE";

  return (
    <div className="space-y-5">

      <PageHeader title="Staff" description="Manage all non-teaching staff records">
        <Link href="/staff/add">
          <Button icon={Plus}>Add Staff</Button>
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Staff"     value={data?.total      || 0} icon={Users}     color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Active"          value={activeCount}           icon={UserCheck}  color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Inactive / Leave" value={inactiveCount}        icon={UserX}      color="bg-red-50 text-red-500" />
        <StatCard label="Full Time"       value={fullTimeCount}         icon={Briefcase}  color="bg-purple-50 text-purple-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
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

        <input
          type="text"
          placeholder="Filter by department..."
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className={`${selectCls} min-w-[160px]`}
        />

        <select value={employmentType} onChange={(e) => { setEmploymentType(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Types</option>
          <option value="FULL_TIME">Full Time</option>
          <option value="PART_TIME">Part Time</option>
          <option value="CONTRACT">Contract</option>
        </select>

        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && data?.staff?.length === 0}
          emptyIcon={Users}
          emptyText="No staff found"
          emptySubtext="Add a staff member to get started"
        >
          {data?.staff?.map((member) => (
            <Tr key={member.id}>

              {/* Name */}
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-violet-600 text-[10px] font-semibold">
                      {member.firstName[0]}{member.lastName?.[0] || ""}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-[11px] text-gray-400">{member.city}</p>
                  </div>
                </div>
              </Td>

              <Td><span className="font-mono text-[12px] text-gray-500">{member.employeeId}</span></Td>
              <Td><span className="text-[13px] text-gray-700">{member.designation}</span></Td>
              <Td><span className="text-[13px] text-gray-500">{member.department || "—"}</span></Td>
              <Td><span className="text-[13px] text-gray-600">{member.phone}</span></Td>

              {/* Duty Hours */}
              <Td>
                {member.dutyStartTime && member.dutyEndTime ? (
                  <div className="flex items-center gap-1 text-[12px] text-gray-500">
                    <Clock size={11} className="text-gray-300" />
                    {formatTime(member.dutyStartTime)} – {formatTime(member.dutyEndTime)}
                  </div>
                ) : (
                  <span className="text-[12px] text-gray-300">—</span>
                )}
              </Td>

              <Td>
                <Chip
                  label={TYPE_LABEL[member.employmentType] || member.employmentType}
                  colorCls={TYPE_COLOR[member.employmentType] || "bg-gray-100 text-gray-500"}
                />
              </Td>
              <Td>
                <Chip
                  label={STATUS_LABEL[member.status] || member.status}
                  colorCls={STATUS_COLOR[member.status] || "bg-gray-100 text-gray-500"}
                />
              </Td>

              {/* Actions */}
              <Td>
                <div className="flex items-center gap-0.5">
                  <Link
                    href={`/staff/${member.id}`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="View profile"
                  >
                    <Eye size={14} />
                  </Link>
                  <Link
                    href={`/staff/${member.id}/edit`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() =>
                      setToggleTarget({
                        id: member.id,
                        currentStatus: member.status,
                        name: `${member.firstName} ${member.lastName || ""}`.trim(),
                      })
                    }
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      member.status === "ACTIVE"
                        ? "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                        : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                    title={member.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  >
                    {member.status === "ACTIVE" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button
                    onClick={() => setDeleteId(member.id)}
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
          label="staff members"
          onPageChange={setPage}
        />
      </div>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Staff Member">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Are you sure?</p>
            <p className="text-[12px] text-gray-400 mt-1">This staff record will be permanently deleted.</p>
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
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      {/* Activate / Deactivate Modal */}
      <Modal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={isActivating ? "Activate Staff Member" : "Deactivate Staff Member"}
      >
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isActivating ? "bg-emerald-50" : "bg-amber-50"}`}>
            {isActivating
              ? <ToggleRight size={18} className="text-emerald-500" />
              : <ToggleLeft  size={18} className="text-amber-500" />}
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">
              {isActivating ? "Activate" : "Deactivate"} {toggleTarget?.name}?
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              {isActivating
                ? "This staff member will be marked as Active."
                : "This staff member will be marked as Inactive."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setToggleTarget(null)}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate({ id: toggleTarget.id, newStatus: newToggleStatus })}
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