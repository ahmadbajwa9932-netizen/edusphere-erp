import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: {
        issues: {
          orderBy: { issueDate: "desc" },
          take: 10,
        },
        _count: { select: { issues: true } },
      },
    });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
    return NextResponse.json(book);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const data   = {};

    if (body.title       !== undefined) data.title       = body.title.trim();
    if (body.author      !== undefined) data.author      = body.author.trim();
    if (body.isbn        !== undefined) data.isbn        = body.isbn?.trim() || null;
    if (body.category    !== undefined) data.category    = body.category;
    if (body.publisher   !== undefined) data.publisher   = body.publisher?.trim() || null;
    if (body.publishYear !== undefined) data.publishYear = body.publishYear ? parseInt(body.publishYear) : null;
    if (body.shelf       !== undefined) data.shelf       = body.shelf?.trim() || null;
    if (body.language    !== undefined) data.language    = body.language;
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.status      !== undefined) data.status      = body.status;

    // Handle copy count update
    if (body.totalCopies !== undefined) {
      const current     = await prisma.book.findUnique({ where: { id: parseInt(id) } });
      const diff        = parseInt(body.totalCopies) - current.totalCopies;
      data.totalCopies     = parseInt(body.totalCopies);
      data.availableCopies = Math.max(0, current.availableCopies + diff);
    }

    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data,
      include: { _count: { select: { issues: true } } },
    });

    return NextResponse.json(book);
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "ISBN already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check active issues
    const activeIssues = await prisma.bookIssue.count({
      where: { bookId: parseInt(id), status: "ISSUED" },
    });
    if (activeIssues > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${activeIssues} copy(s) currently issued.` },
        { status: 409 }
      );
    }

    await prisma.book.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}