"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { studentsApi, classesApi } from "../../../../../lib/api";
import PageHeader from "../../../../../components/ui/PageHeader";
import Button from "../../../../../components/ui/Button";
import Input from "../../../../../components/ui/Input";
import Card from "../../../../../components/ui/Card";
import { ChevronLeft, Save } from "lucide-react";

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls = "text-[12px] font-medium text-gray-600";

export default function EditStudentPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(null);

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.getOne(id),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  useEffect(() => {
    if (student) {
      setForm({
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : "",
        age: student.age || "",
        gender: student.gender || "",
        religion: student.religion || "",
        nationality: student.nationality || "Pakistani",
        bloodGroup: student.bloodGroup || "",
        phone: student.phone || "",
        email: student.email || "",
        address: student.address || "",
        city: student.city || "",
        guardianName: student.guardianName || "",
        guardianPhone: student.guardianPhone || "",
        guardianRelation: student.guardianRelation || "",
        guardianCnic: student.guardianCnic || "",
        classId: student.classId || "",
        section: student.section || "",
        rollNumber: student.rollNumber || "",
        admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split("T")[0] : "",
        status: student.status || "ACTIVE",
      });
    }
  }, [student]);

  const updateMutation = useMutation({
    mutationFn: (data) => studentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      router.push(`/students/${id}`);
    },
  });

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.fatherName.trim()) e.fatherName = "Father name is required";
    if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required";
    if (!form.age) e.age = "Age is required";
    if (!form.gender) e.gender = "Gender is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.guardianName.trim()) e.guardianName = "Guardian name is required";
    if (!form.guardianPhone.trim()) e.guardianPhone = "Guardian phone is required";
    if (!form.guardianRelation.trim()) e.guardianRelation = "Relation is required";
    if (!form.classId) e.classId = "Class is required";
    if (!form.admissionDate) e.admissionDate = "Admission date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) updateMutation.mutate(form);
  };

  if (isLoading || !form) {
    return (
      <div className="space-y-5 max-w-3xl">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        {[...Array(3)].map((_, i) => (
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

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <PageHeader
        title="Edit Student"
        description={`Editing record for ${student?.firstName} ${student?.lastName || ""}`}
      >
        <Link href={`/students/${id}`}>
          <Button variant="secondary" icon={ChevronLeft}>Back</Button>
        </Link>
        <Button
          icon={Save}
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      {/* Personal Info */}
      <Card>
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Personal Information</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" value={form.firstName} onChange={e => set("firstName", e.target.value)} error={errors.firstName} />
          <Input label="Last Name" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
          <Input label="Father Name *" value={form.fatherName} onChange={e => set("fatherName", e.target.value)} error={errors.fatherName} />
          <Input label="Mother Name" value={form.motherName} onChange={e => set("motherName", e.target.value)} />
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
          <Input label="Religion" value={form.religion} onChange={e => set("religion", e.target.value)} />
          <Input label="Nationality" value={form.nationality} onChange={e => set("nationality", e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          <Input label="City *" value={form.city} onChange={e => set("city", e.target.value)} error={errors.city} />
          <div className="col-span-2 flex flex-col gap-1">
            <label className={labelCls}>Address *</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={e => set("address", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none"
            />
            {errors.address && <p className="text-[11px] text-red-500">{errors.address}</p>}
          </div>
        </div>
      </Card>

      {/* Guardian Info */}
      <Card>
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Guardian Information</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Guardian Name *" value={form.guardianName} onChange={e => set("guardianName", e.target.value)} error={errors.guardianName} />
          <Input label="Guardian Phone *" value={form.guardianPhone} onChange={e => set("guardianPhone", e.target.value)} error={errors.guardianPhone} />
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
          <Input label="Guardian CNIC" value={form.guardianCnic} onChange={e => set("guardianCnic", e.target.value)} />
        </div>
      </Card>

      {/* Academic Info */}
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
          <Input label="Section" value={form.section} onChange={e => set("section", e.target.value)} />
          <Input label="Roll Number" value={form.rollNumber} onChange={e => set("rollNumber", e.target.value)} />
          <Input label="Admission Date *" type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} error={errors.admissionDate} />
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="GRADUATED">Graduated</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error */}
      {updateMutation.isError && (
        <p className="text-[12px] text-red-500 text-center">
          Something went wrong. Please try again.
        </p>
      )}

      {/* Bottom save button */}
      <div className="flex justify-end pb-4">
        <Button icon={Save} onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

    </div>
  );
}