import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const parent = await prisma.parent.findUnique({
      where: { id: parseInt(id) },
      include: {
        students: {
          include: {
            student: { include: { class: true } },
          },
        },
      },
    });
    if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    return NextResponse.json(parent);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id }  = await params;
    const body    = await request.json();
    const data    = {};

    if (body.name         !== undefined) data.name         = body.name.trim();
    if (body.email        !== undefined) data.email        = body.email?.trim() || null;
    if (body.phone        !== undefined) data.phone        = body.phone.trim();
    if (body.cnic         !== undefined) data.cnic         = body.cnic?.trim()  || null;
    if (body.address      !== undefined) data.address      = body.address?.trim()|| null;
    if (body.relation     !== undefined) data.relation     = body.relation;
    if (body.portalAccess !== undefined) data.portalAccess = body.portalAccess;

    // Regenerate PIN if requested
    if (body.regeneratePin) {
      data.portalPin = String(Math.floor(1000 + Math.random() * 9000));
    }

    // Update student links if provided
    if (body.studentIds !== undefined) {
      // Delete existing links then recreate
      await prisma.parentStudent.deleteMany({ where: { parentId: parseInt(id) } });
      if (body.studentIds.length > 0) {
        data.students = {
          create: body.studentIds.map((sid) => ({
            studentId: parseInt(sid),
          })),
        };
      }
    }

    const parent = await prisma.parent.update({
      where: { id: parseInt(id) },
      data,
      include: {
        students: {
          include: {
            student: { include: { class: true } },
          },
        },
      },
    });

    return NextResponse.json(parent);
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.parent.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}