import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const employmentType = searchParams.get("employmentType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { employeeId: { contains: search } },
            { designation: { contains: search } },
            { department: { contains: search } },
          ],
        } : {},
        department ? { department } : {},
        status ? { status } : {},
        employmentType ? { employmentType } : {},
      ],
    };

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        include: {
          classes: {
            include: { class: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.teacher.count({ where }),
    ]);

    return NextResponse.json({
      teachers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const count = await prisma.teacher.count();
    const employeeId = `TCH-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const { assignments, ...teacherData } = body;

    const teacher = await prisma.teacher.create({
      data: {
        employeeId,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName || null,
        dateOfBirth: new Date(teacherData.dateOfBirth),
        age: parseInt(teacherData.age),
        gender: teacherData.gender,
        religion: teacherData.religion || null,
        nationality: teacherData.nationality || "Pakistani",
        phone: teacherData.phone,
        emergencyPhone: teacherData.emergencyPhone || null,
        email: teacherData.email || null,
        city: teacherData.city,
        address: teacherData.address,
        designation: teacherData.designation,
        department: teacherData.department,
        qualification: teacherData.qualification,
        specialization: teacherData.specialization || null,
        experience: parseInt(teacherData.experience) || 0,
        joinDate: new Date(teacherData.joinDate),
        employmentType: teacherData.employmentType,
        status: teacherData.status || "ACTIVE",
        salary: teacherData.salary ? parseFloat(teacherData.salary) : null,
        classes: assignments?.length > 0 ? {
          create: assignments.map((a) => ({
            classId: parseInt(a.classId),
            subject: a.subject,
          })),
        } : undefined,
      },
      include: {
        classes: { include: { class: true } },
      },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}