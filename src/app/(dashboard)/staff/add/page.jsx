"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { staffApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import { Save, X, User, Phone, Briefcase, Clock, RefreshCw } from "lucide-react";

// ── Reusable field components ────────────────────────────────────────────────
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

// ── Auto-generate Employee ID ─────────────────────────────────────────────────
// Format: STF-YYYYMMDD-XXXX  (e.g. STF-20250506-4821)
function generateEmployeeId() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  const rand  = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `STF-${year}${month}${day}-${rand}`;
}

// ── Auto-calculate age from DOB ───────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return "";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : "";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddStaffPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    employeeId: "", firstName: "", lastName: "",
    dateOfBirth: "", age: "", gender: "",
    religion: "", nationality: "Pakistani", bloodGroup: "",
    phone: "", emergencyPhone: "", email: "", city: "", address: "",
    designation: "", department: "", role: "",
    qualification: "", experience: "0", joinDate: "",
    dutyStartTime: "", dutyEndTime: "",
    employmentType: "FULL_TIME", status: "ACTIVE", salary: "",
  });

  // Auto-generate ID on first mount
  useEffect(() => {
    setForm((p) => ({ ...p, employeeId: generateEmployeeId() }));
  }, []);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleDOB = (val) => {
    setForm((p) => ({ ...p, dateOfBirth: val, age: calcAge(val) }));
  };

  const regenerateId = () => {
    setForm((p) => ({ ...p, employeeId: generateEmployeeId() }));
  };

  const mutation = useMutation({
    mutationFn: (data) => staffApi.create(data),
    onSuccess: () => router.push("/staff"),
    onError: (err) =>
      setError(err?.response?.data?.error || "Failed to create staff member"),
  });

  const handleSubmit = () => {
    setError("");
    const required = ["employeeId", "firstName", "dateOfBirth", "gender",
                       "phone", "city", "address", "designation", "joinDate"];
    const missing = required.filter((k) => !form[k]);
    if (missing.length) {
      setError("Please fill all required fields.");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="space-y-5 w-full px-4">

      <PageHeader title="Add Staff Member" description="Fill in the details to register a new staff member">
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={X} onClick={() => router.push("/staff")}>
            Cancel
          </Button>
          <Button icon={Save} disabled={mutation.isPending} onClick={handleSubmit}>
            {mutation.isPending ? "Saving..." : "Save Staff"}
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

        {/* Employee ID — auto-filled, fully editable, with regenerate button */}
        <Field label="Employee ID" required>
          <div className="flex items-center gap-2">
            <input
              className={inputCls}
              placeholder="Auto-generated"
              value={form.employeeId}
              onChange={(e) => set("employeeId", e.target.value)}
            />
            <button
              type="button"
              onClick={regenerateId}
              title="Generate a new ID"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Auto-generated on load. Edit freely or click the refresh icon for a new one.
          </p>
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
          <input className={inputCls} placeholder="Auto-calculated" readOnly
            value={form.age} />
        </Field>
        <Field label="Gender" required>
          <select className={selectCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </Field>
        <Field label="Religion">
          <input className={inputCls} placeholder="e.g. Islam"
            value={form.religion} onChange={(e) => set("religion", e.target.value)} />
        </Field>
        <Field label="Nationality">
          <input className={inputCls}
            value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field label="Blood Group">
          <input className={inputCls} placeholder="e.g. O+"
            value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} />
        </Field>
      </Section>

      {/* Contact Information */}
      <Section title="Contact Information" icon={Phone}>
        <Field label="Phone" required>
          <input className={inputCls} placeholder="e.g. 0300-1234567"
            value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Emergency Phone">
          <input className={inputCls} placeholder="Emergency contact"
            value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} placeholder="email@example.com"
            value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="City" required>
          <input className={inputCls} placeholder="City"
            value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Address" required span={2}>
          <input className={inputCls} placeholder="Full address"
            value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </Section>

      {/* Employment Details */}
      <Section title="Employment Details" icon={Briefcase}>
        <Field label="Designation" required>
          <input className={inputCls} placeholder="e.g. Peon, Guard, Clerk"
            value={form.designation} onChange={(e) => set("designation", e.target.value)} />
        </Field>
        <Field label="Department">
          <input className={inputCls} placeholder="e.g. Admin, Security"
            value={form.department} onChange={(e) => set("department", e.target.value)} />
        </Field>
        <Field label="Role / Category">
          <input className={inputCls} placeholder="e.g. Administrative, Support"
            value={form.role} onChange={(e) => set("role", e.target.value)} />
        </Field>
        <Field label="Qualification">
          <input className={inputCls} placeholder="e.g. Matric, FA, BA"
            value={form.qualification} onChange={(e) => set("qualification", e.target.value)} />
        </Field>
        <Field label="Experience (years)">
          <input type="number" min="0" className={inputCls} placeholder="0"
            value={form.experience} onChange={(e) => set("experience", e.target.value)} />
        </Field>
        <Field label="Join Date" required>
          <input type="date" className={inputCls}
            value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
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
          <input type="number" min="0" className={inputCls} placeholder="e.g. 25000"
            value={form.salary} onChange={(e) => set("salary", e.target.value)} />
        </Field>
      </Section>

      {/* Duty Hours */}
      <Section title="Duty Hours" icon={Clock}>
        <Field label="Duty Start Time">
          <input type="time" className={inputCls}
            value={form.dutyStartTime} onChange={(e) => set("dutyStartTime", e.target.value)} />
        </Field>
        <Field label="Duty End Time">
          <input type="time" className={inputCls}
            value={form.dutyEndTime} onChange={(e) => set("dutyEndTime", e.target.value)} />
        </Field>
      </Section>

    </div>
  );
}