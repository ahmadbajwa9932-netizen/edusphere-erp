import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search")   || "";
    const category = searchParams.get("category") || "";
    const status   = searchParams.get("status")   || "";
    const language = searchParams.get("language") || "";
    const page     = parseInt(searchParams.get("page")  || "1");
    const limit    = parseInt(searchParams.get("limit") || "20");
    const skip     = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { title:     { contains: search } },
            { author:    { contains: search } },
            { isbn:      { contains: search } },
            { publisher: { contains: search } },
          ],
        } : {},
        category ? { category } : {},
        status   ? { status }   : {},
        language ? { language } : {},
      ],
    };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          _count: { select: { issues: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.book.count({ where }),
    ]);

    return NextResponse.json({ books, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Check duplicate ISBN
    if (body.isbn) {
      const existing = await prisma.book.findUnique({ where: { isbn: body.isbn.trim() } });
      if (existing) {
        return NextResponse.json({ error: "A book with this ISBN already exists." }, { status: 409 });
      }
    }

    const totalCopies = parseInt(body.totalCopies) || 1;

    const book = await prisma.book.create({
      data: {
        title:           body.title.trim(),
        author:          body.author.trim(),
        isbn:            body.isbn?.trim()      || null,
        category:        body.category,
        publisher:       body.publisher?.trim() || null,
        publishYear:     body.publishYear       ? parseInt(body.publishYear) : null,
        totalCopies,
        availableCopies: totalCopies,
        shelf:           body.shelf?.trim()     || null,
        language:        body.language          || "Urdu",
        description:     body.description?.trim()|| null,
        status:          "AVAILABLE",
      },
      include: { _count: { select: { issues: true } } },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}