import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const member  = await prisma.libraryMember.findUnique({
      where:   { id: parseInt(id) },
      include: { class: true },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const data   = {};

    if (body.name            !== undefined) data.name            = body.name.trim();
    if (body.memberType      !== undefined) data.memberType      = body.memberType;
    if (body.referenceId     !== undefined) data.referenceId     = body.referenceId?.trim() || null;
    if (body.classId         !== undefined) data.classId         = body.classId ? parseInt(body.classId) : null;
    if (body.phone           !== undefined) data.phone           = body.phone?.trim()   || null;
    if (body.email           !== undefined) data.email           = body.email?.trim()   || null;
    if (body.address         !== undefined) data.address         = body.address?.trim() || null;
    if (body.membershipStart !== undefined) data.membershipStart = body.membershipStart ? new Date(body.membershipStart) : new Date();
    if (body.membershipEnd   !== undefined) data.membershipEnd   = body.membershipEnd   ? new Date(body.membershipEnd)   : null;
    if (body.status          !== undefined) data.status          = body.status;
    if (body.totalIssued     !== undefined) data.totalIssued     = parseInt(body.totalIssued);

    const member = await prisma.libraryMember.update({
      where:   { id: parseInt(id) },
      data,
      include: { class: true },
    });

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.libraryMember.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}