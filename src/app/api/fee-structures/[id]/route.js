import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const structure = await prisma.feeStructure.findUnique({
      where:   { id: parseInt(id) },
      include: {
        class:    { select: { id: true, name: true } },
        feeItems: true,
        collections: {
          take:    5,
          orderBy: { createdAt: "desc" },
          include: { student: { select: { firstName: true, lastName: true, studentId: true } } },
        },
      },
    });
    if (!structure) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(structure);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name, classId, feeType, amount, frequency,
      dueDay, academicYear, description, isActive, feeItems,
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // Replace fee items if provided
      if (feeItems !== undefined) {
        await tx.feeItem.deleteMany({ where: { feeStructureId: parseInt(id) } });
      }

      return tx.feeStructure.update({
        where: { id: parseInt(id) },
        data: {
          ...(name         !== undefined && { name }),
          ...(classId      !== undefined && { classId: parseInt(classId) }),
          ...(feeType      !== undefined && { feeType }),
          ...(amount       !== undefined && { amount: parseFloat(amount) }),
          ...(frequency    !== undefined && { frequency }),
          ...(dueDay       !== undefined && { dueDay: parseInt(dueDay) }),
          ...(academicYear !== undefined && { academicYear }),
          ...(description  !== undefined && { description }),
          ...(isActive     !== undefined && { isActive }),
          ...(feeItems !== undefined && {
            feeItems: {
              create: feeItems.map((item) => ({
                label:      item.label,
                amount:     parseFloat(item.amount),
                isOptional: item.isOptional || false,
              })),
            },
          }),
        },
        include: { feeItems: true, class: { select: { id: true, name: true } } },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[fee-structures PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    // Prevent delete if collections exist
    const count = await prisma.feeCollection.count({
      where: { feeStructureId: parseInt(id) },
    });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${count} fee collection(s) are linked to this structure` },
        { status: 409 }
      );
    }
    await prisma.feeStructure.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[fee-structures DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}