import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search    = searchParams.get("search")    || "";
    const category  = searchParams.get("category")  || "";
    const priority  = searchParams.get("priority")  || "";
    const audience  = searchParams.get("audience")  || "";
    const published = searchParams.get("published");
    const page      = parseInt(searchParams.get("page")  || "1");
    const limit     = parseInt(searchParams.get("limit") || "20");
    const skip      = (page - 1) * limit;

    const where = {
      AND: [
        search   ? { OR: [{ title: { contains: search } }, { content: { contains: search } }] } : {},
        category ? { category }                : {},
        priority ? { priority }                : {},
        audience ? { targetAudience: audience } : {},
        published !== null && published !== undefined && published !== ""
          ? { isPublished: published === "true" } : {},
      ],
    };

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        orderBy: [{ priority: "desc" }, { publishDate: "desc" }],
        skip,
        take: limit,
      }),
      prisma.notice.count({ where }),
    ]);

    return NextResponse.json({ notices, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const notice = await prisma.notice.create({
      data: {
        title:          body.title.trim(),
        content:        body.content.trim(),
        category:       body.category,
        priority:       body.priority       || "NORMAL",
        targetAudience: body.targetAudience,
        publishDate:    body.publishDate    ? new Date(body.publishDate) : new Date(),
        expiryDate:     body.expiryDate     ? new Date(body.expiryDate)  : null,
        isPublished:    body.isPublished !== undefined ? body.isPublished : true,
      },
    });

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}