"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { studentsApi, classesApi } from "../../../lib/api";
import StatCard from "../../../components/ui/StatCard";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import PageHeader from "../../../components/ui/PageHeader";
import Modal from "../../../components/ui/Modal";
import { Table, Tr, Td, TableFooter } from "../../../components/ui/Table";
import {
  Search, Plus, Eye, Pencil, Trash2,
  Users, UserCheck, UserX, GraduationCap,
} from "lucide-react";

const COLUMNS = ["Student", "ID", "Class", "Father Name", "Contact", "Status", "Actions"];

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["students", search, classId, status, page],
    queryFn: () => studentsApi.getAll({ search, classId, status, page, limit: 20 }),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Students" description="Manage and view all student records">
        <Link href="/students/enroll">
          <Button icon={Plus}>Enroll Student</Button>
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={data?.total || 0}
          icon={Users}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Active"
          value={data?.students?.filter(s => s.status === "ACTIVE").length || 0}
          icon={UserCheck}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Inactive"
          value={data?.students?.filter(s => s.status === "INACTIVE").length || 0}
          icon={UserX}
          color="bg-red-50 text-red-500"
        />
        <StatCard
          label="Total Classes"
          value={classesData?.length || 0}
          icon={GraduationCap}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search name, ID, father name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Classes</option>
          {classesData?.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="GRADUATED">Graduated</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        {(search || classId || status) && (
          <button
            onClick={() => { setSearch(""); setClassId(""); setStatus(""); setPage(1); }}
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
          isEmpty={!isLoading && data?.students?.length === 0}
          emptyIcon={Users}
          emptyText="No students found"
          emptySubtext="Enroll a student to get started"
        >
          {data?.students?.map((student) => (
            <Tr key={student.id}>
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[10px] font-semibold">
                    {student.firstName?.[0] || "?"}{student.lastName?.[0] || ""}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-[11px] text-gray-400">{student.city}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <span className="font-mono text-[12px] text-gray-500">{student.studentId}</span>
              </Td>
              <Td>
                <span className="text-gray-700">{student.class?.name}</span>
                {student.section && (
                  <span className="text-[11px] text-gray-400 ml-1">· {student.section}</span>
                )}
              </Td>
              <Td>{student.fatherName}</Td>
              <Td>{student.guardianPhone}</Td>
              <Td>
                <Badge status={student.status} />
              </Td>
              <Td>
                <div className="flex items-center gap-0.5">
                  <Link
                    href={`/students/${student.id}`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Eye size={14} />
                  </Link>
                  <Link
                    href={`/students/${student.id}/edit`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => setDeleteId(student.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
          label="students"
          onPageChange={setPage}
        />
      </div>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Student">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Are you sure?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              This student record will be permanently deleted.
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

    </div>
  );
}