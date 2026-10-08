// src/app/api/staff/route.js
import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

// ── GET /api/staff ─────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search         = searchParams.get("search")         || "";
    const department     = searchParams.get("department")     || "";
    const status         = searchParams.get("status")         || "";
    const employmentType = searchParams.get("employmentType") || "";
    const page           = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit          = Math.min(100, parseInt(searchParams.get("limit") || "20"));
    const skip           = (page - 1) * limit;

    const where = {
      AND: [
        search
          ? {
              OR: [
                { firstName:   { contains: search } },
                { lastName:    { contains: search } },
                { employeeId:  { contains: search } },
                { designation: { contains: search } },
                { phone:       { contains: search } },
              ],
            }
          : {},
        department     ? { department:     { contains: department } }     : {},
        status         ? { status:         status }                       : {},
        employmentType ? { employmentType: employmentType }               : {},
      ],
    };

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    return NextResponse.json({ staff, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/staff]", err);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

// ── POST /api/staff ────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      employeeId, firstName, lastName, dateOfBirth, age, gender,
      religion, nationality, bloodGroup, profileImage,
      phone, emergencyPhone, email, city, address,
      designation, department, role,
      qualification, experience, joinDate,
      dutyStartTime, dutyEndTime,
      employmentType, status, salary,
    } = body;

    // Basic required field check
    if (!employeeId || !firstName || !dateOfBirth || !gender ||
        !phone || !city || !address || !designation || !joinDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check duplicate employeeId
    const exists = await prisma.staff.findUnique({ where: { employeeId } });
    if (exists) {
      return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
    }

    const staff = await prisma.staff.create({
      data: {
        employeeId,
        firstName,
        lastName:       lastName       || null,
        dateOfBirth:    new Date(dateOfBirth),
        age:            parseInt(age),
        gender,
        religion:       religion       || null,
        nationality:    nationality    || "Pakistani",
        bloodGroup:     bloodGroup     || null,
        profileImage:   profileImage   || null,
        phone,
        emergencyPhone: emergencyPhone || null,
        email:          email          || null,
        city,
        address,
        designation,
        department:     department     || null,
        role:           role           || null,
        qualification:  qualification  || null,
        experience:     parseInt(experience || 0),
        joinDate:       new Date(joinDate),
        dutyStartTime:  dutyStartTime  || null,
        dutyEndTime:    dutyEndTime    || null,
        employmentType: employmentType || "FULL_TIME",
        status:         status         || "ACTIVE",
        salary:         salary         ? parseFloat(salary) : null,
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    console.error("[POST /api/staff]", err);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}