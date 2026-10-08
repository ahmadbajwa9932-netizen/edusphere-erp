import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const message = await prisma.message.findUnique({
      where: { id: parseInt(id) },
      include: { class: true },
    });
    if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const data   = {};

    if (body.isRead        !== undefined) data.isRead        = body.isRead;
    if (body.subject       !== undefined) data.subject       = body.subject.trim();
    if (body.body          !== undefined) data.body          = body.body.trim();
    if (body.senderName    !== undefined) data.senderName    = body.senderName;
    if (body.recipientType !== undefined) data.recipientType = body.recipientType;
    if (body.classId       !== undefined) data.classId       = body.classId ? parseInt(body.classId) : null;
    if (body.recipientName !== undefined) data.recipientName = body.recipientName || null;

    const message = await prisma.message.update({
      where: { id: parseInt(id) },
      data,
      include: { class: true },
    });
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.message.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}