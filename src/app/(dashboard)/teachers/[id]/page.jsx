"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { teachersApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Badge from "../../../../components/ui/Badge";
import Modal from "../../../../components/ui/Modal";
import {
  ChevronLeft, Pencil, User, Briefcase, Building2,
  Phone, MapPin, Calendar, BookOpen, Hash,
  Clock, GraduationCap, Trash2, ToggleLeft, ToggleRight,
  Banknote, PhoneCall,
} from "lucide-react";

// ─── Shared sub-components ────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-gray-300 shrink-0 mt-0.5" />}
        <span className="text-[12px] text-gray-400">{label}</span>
      </div>
      <span className="text-[13px] text-gray-700 font-medium text-right max-w-[60%]">
        {value || "—"}
      </span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-50">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon size={14} className="text-indigo-500" />
        </div>
        <p className="text-[13px] font-semibold text-gray-700">{title}</p>
      </div>
      {children}
    </Card>
  );
}

// ─── Status chip (for types not in Badge) ─────────────────────────────────────
const TYPE_LABEL = { FULL_TIME: "Full Time", PART_TIME: "Part Time", CONTRACT: "Contract" };
const TYPE_COLOR = {
  FULL_TIME: "bg-indigo-50 text-indigo-600 border border-indigo-100",
  PART_TIME: "bg-purple-50 text-purple-600 border border-purple-100",
  CONTRACT:  "bg-orange-50 text-orange-600 border border-orange-100",
};

// Badge doesn't know ON_LEAVE / TERMINATED so we extend here
const EXTRA_STATUS = {
  ON_LEAVE:   "bg-amber-50 text-amber-700 border border-amber-100",
  TERMINATED: "bg-red-50 text-red-600 border border-red-100",
};
const EXTRA_LABEL = { ON_LEAVE: "On Leave", TERMINATED: "Terminated" };

