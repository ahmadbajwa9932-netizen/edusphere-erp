"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { staffApi } from "../../../../../lib/api";
import PageHeader from "../../../../../components/ui/PageHeader";
import Button from "../../../../../components/ui/Button";
import { Save, X, User, Phone, Briefcase, Clock } from "lucide-react";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
        <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
          <Icon size={13} className="text-indigo-500" />
        </div>
        <h3 className="text-[13px] font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, span, children }) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : span === 3 ? "sm:col-span-2 lg:col-span-3" : ""}>
      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300 text-gray-700";

const selectCls =
  "w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-700 bg-white";

function calcAge(dob) {
  if (!dob) return "";
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : "";
}

function fmt(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export default function EditStaffPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const [form, setForm] = useState(null);

  const { data: member, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffApi.getOne(id),
  });

  useEffect(() => {
    if (member) {
      setForm({
        employeeId:     member.employeeId     || "",
        firstName:      member.firstName      || "",
        lastName:       member.lastName       || "",
        dateOfBirth:    fmt(member.dateOfBirth),
        age:            member.age            || "",
        gender:         member.gender         || "",
        religion:       member.religion       || "",
        nationality:    member.nationality    || "Pakistani",
        bloodGroup:     member.bloodGroup     || "",
        phone:          member.phone          || "",
        emergencyPhone: member.emergencyPhone || "",
        email:          member.email          || "",
        city:           member.city           || "",
        address:        member.address        || "",
        designation:    member.designation    || "",
        department:     member.department     || "",
        role:           member.role           || "",
        qualification:  member.qualification  || "",
        experience:     member.experience     ?? 0,
        joinDate:       fmt(member.joinDate),
        dutyStartTime:  member.dutyStartTime  || "",
        dutyEndTime:    member.dutyEndTime    || "",
        employmentType: member.employmentType || "FULL_TIME",
        status:         member.status         || "ACTIVE",
        salary:         member.salary         || "",
      });
    }
  }, [member]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleDOB = (val) => {
    setForm((p) => ({ ...p, dateOfBirth: val, age: calcAge(val) }));
  };

  const mutation = useMutation({
    mutationFn: (data) => staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      router.push(`/staff/${id}`);
    },
    onError: (err) =>
      setError(err?.response?.data?.error || "Failed to update staff member"),
  });

  const handleSubmit = () => {
    setError("");
    const required = ["firstName", "dateOfBirth", "gender",
                       "phone", "city", "address", "designation", "joinDate"];
    const missing = required.filter((k) => !form[k]);
    if (missing.length) { setError("Please fill all required fields."); return; }
    mutation.mutate(form);
  };

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
<div className="space-y-5 max-w-7xl mx-auto px-4">

      <PageHeader title="Edit Staff Member" description="Update staff information">
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={X} onClick={() => router.push(`/staff/${id}`)}>
            Cancel
          </Button>
          <Button icon={Save} disabled={mutation.isPending} onClick={handleSubmit}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Personal Information */}
      <Section title="Personal Information" icon={User}>
        <Field label="Employee ID" required>
          <input className={`${inputCls} bg-gray-50 cursor-not-allowed`}
            value={form.employeeId} readOnly />
        </Field>
        <Field label="First Name" required>
          <input className={inputCls} placeholder="First name"
            value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last Name">
          <input className={inputCls} placeholder="Last name"
            value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Date of Birth" required>
          <input type="date" className={inputCls}
            value={form.dateOfBirth} onChange={(e) => handleDOB(e.target.value)} />
        </Field>
        <Field label="Age">
          <input className={inputCls} readOnly value={form.age} />
        </Field>
        <Field label="Gender" required>
          <select className={selectCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </Field>
        <Field label="Religion">
          <input className={inputCls} value={form.religion} onChange={(e) => set("religion", e.target.value)} />
        </Field>
        <Field label="Nationality">
          <input className={inputCls} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field label="Blood Group">
          <input className={inputCls} placeholder="e.g. O+" value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} />
        </Field>
      </Section>

      {/* Contact */}
      <Section title="Contact Information" icon={Phone}>
        <Field label="Phone" required>
          <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Emergency Phone">
          <input className={inputCls} value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="City" required>
          <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Address" required span={2}>
          <input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </Section>

      {/* Employment */}
      <Section title="Employment Details" icon={Briefcase}>
        <Field label="Designation" required>
          <input className={inputCls} value={form.designation} onChange={(e) => set("designation", e.target.value)} />
        </Field>
        <Field label="Department">
          <input className={inputCls} value={form.department} onChange={(e) => set("department", e.target.value)} />
        </Field>
        <Field label="Role / Category">
          <input className={inputCls} value={form.role} onChange={(e) => set("role", e.target.value)} />
        </Field>
        <Field label="Qualification">
          <input className={inputCls} value={form.qualification} onChange={(e) => set("qualification", e.target.value)} />
        </Field>
        <Field label="Experience (years)">
          <input type="number" min="0" className={inputCls} value={form.experience} onChange={(e) => set("experience", e.target.value)} />
        </Field>
        <Field label="Join Date" required>
          <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
        </Field>
        <Field label="Employment Type">
          <select className={selectCls} value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </Field>
        <Field label="Monthly Salary (PKR)">
          <input type="number" min="0" className={inputCls} value={form.salary} onChange={(e) => set("salary", e.target.value)} />
        </Field>
      </Section>

      {/* Duty Hours */}
      <Section title="Duty Hours" icon={Clock}>
        <Field label="Duty Start Time">
          <input type="time" className={inputCls} value={form.dutyStartTime} onChange={(e) => set("dutyStartTime", e.target.value)} />
        </Field>
        <Field label="Duty End Time">
          <input type="time" className={inputCls} value={form.dutyEndTime} onChange={(e) => set("dutyEndTime", e.target.value)} />
        </Field>
      </Section>

    </div>
  );
}