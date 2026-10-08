import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// PUT /api/grade-config/:id
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { grade, minPercent, maxPercent, label, gpaPoints, order } = body;

    if (parseFloat(minPercent) > parseFloat(maxPercent)) {
      return NextResponse.json({ error: "Min % cannot be greater than Max %" }, { status: 400 });
    }

    const updated = await prisma.gradeConfig.update({
      where: { id: parseInt(id) },
      data: {
        grade,
        minPercent: parseFloat(minPercent),
        maxPercent: parseFloat(maxPercent),
        label,
        gpaPoints:  gpaPoints !== undefined && gpaPoints !== "" ? parseFloat(gpaPoints) : null,
        order:      parseInt(order),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
  }
}

// DELETE /api/grade-config/:id
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.gradeConfig.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete grade" }, { status: 500 });
  }
}