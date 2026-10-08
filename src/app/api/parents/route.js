import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search       = searchParams.get("search")       || "";
    const portalAccess = searchParams.get("portalAccess");
    const page         = parseInt(searchParams.get("page")  || "1");
    const limit        = parseInt(searchParams.get("limit") || "20");
    const skip         = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { name:  { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { cnic:  { contains: search } },
          ],
        } : {},
        portalAccess !== null && portalAccess !== undefined && portalAccess !== ""
          ? { portalAccess: portalAccess === "true" } : {},
      ],
    };

    const [parents, total] = await Promise.all([
      prisma.parent.findMany({
        where,
        include: {
          students: {
            include: {
              student: {
                include: { class: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.parent.count({ where }),
    ]);

    return NextResponse.json({
      parents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Check duplicate email
    if (body.email) {
      const existing = await prisma.parent.findUnique({ where: { email: body.email.trim() } });
      if (existing) {
        return NextResponse.json({ error: "A parent with this email already exists." }, { status: 409 });
      }
    }

    // Generate 4-digit portal PIN
    const portalPin = String(Math.floor(1000 + Math.random() * 9000));

    const parent = await prisma.parent.create({
      data: {
        name:         body.name.trim(),
        email:        body.email?.trim()   || null,
        phone:        body.phone.trim(),
        cnic:         body.cnic?.trim()    || null,
        address:      body.address?.trim() || null,
        relation:     body.relation        || "Parent",
        portalAccess: body.portalAccess    || false,
        portalPin,
        // Link students if provided
        students: body.studentIds?.length > 0 ? {
          create: body.studentIds.map((sid) => ({
            studentId: parseInt(sid),
          })),
        } : undefined,
      },
      include: {
        students: {
          include: {
            student: { include: { class: true } },
          },
        },
      },
    });

    return NextResponse.json(parent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}