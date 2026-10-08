"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { teachersApi, classesApi } from "../../../../../lib/api";
import PageHeader from "../../../../../components/ui/PageHeader";
import Button from "../../../../../components/ui/Button";
import Input from "../../../../../components/ui/Input";
import Card from "../../../../../components/ui/Card";
import { ChevronLeft, Save, Plus, Trash2, BookOpen } from "lucide-react";

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

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

function SelectField({ label, value, onChange, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}</label>
      <select value={value} onChange={onChange} className={selectCls}>{children}</select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export default function EditTeacherPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errors, setErrors]           = useState({});
  const [form, setForm]               = useState(null);
  const [assignments, setAssignments] = useState([]);

  // ── Fetch teacher ─────────────────────────────────────────────────────────
  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => teachersApi.getOne(id),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  // ── Populate form when data arrives ──────────────────────────────────────
  useEffect(() => {
    if (teacher) {
      setForm({
        firstName:      teacher.firstName      || "",
        lastName:       teacher.lastName       || "",
        dateOfBirth:    teacher.dateOfBirth    ? new Date(teacher.dateOfBirth).toISOString().split("T")[0] : "",
        age:            teacher.age            ?? "",
        gender:         teacher.gender         || "",
        religion:       teacher.religion       || "",
        nationality:    teacher.nationality    || "Pakistani",
        phone:          teacher.phone          || "",
        emergencyPhone: teacher.emergencyPhone || "",
        email:          teacher.email          || "",
        city:           teacher.city           || "",
        address:        teacher.address        || "",
        designation:    teacher.designation    || "",
        department:     teacher.department     || "",
        qualification:  teacher.qualification  || "",
        specialization: teacher.specialization || "",
        experience:     teacher.experience     ?? "",
        joinDate:       teacher.joinDate       ? new Date(teacher.joinDate).toISOString().split("T")[0] : "",
        employmentType: teacher.employmentType || "FULL_TIME",
        status:         teacher.status         || "ACTIVE",
        salary:         teacher.salary         ?? "",
      });

      // Populate assignment rows
      if (teacher.classes?.length > 0) {
        setAssignments(
          teacher.classes.map((tc) => ({
            classId: String(tc.classId),
            subject: tc.subject,
          }))
        );
      } else {
        setAssignments([{ classId: "", subject: "" }]);
      }
    }
  }, [teacher]);

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => teachersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      router.push(`/teachers/${id}`);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setAssignment = (index, field, value) => {
    setAssignments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addAssignment    = () => setAssignments((prev) => [...prev, { classId: "", subject: "" }]);
  const removeAssignment = (i) => setAssignments((prev) => prev.filter((_, idx) => idx !== i));

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.firstName.trim())   e.firstName    = "First name is required";
    if (!form.dateOfBirth)        e.dateOfBirth  = "Date of birth is required";
    if (!form.age)                e.age          = "Age is required";
    if (!form.gender)             e.gender       = "Gender is required";
    if (!form.phone.trim())       e.phone        = "Phone is required";
    if (!form.city.trim())        e.city         = "City is required";
    if (!form.address.trim())     e.address      = "Address is required";
    if (!form.designation)        e.designation  = "Designation is required";
    if (!form.department)         e.department   = "Department is required";
    if (!form.qualification)      e.qualification= "Qualification is required";
    if (!form.joinDate)           e.joinDate     = "Join date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const validAssignments = assignments.filter((a) => a.classId && a.subject.trim());
    updateMutation.mutate({ ...form, assignments: validAssignments });
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading || !form) {
    return (
      <div className="space-y-5 max-w-6xl">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <PageHeader
        title="Edit Teacher"
        description={`Editing record for ${teacher?.firstName} ${teacher?.lastName || ""}`}
      >
        <Link href={`/teachers/${id}`}>
          <Button variant="secondary" icon={ChevronLeft}>Back</Button>
        </Link>
        <Button icon={Save} onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      {/* ── Personal Info ──────────────────────────────────────────────────── */}
      <Card>
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Personal Information</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *"      value={form.firstName}      onChange={(e) => set("firstName", e.target.value)}      error={errors.firstName} />
          <Input label="Last Name"         value={form.lastName}       onChange={(e) => set("lastName", e.target.value)} />
          <Input label="Date of Birth *"   type="date" value={form.dateOfBirth}  onChange={(e) => set("dateOfBirth", e.target.value)}  error={errors.dateOfBirth} />
          <Input label="Age *"             type="number" value={form.age}        onChange={(e) => set("age", e.target.value)}            error={errors.age} />
          <SelectField label="Gender *" value={form.gender} onChange={(e) => set("gender", e.target.value)} error={errors.gender}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </SelectField>
          <Input label="Religion"          value={form.religion}       onChange={(e) => set("religion", e.target.value)} />
          <Input label="Nationality"       value={form.nationality}    onChange={(e) => set("nationality", e.target.value)} />
          <Input label="Phone *"           value={form.phone}          onChange={(e) => set("phone", e.target.value)}          error={errors.phone} />
          <Input label="Emergency Phone"   value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
          <Input label="Email"  type="email" value={form.email}        onChange={(e) => set("email", e.target.value)} />
          <Input label="City *"            value={form.city}           onChange={(e) => set("city", e.target.value)}           error={errors.city} />
          <div className="col-span-2 flex flex-col gap-1">
            <label className={labelCls}>Address *</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none"
            />
            {errors.address && <p className="text-[11px] text-red-500">{errors.address}</p>}
          </div>
        </div>
      </Card>

      {/* ── Professional Info ──────────────────────────────────────────────── */}
      <Card>
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Professional Information</p>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Designation *" value={form.designation} onChange={(e) => set("designation", e.target.value)} error={errors.designation}>
            <option value="">Select designation</option>
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </SelectField>
          <SelectField label="Department *" value={form.department} onChange={(e) => set("department", e.target.value)} error={errors.department}>
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </SelectField>
          <SelectField label="Qualification *" value={form.qualification} onChange={(e) => set("qualification", e.target.value)} error={errors.qualification}>
            <option value="">Select qualification</option>
            {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </SelectField>
          <Input label="Specialization" value={form.specialization} onChange={(e) => set("specialization", e.target.value)} />
          <Input label="Experience (years)" type="number" value={form.experience} onChange={(e) => set("experience", e.target.value)} />
          <Input label="Join Date *" type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} error={errors.joinDate} />
        </div>
      </Card>

      {/* ── Employment Details ─────────────────────────────────────────────── */}
      <Card>
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Employment Details</p>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Employment Type" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </SelectField>
          <SelectField label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </SelectField>
          <div className="col-span-2">
            <Input label="Monthly Salary (PKR)" type="number" placeholder="e.g. 45000" value={form.salary} onChange={(e) => set("salary", e.target.value)} />
          </div>
        </div>
      </Card>

      {/* ── Class Assignments ──────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-gray-700">Class Assignments</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Assign classes and subjects to this teacher</p>
          </div>
          <Button variant="secondary" icon={Plus} onClick={addAssignment}>Add Row</Button>
        </div>

        <div className="space-y-3">
          {assignments.map((row, index) => (
            <div key={index} className="flex items-start gap-3">
              {/* Class */}
              <div className="flex-1 flex flex-col gap-1">
                {index === 0 && <label className={labelCls}>Class</label>}
                <select
                  value={row.classId}
                  onChange={(e) => setAssignment(index, "classId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select class</option>
                  {classesData?.map((cls) => (
                    <option key={cls.id} value={String(cls.id)}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
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

              {/* Remove */}
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
            <p className="text-[12px] text-gray-400">No assignments</p>
            <button onClick={addAssignment} className="text-[12px] text-indigo-500 hover:underline">
              Add one
            </button>
          </div>
        )}
      </Card>

      {/* Error */}
      {updateMutation.isError && (
        <p className="text-[12px] text-red-500 text-center">Something went wrong. Please try again.</p>
      )}

      {/* Bottom save */}
      <div className="flex justify-end pb-4">
        <Button icon={Save} onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

    </div>
  );
}