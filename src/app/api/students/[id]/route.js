import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id: Number(id) },
      include: { class: true },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const student = await prisma.student.update({
      where: { id: Number(id) },
      // inside PUT, replace the entire data: {} block with this:
data: {
    ...(body.firstName && { firstName: body.firstName }),
    ...(body.lastName !== undefined && { lastName: body.lastName || null }),
    ...(body.fatherName && { fatherName: body.fatherName }),
    ...(body.motherName !== undefined && { motherName: body.motherName || null }),
    ...(body.dateOfBirth && { dateOfBirth: new Date(body.dateOfBirth) }),
    ...(body.age && { age: parseInt(body.age) }),
    ...(body.gender && { gender: body.gender }),
    ...(body.religion !== undefined && { religion: body.religion || null }),
    ...(body.nationality && { nationality: body.nationality }),
    ...(body.bloodGroup !== undefined && { bloodGroup: body.bloodGroup || null }),
    ...(body.phone !== undefined && { phone: body.phone || null }),
    ...(body.email !== undefined && { email: body.email || null }),
    ...(body.address && { address: body.address }),
    ...(body.city && { city: body.city }),
    ...(body.guardianName && { guardianName: body.guardianName }),
    ...(body.guardianPhone && { guardianPhone: body.guardianPhone }),
    ...(body.guardianRelation && { guardianRelation: body.guardianRelation }),
    ...(body.guardianCnic !== undefined && { guardianCnic: body.guardianCnic || null }),
    ...(body.classId && { classId: parseInt(body.classId) }),
    ...(body.section !== undefined && { section: body.section || null }),
    ...(body.rollNumber !== undefined && { rollNumber: body.rollNumber || null }),
    ...(body.admissionDate && { admissionDate: new Date(body.admissionDate) }),
    ...(body.status && { status: body.status }),
  },
      include: { class: true },
    });
    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.student.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}