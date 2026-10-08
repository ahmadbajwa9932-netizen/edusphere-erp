import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search     = searchParams.get("search")     || "";
    const memberType = searchParams.get("memberType") || "";
    const status     = searchParams.get("status")     || "";
    const classId    = searchParams.get("classId")    || "";
    const page       = parseInt(searchParams.get("page")  || "1");
    const limit      = parseInt(searchParams.get("limit") || "20");
    const skip       = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { name:        { contains: search } },
            { memberId:    { contains: search } },
            { referenceId: { contains: search } },
            { phone:       { contains: search } },
            { email:       { contains: search } },
          ],
        } : {},
        memberType ? { memberType }                 : {},
        status     ? { status }                     : {},
        classId    ? { classId: parseInt(classId) } : {},
      ],
    };

    const [members, total] = await Promise.all([
      prisma.libraryMember.findMany({
        where,
        include: { class: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.libraryMember.count({ where }),
    ]);

    // Auto-expire members whose membership end date has passed
    const now        = new Date();
    const expiredIds = members
      .filter((m) => m.status === "ACTIVE" && m.membershipEnd && new Date(m.membershipEnd) < now)
      .map((m) => m.id);

    if (expiredIds.length > 0) {
      await prisma.libraryMember.updateMany({
        where: { id: { in: expiredIds } },
        data:  { status: "EXPIRED" },
      });
      members.forEach((m) => {
        if (expiredIds.includes(m.id)) m.status = "EXPIRED";
      });
    }

    return NextResponse.json({ members, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body  = await request.json();
    const count = await prisma.libraryMember.count();
    const memberId = `LIB-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const member = await prisma.libraryMember.create({
      data: {
        memberId,
        name:            body.name.trim(),
        memberType:      body.memberType          || "STUDENT",
        referenceId:     body.referenceId?.trim() || null,
        classId:         body.classId             ? parseInt(body.classId) : null,
        phone:           body.phone?.trim()       || null,
        email:           body.email?.trim()       || null,
        address:         body.address?.trim()     || null,
        membershipStart: body.membershipStart     ? new Date(body.membershipStart) : new Date(),
        membershipEnd:   body.membershipEnd       ? new Date(body.membershipEnd)   : null,
        status:          body.status              || "ACTIVE",
      },
      include: { class: true },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}