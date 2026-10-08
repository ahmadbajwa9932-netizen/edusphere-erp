import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const classId = searchParams.get("classId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { studentId: { contains: search } },
            { fatherName: { contains: search } },
          ],
        } : {},
        classId ? { classId: parseInt(classId) } : {},
        status ? { status: status } : {},
      ],
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { class: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      students,
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

    const count = await prisma.student.count();
    const studentId = `STU-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const student = await prisma.student.create({
      data: {
        studentId,
        firstName: body.firstName,
        lastName: body.lastName || null,
        fatherName: body.fatherName,
        motherName: body.motherName || null,
        dateOfBirth: new Date(body.dateOfBirth),
        age: parseInt(body.age),
        gender: body.gender,
        religion: body.religion,
        nationality: body.nationality || "Pakistani",
        bloodGroup: body.bloodGroup,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
        guardianName: body.guardianName,
        guardianPhone: body.guardianPhone,
        guardianRelation: body.guardianRelation,
        guardianCnic: body.guardianCnic,
        classId: parseInt(body.classId),
        section: body.section || null,
        rollNumber: body.rollNumber,
        admissionDate: new Date(body.admissionDate),
      },
      include: { class: true },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}