"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, studentsApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Badge from "../../../../components/ui/Badge";
import { Table, Tr, Td } from "../../../../components/ui/Table";
import {
  GraduationCap, ChevronRight, Users,
  CheckSquare, Square, AlertCircle, CheckCircle,
} from "lucide-react";

const selectCls = "text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [done, setDone] = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", "", fromClassId, "ACTIVE", 1],
    queryFn: () => studentsApi.getAll({ classId: fromClassId, status: "ACTIVE", limit: 200 }),
    enabled: !!fromClassId,
  });

  const students = studentsData?.students || [];

  const promoteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedIds.map(id =>
          studentsApi.update(id, { classId: parseInt(toClassId) })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setDone(true);
      setSelectedIds([]);
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };

  const allSelected = students.length > 0 && selectedIds.length === students.length;
  const fromClass = classesData?.find(c => c.id == fromClassId);
  const toClass = classesData?.find(c => c.id == toClassId);

  const reset = () => {
    setFromClassId("");
    setToClassId("");
    setSelectedIds([]);
    setDone(false);
  };

  return (
    <div className="space-y-5">

      <PageHeader
        title="Student Promotions"
        description="Promote students from one class to the next"
      />

      {/* Success state */}
      {done && (
        <Card>
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <p className="text-[14px] font-semibold text-gray-800">Promotion Successful</p>
            <p className="text-[13px] text-gray-400">
              Students have been promoted to {toClass?.name}
            </p>
            <Button onClick={reset} variant="secondary">Promote Another Batch</Button>
          </div>
        </Card>
      )}

      {!done && (
        <>
          {/* Class selector */}
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-4">Select Classes</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[12px] font-medium text-gray-500">Promote From</label>
                <select
                  value={fromClassId}
                  onChange={e => { setFromClassId(e.target.value); setSelectedIds([]); setDone(false); }}
                  className={selectCls}
                >
                  <option value="">Select current class</option>
                  {classesData?.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center mt-4">
                <ChevronRight size={20} className="text-gray-300" />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[12px] font-medium text-gray-500">Promote To</label>
                <select
                  value={toClassId}
                  onChange={e => setToClassId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select next class</option>
                  {classesData
                    ?.filter(c => c.id != fromClassId)
                    .map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Warning */}
            {fromClassId && toClassId && fromClassId === toClassId && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <p className="text-[12px] text-amber-700">From and To class cannot be the same</p>
              </div>
            )}
          </Card>

          {/* Students table */}
          {fromClassId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-gray-400" />
                  <p className="text-[13px] text-gray-600">
                    <span className="font-semibold">{students.length}</span> active students in {fromClass?.name}
                  </p>
                </div>
                {students.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-1.5 text-[12px] text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              <Table
                columns={["", "Student", "Class", "Section", "Roll No", "Status"]}
                isLoading={isLoading}
                isEmpty={!isLoading && students.length === 0}
                emptyIcon={Users}
                emptyText="No active students in this class"
              >
                {students.map(student => (
                  <Tr key={student.id} onClick={() => toggleSelect(student.id)}>
                    <Td first>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          selectedIds.includes(student.id)
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedIds.includes(student.id) && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 text-[10px] font-semibold">
                            {student.firstName[0]}{student.lastName?.[0] || ""}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-800">
                            {student.firstName} {student.lastName || ""}
                          </p>
                          <p className="text-[11px] text-gray-400">{student.studentId}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{student.class?.name}</Td>
                    <Td>{student.section || "—"}</Td>
                    <Td>{student.rollNumber || "—"}</Td>
                    <Td><Badge status={student.status} /></Td>
                  </Tr>
                ))}
              </Table>

              {/* Promote button */}
              {selectedIds.length > 0 && toClassId && fromClassId !== toClassId && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-indigo-500" />
                    <p className="text-[13px] text-indigo-700">
                      <span className="font-semibold">{selectedIds.length}</span> student{selectedIds.length > 1 ? "s" : ""} selected — promoting from{" "}
                      <span className="font-semibold">{fromClass?.name}</span> to{" "}
                      <span className="font-semibold">{toClass?.name}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => promoteMutation.mutate()}
                    disabled={promoteMutation.isPending}
                    icon={GraduationCap}
                  >
                    {promoteMutation.isPending ? "Promoting..." : "Promote Now"}
                  </Button>
                </div>
              )}

              {/* Reminder if no target class */}
              {selectedIds.length > 0 && !toClassId && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-[12px] text-amber-700">Please select the target class to promote to</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}