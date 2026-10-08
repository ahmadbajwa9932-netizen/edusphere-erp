import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

// GET /api/grade-config
export async function GET() {
  try {
    const grades = await prisma.gradeConfig.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(grades);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch grade config" }, { status: 500 });
  }
}

// POST /api/grade-config
export async function POST(req) {
  try {
    const body = await req.json();
    const { grade, minPercent, maxPercent, label, gpaPoints, order } = body;

    if (!grade || minPercent === undefined || maxPercent === undefined || !label) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (parseFloat(minPercent) > parseFloat(maxPercent)) {
      return NextResponse.json({ error: "Min % cannot be greater than Max %" }, { status: 400 });
    }

    const existing = await prisma.gradeConfig.findMany({ orderBy: { order: "asc" } });
    const nextOrder = order ?? (existing.length > 0 ? Math.max(...existing.map(g => g.order)) + 1 : 1);

    const created = await prisma.gradeConfig.create({
      data: {
        grade,
        minPercent: parseFloat(minPercent),
        maxPercent: parseFloat(maxPercent),
        label,
        gpaPoints:  gpaPoints !== undefined && gpaPoints !== "" ? parseFloat(gpaPoints) : null,
        order:      parseInt(nextOrder),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
  }
}