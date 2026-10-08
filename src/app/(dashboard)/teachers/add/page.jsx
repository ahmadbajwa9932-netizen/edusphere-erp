"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { teachersApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import Card from "../../../../components/ui/Card";
import {
  ChevronLeft, User, Briefcase, Building2, CheckCircle,
  Plus, Trash2, BookOpen,
} from "lucide-react";

// ─── Step config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: "personal",    label: "Personal Info",    icon: User },
  { id: "professional",label: "Professional Info", icon: Briefcase },
  { id: "employment",  label: "Employment",        icon: Building2 },
  { id: "confirm",     label: "Confirm",           icon: CheckCircle },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const selectCls =
  "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls = "text-[12px] font-medium text-gray-600";

// ─── Reusable select field ────────────────────────────────────────────────────
function SelectField({ label, value, onChange, children, error, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}{required && " *"}</label>
      <select value={value} onChange={onChange} className={selectCls}>
        {children}
      </select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── Confirm row ──────────────────────────────────────────────────────────────
function ConfirmRow({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${!last ? "border-b border-gray-100" : ""}`}>
      <span className="text-[12px] text-gray-400">{label}</span>
      <span className="text-[13px] text-gray-700 font-medium">{value || "—"}</span>
    </div>
  );
}

// ─── Departments & Designations ───────────────────────────────────────────────
const DEPARTMENTS = [
  "Science", "Mathematics", "English", "Urdu", "Islamic Studies",
  "Social Studies", "Computer Science", "Physical Education",
  "Arts", "Commerce", "Administration",
];

const DESIGNATIONS = [
  "Head Teacher", "Senior Teacher", "Subject Teacher",
  "Class Teacher", "Assistant Teacher", "Lab Instructor",
  "Visiting Faculty", "Principal", "Vice Principal",
];

const QUALIFICATIONS = [
  "Matric", "F.A / F.Sc", "B.A / B.Sc", "B.Ed",
  "M.A / M.Sc", "M.Ed", "M.Phil", "PhD",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddTeacherPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  // Assignment rows: [{ classId, subject }]
  const [assignments, setAssignments] = useState([{ classId: "", subject: "" }]);

  const [form, setForm] = useState({
    // Personal
    firstName: "", lastName: "",
    dateOfBirth: "", age: "", gender: "",
    religion: "", nationality: "Pakistani",
    phone: "", emergencyPhone: "", email: "",
    city: "", address: "",
    // Professional
    designation: "", department: "",
    qualification: "", specialization: "",
    experience: "", joinDate: "",
    // Employment
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    salary: "",
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: (data) => teachersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      router.push("/teachers");
    },
  });

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── Assignments helpers ────────────────────────────────────────────────────
  const setAssignment = (index, field, value) => {
    setAssignments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addAssignment = () => {
    setAssignments((prev) => [...prev, { classId: "", subject: "" }]);
  };

  const removeAssignment = (index) => {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.dateOfBirth)      e.dateOfBirth = "Date of birth is required";
      if (!form.age)              e.age = "Age is required";
      if (!form.gender)           e.gender = "Gender is required";
      if (!form.phone.trim())     e.phone = "Phone is required";
      if (!form.city.trim())      e.city = "City is required";
      if (!form.address.trim())   e.address = "Address is required";
    }
    if (step === 1) {
      if (!form.designation)    e.designation = "Designation is required";
      if (!form.department)     e.department = "Department is required";
      if (!form.qualification)  e.qualification = "Qualification is required";
      if (!form.joinDate)       e.joinDate = "Join date is required";
    }
    if (step === 2) {
      if (!form.employmentType) e.employmentType = "Employment type is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const handleSubmit = () => {
    const validAssignments = assignments.filter((a) => a.classId && a.subject.trim());
    addMutation.mutate({ ...form, assignments: validAssignments });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <PageHeader title="Add Teacher" description="Register a new teacher to the system">
        <Link href="/teachers">
          <Button variant="secondary" icon={ChevronLeft}>Back</Button>
        </Link>
      </PageHeader>

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((section, i) => {
          const Icon = section.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={section.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <button
                  onClick={() => done && setStep(i)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    done   ? "bg-emerald-500 cursor-pointer hover:bg-emerald-600"
                    : active ? "bg-indigo-600 cursor-default"
                    : "bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <Icon size={14} color={done || active ? "white" : "#9ca3af"} />
                </button>
                <span className={`text-[11px] font-medium ${
                  active ? "text-indigo-600" : done ? "text-emerald-500" : "text-gray-400"
                }`}>
                  {section.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-[1px] flex-1 mb-5 mx-1 ${i < step ? "bg-emerald-300" : "bg-gray-100"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 0: Personal Info ─────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              placeholder="e.g. Ali"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Hassan"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
            <Input
              label="Date of Birth *"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              error={errors.dateOfBirth}
            />
            <Input
              label="Age *"
              type="number"
              placeholder="e.g. 32"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              error={errors.age}
            />
            <SelectField
              label="Gender"
              required
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              error={errors.gender}
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </SelectField>
            <Input
              label="Religion"
              placeholder="e.g. Islam"
              value={form.religion}
              onChange={(e) => set("religion", e.target.value)}
            />
            <Input
              label="Nationality"
              placeholder="e.g. Pakistani"
              value={form.nationality}
              onChange={(e) => set("nationality", e.target.value)}
            />
            <Input
              label="Phone *"
              placeholder="e.g. 03001234567"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={errors.phone}
            />
            <Input
              label="Emergency Phone"
              placeholder="Alternative contact"
              value={form.emergencyPhone}
              onChange={(e) => set("emergencyPhone", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. ali@school.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <Input
              label="City *"
              placeholder="e.g. Lahore"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              error={errors.city}
            />
            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelCls}>Address *</label>
              <textarea
                rows={2}
                placeholder="Full home address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
              />
              {errors.address && <p className="text-[11px] text-red-500">{errors.address}</p>}
            </div>
          </div>
        </Card>
      )}

      {/* ── Step 1: Professional Info ─────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Professional Information</p>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Designation"
              required
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
              error={errors.designation}
            >
              <option value="">Select designation</option>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </SelectField>
            <SelectField
              label="Department"
              required
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              error={errors.department}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </SelectField>
            <SelectField
              label="Qualification"
              required
              value={form.qualification}
              onChange={(e) => set("qualification", e.target.value)}
              error={errors.qualification}
            >
              <option value="">Select qualification</option>
              {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
            </SelectField>
            <Input
              label="Specialization"
              placeholder="e.g. Organic Chemistry"
              value={form.specialization}
              onChange={(e) => set("specialization", e.target.value)}
            />
            <Input
              label="Experience (years)"
              type="number"
              placeholder="e.g. 5"
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
            />
            <Input
              label="Join Date *"
              type="date"
              value={form.joinDate}
              onChange={(e) => set("joinDate", e.target.value)}
              error={errors.joinDate}
            />
          </div>
        </Card>
      )}

      {/* ── Step 2: Employment & Class Assignment ─────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-4">Employment Details</p>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Employment Type"
                required
                value={form.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
                error={errors.employmentType}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </SelectField>
              <SelectField
                label="Status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
              </SelectField>
              <div className="col-span-2">
                <Input
                  label="Monthly Salary (PKR)"
                  type="number"
                  placeholder="e.g. 45000"
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Class Assignments */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-semibold text-gray-700">Class Assignments</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Optional — assign classes and subjects</p>
              </div>
              <Button variant="secondary" icon={Plus} onClick={addAssignment}>
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {assignments.map((row, index) => (
                <div key={index} className="flex items-start gap-3">
                  {/* Class select */}
                  <div className="flex-1 flex flex-col gap-1">
                    {index === 0 && <label className={labelCls}>Class</label>}
                    <select
                      value={row.classId}
                      onChange={(e) => setAssignment(index, "classId", e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Select class</option>
                      {classesData?.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject input */}
                  <div className="flex-1 flex flex-col gap-1">
                    {index === 0 && <label className={labelCls}>Subject</label>}
                    <input
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={row.subject}
                      onChange={(e) => setAssignment(index, "subject", e.target.value)}
                      className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
                    />
                  </div>

                  {/* Remove button */}
                  <div className={index === 0 ? "mt-5" : ""}>
                    {assignments.length > 1 ? (
                      <button
                        onClick={() => removeAssignment(index)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {assignments.length === 0 && (
              <div className="flex flex-col items-center py-6 gap-2 text-center">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                  <BookOpen size={15} className="text-gray-300" />
                </div>
                <p className="text-[12px] text-gray-400">No assignments added</p>
                <button
                  onClick={addAssignment}
                  className="text-[12px] text-indigo-500 hover:underline"
                >
                  Add one
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Step 3: Confirm ───────────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Review & Confirm</p>
          <div className="space-y-4">
            {/* Personal */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Personal Info</p>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                {[
                  ["Full Name",       `${form.firstName} ${form.lastName}`.trim()],
                  ["Date of Birth",   form.dateOfBirth],
                  ["Age",             form.age ? `${form.age} years` : ""],
                  ["Gender",         form.gender],
                  ["Religion",       form.religion],
                  ["Nationality",    form.nationality],
                  ["Phone",          form.phone],
                  ["Emergency Phone",form.emergencyPhone],
                  ["Email",          form.email],
                  ["City",           form.city],
                  ["Address",        form.address],
                ].map(([label, value], i, arr) => (
                  <ConfirmRow key={label} label={label} value={value} last={i === arr.length - 1} />
                ))}
              </div>
            </div>

            {/* Professional */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Professional Info</p>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                {[
                  ["Designation",    form.designation],
                  ["Department",     form.department],
                  ["Qualification",  form.qualification],
                  ["Specialization", form.specialization],
                  ["Experience",     form.experience ? `${form.experience} years` : ""],
                  ["Join Date",      form.joinDate],
                ].map(([label, value], i, arr) => (
                  <ConfirmRow key={label} label={label} value={value} last={i === arr.length - 1} />
                ))}
              </div>
            </div>

            {/* Employment */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Employment</p>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                {[
                  ["Employment Type", form.employmentType?.replace("_", " ")],
                  ["Status",         form.status?.replace("_", " ")],
                  ["Monthly Salary", form.salary ? `PKR ${Number(form.salary).toLocaleString()}` : ""],
                ].map(([label, value], i, arr) => (
                  <ConfirmRow key={label} label={label} value={value} last={i === arr.length - 1} />
                ))}
              </div>
            </div>

            {/* Assignments */}
            {assignments.filter((a) => a.classId && a.subject).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Class Assignments</p>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  {assignments
                    .filter((a) => a.classId && a.subject)
                    .map((a, i, arr) => {
                      const cls = classesData?.find((c) => String(c.id) === String(a.classId));
                      return (
                        <ConfirmRow
                          key={i}
                          label={cls?.name || "Class"}
                          value={a.subject}
                          last={i === arr.length - 1}
                        />
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {step > 0 && (
            <Button variant="secondary" icon={ChevronLeft} onClick={back}>Back</Button>
          )}
        </div>
        <div>
          {step < 3 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Saving..." : "Confirm & Add Teacher"}
            </Button>
          )}
        </div>
      </div>

      {addMutation.isError && (
        <p className="text-[12px] text-red-500 text-center">
          Something went wrong. Please try again.
        </p>
      )}

    </div>
  );
}