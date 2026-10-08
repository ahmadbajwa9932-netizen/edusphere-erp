"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { staffApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import {
  Pencil, ArrowLeft, Phone, Mail, MapPin, Calendar,
  Briefcase, Clock, User, Shield,
} from "lucide-react";

const STATUS_COLOR = {
  ACTIVE:     "bg-emerald-50 text-emerald-600 border-emerald-100",
  INACTIVE:   "bg-gray-100 text-gray-500 border-gray-200",
  ON_LEAVE:   "bg-amber-50 text-amber-600 border-amber-100",
  TERMINATED: "bg-red-50 text-red-500 border-red-100",
};
const STATUS_LABEL = {
  ACTIVE: "Active", INACTIVE: "Inactive",
  ON_LEAVE: "On Leave", TERMINATED: "Terminated",
};
const TYPE_LABEL = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time", CONTRACT: "Contract",
};

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide font-medium text-gray-400">{label}</p>
        <p className="text-[13px] text-gray-700 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-[13px] font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
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

export default function StaffProfilePage() {
  const { id }  = useParams();
  const router  = useRouter();

  const { data: member, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffApi.getOne(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20 text-gray-400 text-[13px]">
        Staff member not found.
      </div>
    );
  }

  const fullName = `${member.firstName} ${member.lastName || ""}`.trim();
  const initials = `${member.firstName[0]}${member.lastName?.[0] || ""}`;

  return (
<div className="space-y-5 max-w-7xl mx-auto px-4">

      <PageHeader title="Staff Profile" description={`Viewing profile of ${fullName}`}>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/staff")}>
            Back
          </Button>
          <Link href={`/staff/${id}/edit`}>
            <Button icon={Pencil}>Edit Profile</Button>
          </Link>
        </div>
      </PageHeader>

      {/* Hero Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[18px] font-bold text-gray-900">{fullName}</h2>
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[member.status]}`}>
              {STATUS_LABEL[member.status]}
            </span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">{member.designation}</p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-[12px] text-gray-400 font-mono">{member.employeeId}</span>
            {member.department && (
              <span className="text-[12px] text-gray-400">{member.department}</span>
            )}
            <span className="text-[12px] text-indigo-500 font-medium">
              {TYPE_LABEL[member.employmentType]}
            </span>
          </div>
        </div>
        {member.dutyStartTime && member.dutyEndTime && (
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Duty Hours</p>
            <p className="text-[14px] font-semibold text-gray-700 mt-1">
            {formatTime(member.dutyStartTime)} – {formatTime(member.dutyEndTime)}
            </p>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card title="Personal Information">
          <InfoRow icon={User}     label="Full Name"    value={fullName} />
          <InfoRow icon={Calendar} label="Date of Birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" }) : null} />
          <InfoRow icon={User}     label="Age"          value={member.age ? `${member.age} years` : null} />
          <InfoRow icon={User}     label="Gender"       value={member.gender === "MALE" ? "Male" : "Female"} />
          <InfoRow icon={Shield}   label="Religion"     value={member.religion} />
          <InfoRow icon={User}     label="Nationality"  value={member.nationality} />
          <InfoRow icon={Shield}   label="Blood Group"  value={member.bloodGroup} />
        </Card>

        <Card title="Contact Information">
          <InfoRow icon={Phone}  label="Phone"           value={member.phone} />
          <InfoRow icon={Phone}  label="Emergency Phone" value={member.emergencyPhone} />
          <InfoRow icon={Mail}   label="Email"           value={member.email} />
          <InfoRow icon={MapPin} label="City"            value={member.city} />
          <InfoRow icon={MapPin} label="Address"         value={member.address} />
        </Card>

        <Card title="Employment Details">
          <InfoRow icon={Briefcase} label="Designation"      value={member.designation} />
          <InfoRow icon={Briefcase} label="Department"       value={member.department} />
          <InfoRow icon={Briefcase} label="Role / Category"  value={member.role} />
          <InfoRow icon={Briefcase} label="Employment Type"  value={TYPE_LABEL[member.employmentType]} />
          <InfoRow icon={Briefcase} label="Qualification"    value={member.qualification} />
          <InfoRow icon={Briefcase} label="Experience"       value={member.experience ? `${member.experience} years` : null} />
          <InfoRow icon={Calendar}  label="Join Date"        value={member.joinDate ? new Date(member.joinDate).toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" }) : null} />
          {member.salary && (
            <InfoRow icon={Briefcase} label="Monthly Salary" value={`PKR ${Number(member.salary).toLocaleString()}`} />
          )}
        </Card>

        <Card title="Duty Hours">
          <InfoRow icon={Clock} label="Duty Start Time" value={formatTime(member.dutyStartTime)} />
          <InfoRow icon={Clock} label="Duty End Time"   value={formatTime(member.dutyEndTime)} />
          {member.dutyStartTime && member.dutyEndTime && (() => {
            const [sh, sm] = member.dutyStartTime.split(":").map(Number);
            const [eh, em] = member.dutyEndTime.split(":").map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins > 0) {
              const h = Math.floor(mins / 60), m = mins % 60;
              return <InfoRow icon={Clock} label="Total Duty Hours" value={`${h}h ${m > 0 ? m + "m" : ""}`} />;
            }
            return null;
          })()}
        </Card>

      </div>
    </div>
  );
}