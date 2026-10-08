import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(id) },
      include: {
        classes: { include: { class: true } },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { assignments, ...teacherData } = body;

    // Only update fields that were actually sent in the request
    // This allows partial updates like { status: "INACTIVE" } without crashing
    const data = {};

    if (teacherData.firstName      !== undefined) data.firstName      = teacherData.firstName;
    if (teacherData.lastName       !== undefined) data.lastName       = teacherData.lastName || null;
    if (teacherData.dateOfBirth    !== undefined) data.dateOfBirth    = new Date(teacherData.dateOfBirth);
    if (teacherData.age            !== undefined) data.age            = parseInt(teacherData.age);
    if (teacherData.gender         !== undefined) data.gender         = teacherData.gender;
    if (teacherData.religion       !== undefined) data.religion       = teacherData.religion || null;
    if (teacherData.nationality    !== undefined) data.nationality    = teacherData.nationality;
    if (teacherData.phone          !== undefined) data.phone          = teacherData.phone;
    if (teacherData.emergencyPhone !== undefined) data.emergencyPhone = teacherData.emergencyPhone || null;
    if (teacherData.email          !== undefined) data.email          = teacherData.email || null;
    if (teacherData.city           !== undefined) data.city           = teacherData.city;
    if (teacherData.address        !== undefined) data.address        = teacherData.address;
    if (teacherData.designation    !== undefined) data.designation    = teacherData.designation;
    if (teacherData.department     !== undefined) data.department     = teacherData.department;
    if (teacherData.qualification  !== undefined) data.qualification  = teacherData.qualification;
    if (teacherData.specialization !== undefined) data.specialization = teacherData.specialization || null;
    if (teacherData.experience     !== undefined) data.experience     = parseInt(teacherData.experience) || 0;
    if (teacherData.joinDate       !== undefined) data.joinDate       = new Date(teacherData.joinDate);
    if (teacherData.employmentType !== undefined) data.employmentType = teacherData.employmentType;
    if (teacherData.status         !== undefined) data.status         = teacherData.status;
    if (teacherData.salary         !== undefined) data.salary         = teacherData.salary ? parseFloat(teacherData.salary) : null;

    // Only update assignments if they were included in the request
    if (assignments !== undefined) {
      await prisma.teacherClass.deleteMany({ where: { teacherId: parseInt(id) } });
      if (assignments.length > 0) {
        data.classes = {
          create: assignments.map((a) => ({
            classId: parseInt(a.classId),
            subject: a.subject,
          })),
        };
      }
    }

    const teacher = await prisma.teacher.update({
      where: { id: parseInt(id) },
      data,
      include: { classes: { include: { class: true } } },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.teacher.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}