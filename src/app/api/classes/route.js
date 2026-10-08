import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: "asc" },
      include: {
        sections: { orderBy: { name: "asc" } },
        subjects: { orderBy: { name: "asc" } },
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Check duplicate
    const existing = await prisma.class.findUnique({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json({ error: "A class with this name already exists." }, { status: 409 });
    }

    const cls = await prisma.class.create({
      data: { name: body.name.trim() },
      include: {
        sections: true,
        subjects: true,
        _count: { select: { students: true } },
      },
    });

    return NextResponse.json(cls, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}