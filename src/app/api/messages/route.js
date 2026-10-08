import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search        = searchParams.get("search")        || "";
    const recipientType = searchParams.get("recipientType") || "";
    const isRead        = searchParams.get("isRead");
    const page          = parseInt(searchParams.get("page")  || "1");
    const limit         = parseInt(searchParams.get("limit") || "20");
    const skip          = (page - 1) * limit;

    const where = {
      AND: [
        search        ? { OR: [{ subject: { contains: search } }, { body: { contains: search } }, { senderName: { contains: search } }] } : {},
        recipientType ? { recipientType }                       : {},
        isRead !== null && isRead !== undefined && isRead !== ""
          ? { isRead: isRead === "true" }                       : {},
      ],
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: { class: true },
        orderBy: { sentAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const message = await prisma.message.create({
      data: {
        subject:       body.subject.trim(),
        body:          body.body.trim(),
        senderName:    body.senderName    || "Admin",
        senderRole:    body.senderRole    || "Admin",
        recipientType: body.recipientType,
        classId:       body.classId       ? parseInt(body.classId) : null,
        recipientName: body.recipientName || null,
        isRead:        false,
        sentAt:        new Date(),
      },
      include: { class: true },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}