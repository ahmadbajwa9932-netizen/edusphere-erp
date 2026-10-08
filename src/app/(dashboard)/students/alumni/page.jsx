"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { studentsApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Badge from "../../../../components/ui/Badge";
import Card from "../../../../components/ui/Card";
import StatCard from "../../../../components/ui/StatCard";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import { Search, GraduationCap, ArrowRightLeft, Eye, Users } from "lucide-react";

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

export default function AlumniPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("GRADUATED");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["alumni", search, status, classId, page],
    queryFn: () => studentsApi.getAll({ search, status, classId, page, limit: 20 }),
  });

  const { data: graduatedData } = useQuery({
    queryKey: ["alumni-count-graduated"],
    queryFn: () => studentsApi.getAll({ status: "GRADUATED", limit: 1 }),
  });

  const { data: transferredData } = useQuery({
    queryKey: ["alumni-count-transferred"],
    queryFn: () => studentsApi.getAll({ status: "TRANSFERRED", limit: 1 }),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const students = data?.students || [];

  return (
    <div className="space-y-5">

      <PageHeader
        title="Alumni"
        description="Records of graduated and transferred students"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Graduated"
          value={graduatedData?.total || 0}
          icon={GraduationCap}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Transferred"
          value={transferredData?.total || 0}
          icon={ArrowRightLeft}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Total Alumni"
          value={(graduatedData?.total || 0) + (transferredData?.total || 0)}
          icon={Users}
          color="bg-emerald-50 text-emerald-600"
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="GRADUATED">Graduated</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="">All Alumni</option>
        </select>
        <select
          value={classId}
          onChange={e => { setClassId(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">All Classes</option>
          {classesData?.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        {(search || classId || status !== "GRADUATED") && (
          <button
            onClick={() => { setSearch(""); setClassId(""); setStatus("GRADUATED"); setPage(1); }}
            className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={["Student", "ID", "Last Class", "Father Name", "Contact", "Status", "Actions"]}
          isLoading={isLoading}
          isEmpty={!isLoading && students.length === 0}
          emptyIcon={GraduationCap}
          emptyText="No alumni records found"
          emptySubtext="Graduated or transferred students will appear here"
        >
          {students.map(student => (
            <Tr key={student.id}>
              <Td first>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[10px] font-semibold">
                      {student.firstName[0]}{student.lastName?.[0] || ""}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">
                      {student.firstName} {student.lastName || ""}
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
              <Td><Badge status={student.status} /></Td>
              <Td>
                <Link
                  href={`/students/${student.id}`}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Eye size={14} />
                </Link>
              </Td>
            </Tr>
          ))}
        </Table>

        <TableFooter
          page={page}
          totalPages={data?.totalPages}
          total={data?.total}
          label="alumni"
          onPageChange={setPage}
        />
      </div>

    </div>
  );
}