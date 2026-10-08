// src/app/api/attendance/staff/route.js

import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// ─── GET /api/attendance/staff?date=YYYY-MM-DD&department=... ─────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date       = searchParams.get("date");
    const department = searchParams.get("department") || "";

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // ── Fetch active staff (optionally filtered by department) ──────────────
    const whereStaff = {
      status: "ACTIVE",
      ...(department ? { department } : {}),
    };

    const staffList = await prisma.staff.findMany({
      where: whereStaff,
      orderBy: [{ department: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        department: true,
        dutyStartTime: true,
        dutyEndTime: true,
      },
    });

    // ── Fetch existing attendance records for the day ───────────────────────
    const existing = await prisma.staffAttendance.findMany({
      where: {
        date: targetDate,
        staffId: { in: staffList.map((s) => s.id) },
      },
    });

    const existingMap = {};
    existing.forEach((rec) => {
      existingMap[rec.staffId] = {
        status:   rec.status,
        checkIn:  rec.checkIn  || "",
        checkOut: rec.checkOut || "",
        remarks:  rec.remarks  || "",
      };
    });

    // ── Merge ───────────────────────────────────────────────────────────────
    const staff = staffList.map((s) => ({
      ...s,
      status:   existingMap[s.id]?.status   || null,
      checkIn:  existingMap[s.id]?.checkIn  || "",
      checkOut: existingMap[s.id]?.checkOut || "",
      remarks:  existingMap[s.id]?.remarks  || "",
    }));

    // ── Unique departments for filter dropdown ──────────────────────────────
    const departments = [
      ...new Set(
        (await prisma.staff.findMany({
          where: { status: "ACTIVE", department: { not: null } },
          select: { department: true },
          distinct: ["department"],
          orderBy: { department: "asc" },
        })).map((s) => s.department).filter(Boolean)
      ),
    ];

    return NextResponse.json({ staff, departments });
  } catch (error) {
    console.error("[GET /api/attendance/staff]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/attendance/staff ───────────────────────────────────────────────
// Body: { date: "YYYY-MM-DD", records: [{ staffId, status, checkIn, checkOut, remarks }] }
export async function POST(request) {
  try {
    const body = await request.json();
    const { date, records } = body;

    if (!date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "date and records are required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Upsert each record (one per staff per day)
    const ops = records.map((rec) =>
      prisma.staffAttendance.upsert({
        where: {
          staffId_date: {
            staffId: rec.staffId,
            date:    targetDate,
          },
        },
        create: {
          staffId:  rec.staffId,
          date:     targetDate,
          status:   rec.status   || "PRESENT",
          checkIn:  rec.checkIn  || null,
          checkOut: rec.checkOut || null,
          remarks:  rec.remarks  || null,
        },
        update: {
          status:   rec.status   || "PRESENT",
          checkIn:  rec.checkIn  || null,
          checkOut: rec.checkOut || null,
          remarks:  rec.remarks  || null,
        },
      })
    );

    await prisma.$transaction(ops);

    return NextResponse.json({ success: true, saved: records.length });
  } catch (error) {
    console.error("[POST /api/attendance/staff]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}