// src/app/api/staff/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// ── GET /api/staff/:id ─────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id: rawId } = await params;          // ← await params (Next.js 15)
    const id = parseInt(rawId);

    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    return NextResponse.json(staff);
  } catch (err) {
    console.error("[GET /api/staff/:id]", err);
    return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 });
  }
}

// ── PUT /api/staff/:id ─────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id: rawId } = await params;          // ← await params (Next.js 15)
    const id = parseInt(rawId);
    const body = await req.json();

    const {
      firstName, lastName, dateOfBirth, age, gender,
      religion, nationality, bloodGroup, profileImage,
      phone, emergencyPhone, email, city, address,
      designation, department, role,
      qualification, experience, joinDate,
      dutyStartTime, dutyEndTime,
      employmentType, status, salary,
    } = body;

    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...(firstName       !== undefined && { firstName }),
        ...(lastName        !== undefined && { lastName: lastName || null }),
        ...(dateOfBirth     !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
        ...(age             !== undefined && { age: parseInt(age) }),
        ...(gender          !== undefined && { gender }),
        ...(religion        !== undefined && { religion: religion || null }),
        ...(nationality     !== undefined && { nationality }),
        ...(bloodGroup      !== undefined && { bloodGroup: bloodGroup || null }),
        ...(profileImage    !== undefined && { profileImage: profileImage || null }),
        ...(phone           !== undefined && { phone }),
        ...(emergencyPhone  !== undefined && { emergencyPhone: emergencyPhone || null }),
        ...(email           !== undefined && { email: email || null }),
        ...(city            !== undefined && { city }),
        ...(address         !== undefined && { address }),
        ...(designation     !== undefined && { designation }),
        ...(department      !== undefined && { department: department || null }),
        ...(role            !== undefined && { role: role || null }),
        ...(qualification   !== undefined && { qualification: qualification || null }),
        ...(experience      !== undefined && { experience: parseInt(experience) }),
        ...(joinDate        !== undefined && { joinDate: new Date(joinDate) }),
        ...(dutyStartTime   !== undefined && { dutyStartTime: dutyStartTime || null }),
        ...(dutyEndTime     !== undefined && { dutyEndTime: dutyEndTime || null }),
        ...(employmentType  !== undefined && { employmentType }),
        ...(status          !== undefined && { status }),
        ...(salary          !== undefined && { salary: salary ? parseFloat(salary) : null }),
      },
    });

    return NextResponse.json(staff);
  } catch (err) {
    console.error("[PUT /api/staff/:id]", err);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

// ── DELETE /api/staff/:id ──────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { id: rawId } = await params;          // ← await params (Next.js 15)
    const id = parseInt(rawId);

    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/staff/:id]", err);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}