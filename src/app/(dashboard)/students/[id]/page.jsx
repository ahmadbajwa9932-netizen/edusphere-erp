"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { studentsApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Badge from "../../../../components/ui/Badge";
import {
  ChevronLeft, Pencil, User, Users, BookOpen,
  Phone, MapPin, Calendar, Droplet, Flag,
  GraduationCap, Hash, Clock,
} from "lucide-react";

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

export default function StudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.getOne(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + j * 12}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-[14px] text-gray-400">Student not found</p>
        <Button variant="secondary" onClick={() => router.push("/students")}>
          Back to Students
        </Button>
      </div>
    );
  }

  const admissionDate = student.admissionDate
    ? new Date(student.admissionDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const dob = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Student Profile" description="Full student record and details">
        <Link href="/students">
          <Button variant="secondary" icon={ChevronLeft}>Back</Button>
        </Link>
        <Link href={`/students/${id}/edit`}>
          <Button icon={Pencil}>Edit Student</Button>
        </Link>
      </PageHeader>

      {/* Top profile card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-indigo-600 text-xl font-bold">
              {student.firstName[0]}{student.lastName?.[0] || ""}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-[16px] font-semibold text-gray-800">
                {student.firstName} {student.lastName}
              </h2>
              <Badge status={student.status} />
              <Badge status={student.gender} />
            </div>
            <p className="text-[12px] text-gray-400 mt-1">
              {student.class?.name} &nbsp;·&nbsp; Section {student.section}
              {student.rollNumber && <>&nbsp;·&nbsp; Roll # {student.rollNumber}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">Student ID</p>
            <p className="text-[14px] font-mono font-semibold text-gray-700">{student.studentId}</p>
            <p className="text-[11px] text-gray-400 mt-1">Admitted</p>
            <p className="text-[12px] text-gray-600">{admissionDate}</p>
          </div>
        </div>
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Personal Info */}
        <Section title="Personal Information" icon={User}>
          <InfoRow label="Full Name" value={`${student.firstName} ${student.lastName || ""}`} icon={User} />
          <InfoRow label="Date of Birth" value={dob} icon={Calendar} />
          <InfoRow label="Age" value={student.age ? `${student.age} years` : "—"} icon={Clock} />
          <InfoRow label="Gender" value={student.gender} icon={User} />
          <InfoRow label="Blood Group" value={student.bloodGroup} icon={Droplet} />
          <InfoRow label="Religion" value={student.religion} icon={Flag} />
          <InfoRow label="Nationality" value={student.nationality} icon={Flag} />
          <InfoRow label="Phone" value={student.phone} icon={Phone} />
          <InfoRow label="Email" value={student.email} icon={Phone} />
        </Section>

        {/* Address & Guardian */}
        <Section title="Address & Guardian" icon={Users}>
          <InfoRow label="City" value={student.city} icon={MapPin} />
          <InfoRow label="Address" value={student.address} icon={MapPin} />
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Guardian</p>
            <InfoRow label="Name" value={student.guardianName} icon={Users} />
            <InfoRow label="Phone" value={student.guardianPhone} icon={Phone} />
            <InfoRow label="Relation" value={student.guardianRelation} icon={Users} />
            <InfoRow label="CNIC" value={student.guardianCnic} icon={Hash} />
            <InfoRow label="Father Name" value={student.fatherName} icon={Users} />
            <InfoRow label="Mother Name" value={student.motherName} icon={Users} />
          </div>
        </Section>

        {/* Academic Info */}
        <Section title="Academic Information" icon={GraduationCap}>
          <InfoRow label="Class" value={student.class?.name} icon={BookOpen} />
          <InfoRow label="Section" value={student.section} icon={BookOpen} />
          <InfoRow label="Roll Number" value={student.rollNumber} icon={Hash} />
          <InfoRow label="Admission Date" value={admissionDate} icon={Calendar} />
          <InfoRow label="Status" value={student.status} icon={GraduationCap} />
        </Section>

      </div>

    </div>
  );
}