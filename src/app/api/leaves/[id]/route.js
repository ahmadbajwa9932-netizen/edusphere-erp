import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

function toDateOnly(d) {
  const dt = new Date(d);
  return new Date(dt.toISOString().split("T")[0]);
}

export async function PATCH(req, { params }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const body = await req.json();
    const { status, remarks } = body;  // ← was missing

    if (!["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data:  { status, remarks: remarks || null },
    });

    if (status === "APPROVED") {
      const days = [];
      const cur  = toDateOnly(leave.fromDate);
      const end  = toDateOnly(leave.toDate);

      while (cur <= end) {
        days.push(new Date(cur));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      if (leave.studentId) {
        await prisma.$transaction(
          days.map((d) =>
            prisma.studentAttendance.upsert({
              where:  { studentId_date: { studentId: leave.studentId, date: d } },
              update: { status: "LEAVE", remarks: `Leave #${id}` },
              create: { studentId: leave.studentId, date: d, status: "LEAVE", remarks: `Leave #${id}` },
            })
          )
        );
      }

      if (leave.teacherId) {
        await prisma.$transaction(
          days.map((d) =>
            prisma.teacherAttendance.upsert({
              where:  { teacherId_date: { teacherId: leave.teacherId, date: d } },
              update: { status: "LEAVE", remarks: `Leave #${id}` },
              create: { teacherId: leave.teacherId, date: d, status: "LEAVE", remarks: `Leave #${id}` },
            })
          )
        );
      }

      if (leave.staffId) {
        await prisma.$transaction(
          days.map((d) =>
            prisma.staffAttendance.upsert({
              where:  { staffId_date: { staffId: leave.staffId, date: d } },
              update: { status: "LEAVE", remarks: `Leave #${id}` },
              create: { staffId: leave.staffId, date: d, status: "LEAVE", remarks: `Leave #${id}` },
            })
          )
        );
      }
    }

    return NextResponse.json(leave);
  } catch (err) {
    console.error("[leaves PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    await prisma.leaveRequest.delete({ where: { id } });  // ← was missing
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[leaves DELETE]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}