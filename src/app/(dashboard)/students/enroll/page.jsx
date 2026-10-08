"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { studentsApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import Card from "../../../../components/ui/Card";
import { ChevronLeft, User, Users, BookOpen, CheckCircle } from "lucide-react";

const SECTIONS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "guardian", label: "Guardian Info", icon: Users },
  { id: "academic", label: "Academic Info", icon: BookOpen },
  { id: "confirm", label: "Confirm", icon: CheckCircle },
];

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls = "text-[12px] font-medium text-gray-600";

export default function EnrollStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", age: "",  gender: "",
    religion: "", nationality: "Pakistani", bloodGroup: "",
    phone: "", email: "", address: "", city: "",
    guardianName: "", guardianPhone: "", guardianRelation: "", guardianCnic: "",
    motherName: "", fatherName: "",
    classId: "", section: "", rollNumber: "", admissionDate: "",
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const enrollMutation = useMutation({
    mutationFn: (data) => studentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      router.push("/students");
    },
  });

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.fatherName.trim()) e.fatherName = "Father name is required";
      if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required";
      if (!form.age) e.age = "Age is required";
      if (!form.gender) e.gender = "Gender is required";
      if (!form.address.trim()) e.address = "Address is required";
      if (!form.city.trim()) e.city = "City is required";
    }
    if (step === 1) {
      if (!form.guardianName.trim()) e.guardianName = "Guardian name is required";
      if (!form.guardianPhone.trim()) e.guardianPhone = "Guardian phone is required";
      if (!form.guardianRelation.trim()) e.guardianRelation = "Relation is required";
    }
    if (step === 2) {
      if (!form.classId) e.classId = "Class is required";
      if (!form.admissionDate) e.admissionDate = "Admission date is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSubmit = () => {
    enrollMutation.mutate(form);
  };

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <PageHeader title="Enroll Student" description="Add a new student to the system">
        <Link href="/students">
          <Button variant="secondary" icon={ChevronLeft}>Back</Button>
        </Link>
      </PageHeader>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
  {SECTIONS.map((section, i) => {
    const Icon = section.icon;
    const done = i < step;
    const active = i === step;
    return (
      <div key={section.id} className="flex items-center flex-1">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <button
            onClick={() => i < step && setStep(i)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              done ? "bg-emerald-500 cursor-pointer hover:bg-emerald-600" 
              : active ? "bg-indigo-600 cursor-default" 
              : "bg-gray-100 cursor-not-allowed"
            }`}
          >
            <Icon size={14} color={done || active ? "white" : "#9ca3af"} />
          </button>
          <span className={`text-[11px] font-medium ${active ? "text-indigo-600" : done ? "text-emerald-500 cursor-pointer" : "text-gray-400"}`}>
            {section.label}
          </span>
        </div>
        {i < SECTIONS.length - 1 && (
          <div className={`h-[1px] flex-1 mb-5 mx-1 ${i < step ? "bg-emerald-300" : "bg-gray-100"}`} />
        )}
      </div>
    );
  })}
</div>

      {/* Step 0 — Personal Info */}
      {step === 0 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" placeholder="e.g. Ahmed" value={form.firstName} onChange={e => set("firstName", e.target.value)} error={errors.firstName} />
            <Input label="Last Name" placeholder="e.g. Khan" value={form.lastName} onChange={e => set("lastName", e.target.value)} error={errors.lastName} />
            <Input label="Father Name *" placeholder="Father's full name" value={form.fatherName} onChange={e => set("fatherName", e.target.value)} error={errors.fatherName} />
            <Input label="Mother Name" placeholder="Mother's full name" value={form.motherName} onChange={e => set("motherName", e.target.value)} error={errors.motherName} />
            <Input label="Date of Birth *" type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} error={errors.dateOfBirth} />
            <Input label="Age *" type="number" value={form.age} onChange={e => set("age", e.target.value)} error={errors.age} />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Gender *</label>
              <select value={form.gender} onChange={e => set("gender", e.target.value)} className={selectCls}>
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
              {errors.gender && <p className="text-[11px] text-red-500">{errors.gender}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Blood Group</label>
              <select value={form.bloodGroup} onChange={e => set("bloodGroup", e.target.value)} className={selectCls}>
                <option value="">Select blood group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <Input label="Religion" placeholder="e.g. Islam" value={form.religion} onChange={e => set("religion", e.target.value)} />
            <Input label="Nationality" placeholder="e.g. Pakistani" value={form.nationality} onChange={e => set("nationality", e.target.value)} />
            <Input label="Phone" placeholder="Student phone (optional)" value={form.phone} onChange={e => set("phone", e.target.value)} />
            <Input label="Email" placeholder="Student email (optional)" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            <Input label="City *" placeholder="e.g. Lahore" value={form.city} onChange={e => set("city", e.target.value)} error={errors.city} />
            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelCls}>Address *</label>
              <textarea
                rows={2}
                placeholder="Full home address"
                value={form.address}
                onChange={e => set("address", e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
              />
              {errors.address && <p className="text-[11px] text-red-500">{errors.address}</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Step 1 — Guardian Info */}
      {step === 1 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Guardian Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guardian Name *" placeholder="Full name" value={form.guardianName} onChange={e => set("guardianName", e.target.value)} error={errors.guardianName} />
            <Input label="Guardian Phone *" placeholder="e.g. 03001234567" value={form.guardianPhone} onChange={e => set("guardianPhone", e.target.value)} error={errors.guardianPhone} />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Relation *</label>
              <select value={form.guardianRelation} onChange={e => set("guardianRelation", e.target.value)} className={selectCls}>
                <option value="">Select relation</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Uncle">Uncle</option>
                <option value="Guardian">Guardian</option>
              </select>
              {errors.guardianRelation && <p className="text-[11px] text-red-500">{errors.guardianRelation}</p>}
            </div>
            <Input label="Guardian CNIC" placeholder="e.g. 35201-1234567-1" value={form.guardianCnic} onChange={e => set("guardianCnic", e.target.value)} />
          </div>
        </Card>
      )}

      {/* Step 2 — Academic Info */}
      {step === 2 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Academic Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Class *</label>
              <select value={form.classId} onChange={e => set("classId", e.target.value)} className={selectCls}>
                <option value="">Select class</option>
                {classesData?.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              {errors.classId && <p className="text-[11px] text-red-500">{errors.classId}</p>}
            </div>
            <Input label="Section" placeholder="e.g. A" value={form.section} onChange={e => set("section", e.target.value)} error={errors.section} />
            <Input label="Roll Number" placeholder="e.g. 15" value={form.rollNumber} onChange={e => set("rollNumber", e.target.value)} />
            <Input label="Admission Date *" type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} />
          </div>
        </Card>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <Card>
          <p className="text-[13px] font-semibold text-gray-700 mb-4">Review & Confirm</p>
          <div className="space-y-4">
            {[
              {
                title: "Personal Info",
                rows: [
                  ["Full Name", `${form.firstName} ${form.lastName}`],
                  ["Father Name", form.fatherName],
                  ["Mother Name", form.motherName],
                  ["Date of Birth", form.dateOfBirth],
                  ["Gender", form.gender],
                  ["City", form.city],
                  ["Blood Group", form.bloodGroup || "—"],
                ]
              },
              {
                title: "Guardian Info",
                rows: [
                  ["Guardian Name", form.guardianName],
                  ["Phone", form.guardianPhone],
                  ["Relation", form.guardianRelation],
                  ["CNIC", form.guardianCnic || "—"],
                ]
              },
              {
                title: "Academic Info",
                rows: [
                  ["Class", classesData?.find(c => c.id == form.classId)?.name || "—"],
                  ["Section", form.section],
                  ["Roll Number", form.rollNumber || "—"],
                ]
              },
            ].map(group => (
              <div key={group.title}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.title}</p>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  {group.rows.map(([label, value], i) => (
                    <div key={label} className={`flex items-center justify-between px-4 py-2.5 ${i !== group.rows.length - 1 ? "border-b border-gray-100" : ""}`}>
                      <span className="text-[12px] text-gray-400">{label}</span>
                      <span className="text-[13px] text-gray-700 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Navigation */}
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
            <Button
              onClick={handleSubmit}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Confirm & Enroll"}
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {enrollMutation.isError && (
        <p className="text-[12px] text-red-500 text-center">
          Something went wrong. Please try again.
        </p>
      )}

    </div>
  );
}