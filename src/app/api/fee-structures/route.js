import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

/**
 * GET /api/fee-structures
 *   search       = string
 *   classId      = number
 *   feeType      = FeeType enum
 *   frequency    = FeeFrequency enum
 *   academicYear = string
 *   isActive     = "true" | "false"
 *   page         = number (default 1)
 *   limit        = number (default 15)
 *
 * POST /api/fee-structures — create with nested feeItems
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search       = searchParams.get("search")       || "";
    const classId      = searchParams.get("classId");
    const feeType      = searchParams.get("feeType");
    const frequency    = searchParams.get("frequency");
    const academicYear = searchParams.get("academicYear");
    const isActive     = searchParams.get("isActive");
    const page         = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit        = Math.max(1, parseInt(searchParams.get("limit") || "15"));
    const skip         = (page - 1) * limit;

    const where = {
      ...(feeType      && { feeType }),
      ...(frequency    && { frequency }),
      ...(academicYear && { academicYear }),
      ...(classId      && { classId: parseInt(classId) }),
      ...(isActive !== null && isActive !== "" && { isActive: isActive === "true" }),
      ...(search && {
        OR: [
          { name:         { contains: search } },
          { description:  { contains: search } },
          { academicYear: { contains: search } },
          { class: { name: { contains: search } } },
        ],
      }),
    };

    const [structures, total] = await Promise.all([
      prisma.feeStructure.findMany({
        where,
        include: {
          class:    { select: { id: true, name: true } },
          feeItems: true,
          _count:   { select: { collections: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feeStructure.count({ where }),
    ]);

    // Summary stats
    const [totalActive, totalInactive, byType] = await Promise.all([
      prisma.feeStructure.count({ where: { isActive: true } }),
      prisma.feeStructure.count({ where: { isActive: false } }),
      prisma.feeStructure.groupBy({
        by: ["feeType"],
        _count: { feeType: true },
        _sum:   { amount: true },
      }),
    ]);

    // Academic years for filter dropdown
    const years = await prisma.feeStructure.findMany({
      select:   { academicYear: true },
      distinct: ["academicYear"],
      orderBy:  { academicYear: "desc" },
    });

    return NextResponse.json({
      structures: structures.map((s) => ({
        id:            s.id,
        name:          s.name,
        classId:       s.classId,
        className:     s.class.name,
        feeType:       s.feeType,
        amount:        parseFloat(s.amount),
        frequency:     s.frequency,
        dueDay:        s.dueDay,
        academicYear:  s.academicYear,
        isActive:      s.isActive,
        description:   s.description,
        feeItems:      s.feeItems.map((i) => ({
          id:         i.id,
          label:      i.label,
          amount:     parseFloat(i.amount),
          isOptional: i.isOptional,
        })),
        collectionsCount: s._count.collections,
        createdAt:     s.createdAt,
      })),
      summary: { totalActive, totalInactive, byType },
      academicYears: years.map((y) => y.academicYear),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[fee-structures GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name, classId, feeType, amount, frequency,
      dueDay, academicYear, description, feeItems = [],
    } = body;

    if (!name || !classId || !amount || !academicYear) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for duplicate (same class + feeType + academicYear)
    const existing = await prisma.feeStructure.findFirst({
      where: {
        classId:      parseInt(classId),
        feeType:      feeType || "TUITION",
        academicYear,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A ${feeType || "TUITION"} fee structure already exists for this class in ${academicYear}` },
        { status: 409 }
      );
    }

    const structure = await prisma.feeStructure.create({
      data: {
        name,
        classId:     parseInt(classId),
        feeType:     feeType     || "TUITION",
        amount:      parseFloat(amount),
        frequency:   frequency   || "MONTHLY",
        dueDay:      parseInt(dueDay) || 10,
        academicYear,
        description: description || null,
        feeItems: {
          create: feeItems.map((item) => ({
            label:      item.label,
            amount:     parseFloat(item.amount),
            isOptional: item.isOptional || false,
          })),
        },
      },
      include: { feeItems: true, class: { select: { id: true, name: true } } },
    });

    return NextResponse.json(structure, { status: 201 });
  } catch (err) {
    console.error("[fee-structures POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}