import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

function calcGrade(score) {
  if (score >= 4.5) return "Excellent";
  if (score >= 3.5) return "Good";
  if (score >= 2.5) return "Average";
  return "Needs Improvement";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");

    const appraisals = await prisma.appraisal.findMany({
      where: teacherId ? { teacherId: parseInt(teacherId) } : {},
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { reviewDate: "desc" },
    });

    return NextResponse.json(appraisals);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const scores = [
      parseFloat(body.punctuality),
      parseFloat(body.teachingQuality),
      parseFloat(body.studentResults),
      parseFloat(body.discipline),
      parseFloat(body.communication),
    ];

    const overallScore = parseFloat(
      (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
    );
    const grade = calcGrade(overallScore);

    const appraisal = await prisma.appraisal.create({
      data: {
        teacherId:      parseInt(body.teacherId),
        reviewDate:     new Date(body.reviewDate),
        reviewedBy:     body.reviewedBy,
        punctuality:    scores[0],
        teachingQuality:scores[1],
        studentResults: scores[2],
        discipline:     scores[3],
        communication:  scores[4],
        overallScore,
        grade,
        remarks:        body.remarks || null,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    });

    return NextResponse.json(appraisal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}