function StatusBadge({ status }) {
  if (EXTRA_STATUS[status]) {
    return (
      <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${EXTRA_STATUS[status]}`}>
        {EXTRA_LABEL[status]}
      </span>
    );
  }
  return <Badge status={status} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeacherProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [toggleOpen, setToggleOpen]   = useState(false);

  const { data: teacher, isLoading, isError } = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => teachersApi.getOne(id),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => teachersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      router.push("/teachers");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (newStatus) => teachersApi.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      setToggleOpen(false);
    },
  });

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-100 p-5 h-24 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + j * 10}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-[14px] text-gray-400">Teacher not found</p>
        <Button variant="secondary" onClick={() => router.push("/teachers")}>
          Back to Teachers
        </Button>
      </div>
    );
  }

  const isActive     = teacher.status === "ACTIVE";
  const joinDate     = teacher.joinDate
    ? new Date(teacher.joinDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const dob          = teacher.dateOfBirth
    ? new Date(teacher.dateOfBirth).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Teacher Profile" description="Full teacher record and details">
        <Link href="/teachers">
          <Button variant="secondary" icon={ChevronLeft}>Back</Button>
        </Link>
        <Button
          variant={isActive ? "secondary" : "secondary"}
          icon={isActive ? ToggleRight : ToggleLeft}
          onClick={() => setToggleOpen(true)}
        >
          {isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
        <Link href={`/teachers/${id}/edit`}>
          <Button icon={Pencil}>Edit Teacher</Button>
        </Link>
      </PageHeader>

      {/* Top profile card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-indigo-600 text-xl font-bold">
              {teacher.firstName[0]}{teacher.lastName?.[0] || ""}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-[16px] font-semibold text-gray-800">
                {teacher.firstName} {teacher.lastName}
              </h2>
              <StatusBadge status={teacher.status} />
              <Badge status={teacher.gender} />
              <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${TYPE_COLOR[teacher.employmentType] || "bg-gray-50 text-gray-500 border border-gray-100"}`}>
                {TYPE_LABEL[teacher.employmentType] || teacher.employmentType}
              </span>
            </div>
            <p className="text-[12px] text-gray-400 mt-1">
              {teacher.designation}&nbsp;·&nbsp;{teacher.department}
              {teacher.specialization && <>&nbsp;·&nbsp;{teacher.specialization}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">Employee ID</p>
            <p className="text-[14px] font-mono font-semibold text-gray-700">{teacher.employeeId}</p>
            <p className="text-[11px] text-gray-400 mt-1">Joined</p>
            <p className="text-[12px] text-gray-600">{joinDate}</p>
          </div>
        </div>
      </Card>

      {/* Info grid — row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Personal */}
        <Section title="Personal Information" icon={User}>
          <InfoRow label="Full Name"    value={`${teacher.firstName} ${teacher.lastName || ""}`.trim()} icon={User} />
          <InfoRow label="Date of Birth" value={dob}                          icon={Calendar} />
          <InfoRow label="Age"           value={teacher.age ? `${teacher.age} years` : "—"}  icon={Clock} />
          <InfoRow label="Gender"        value={teacher.gender}                icon={User} />
          <InfoRow label="Religion"      value={teacher.religion}              icon={User} />
          <InfoRow label="Nationality"   value={teacher.nationality}           icon={User} />
        </Section>

        {/* Contact */}
        <Section title="Contact & Address" icon={Phone}>
          <InfoRow label="Phone"           value={teacher.phone}          icon={Phone} />
          <InfoRow label="Emergency Phone" value={teacher.emergencyPhone} icon={PhoneCall} />
          <InfoRow label="Email"           value={teacher.email}          icon={Phone} />
          <InfoRow label="City"            value={teacher.city}           icon={MapPin} />
          <InfoRow label="Address"         value={teacher.address}        icon={MapPin} />
        </Section>

        {/* Professional */}
        <Section title="Professional Info" icon={Briefcase}>
          <InfoRow label="Designation"    value={teacher.designation}    icon={Briefcase} />
          <InfoRow label="Department"     value={teacher.department}     icon={Building2} />
          <InfoRow label="Qualification"  value={teacher.qualification}  icon={GraduationCap} />
          <InfoRow label="Specialization" value={teacher.specialization} icon={BookOpen} />
          <InfoRow label="Experience"     value={teacher.experience != null ? `${teacher.experience} years` : "—"} icon={Clock} />
          <InfoRow label="Join Date"      value={joinDate}               icon={Calendar} />
        </Section>

      </div>

      {/* Info grid — row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Employment */}
        <Section title="Employment Details" icon={Building2}>
          <InfoRow label="Employment Type" value={TYPE_LABEL[teacher.employmentType] || teacher.employmentType} icon={Briefcase} />
          <InfoRow label="Status"          value={EXTRA_LABEL[teacher.status] || teacher.status}                icon={Hash} />
          <InfoRow
            label="Monthly Salary"
            value={teacher.salary ? `PKR ${Number(teacher.salary).toLocaleString()}` : "—"}
            icon={Banknote}
          />
        </Section>

        {/* Class Assignments */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-50">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BookOpen size={14} className="text-indigo-500" />
              </div>
              <p className="text-[13px] font-semibold text-gray-700">Class Assignments</p>
            </div>

            {teacher.classes?.length > 0 ? (
              <div className="space-y-2">
                {teacher.classes.map((tc) => (
                  <div
                    key={tc.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                        <BookOpen size={11} className="text-indigo-500" />
                      </div>
                      <span className="text-[13px] font-medium text-gray-700">{tc.class?.name}</span>
                    </div>
                    <span className="text-[12px] text-gray-500 bg-white border border-gray-100 px-2.5 py-1 rounded-md">
                      {tc.subject}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 gap-2 text-center">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                  <BookOpen size={15} className="text-gray-300" />
                </div>
                <p className="text-[12px] text-gray-400">No class assignments yet</p>
                <Link href={`/teachers/${id}/edit`} className="text-[12px] text-indigo-500 hover:underline">
                  Add assignments
                </Link>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* ── Delete Modal ──────────────────────────────────────────────────────── */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Teacher">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete {teacher.firstName} {teacher.lastName}?</p>
            <p className="text-[12px] text-gray-400 mt-1">
              This teacher record will be permanently deleted and cannot be recovered.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

      {/* ── Activate / Deactivate Modal ───────────────────────────────────────── */}
      <Modal
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        title={isActive ? "Deactivate Teacher" : "Activate Teacher"}
      >
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isActive ? "bg-amber-50" : "bg-emerald-50"}`}>
            {isActive
              ? <ToggleLeft  size={18} className="text-amber-500" />
              : <ToggleRight size={18} className="text-emerald-500" />
            }
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">
              {isActive ? "Deactivate" : "Activate"} {teacher.firstName} {teacher.lastName}?
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              {isActive
                ? "Teacher will be marked Inactive and removed from active assignments."
                : "Teacher will be marked Active and can be assigned classes again."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setToggleOpen(false)}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate(isActive ? "INACTIVE" : "ACTIVE")}
          >
            {toggleMutation.isPending ? "Updating..." : isActive ? "Yes, Deactivate" : "Yes, Activate"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}