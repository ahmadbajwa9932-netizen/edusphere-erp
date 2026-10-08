import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const notice = await prisma.notice.findUnique({ where: { id: parseInt(id) } });
    if (!notice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const data   = {};

    if (body.title          !== undefined) data.title          = body.title.trim();
    if (body.content        !== undefined) data.content        = body.content.trim();
    if (body.category       !== undefined) data.category       = body.category;
    if (body.priority       !== undefined) data.priority       = body.priority;
    if (body.targetAudience !== undefined) data.targetAudience = body.targetAudience;
    if (body.publishDate    !== undefined) data.publishDate    = body.publishDate ? new Date(body.publishDate) : new Date();
    if (body.expiryDate     !== undefined) data.expiryDate     = body.expiryDate  ? new Date(body.expiryDate)  : null;
    if (body.isPublished    !== undefined) data.isPublished    = body.isPublished;

    const notice = await prisma.notice.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.notice.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}