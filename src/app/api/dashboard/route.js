import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET() {
  try {
    const today     = new Date();
    const todayDate = today.toISOString().split("T")[0];
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const thisYear  = `${today.getFullYear()}-${String(today.getFullYear() + 1).slice(2)}`;

    // ── 1. STUDENTS ──────────────────────────────────────────────────────────
    const [totalStudents, activeStudents, newThisMonth] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.student.count({
        where: { admissionDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      }),
    ]);

    // ── 2. TEACHERS & STAFF ──────────────────────────────────────────────────
    const [totalTeachers, activeTeachers, totalStaff, activeStaff] = await Promise.all([
      prisma.teacher.count(),
      prisma.teacher.count({ where: { status: "ACTIVE" } }),
      prisma.staff.count(),
      prisma.staff.count({ where: { status: "ACTIVE" } }),
    ]);

    const totalClasses = await prisma.class.count();

    // ── 3. TODAY'S ATTENDANCE (detailed breakdown) ───────────────────────────
    const todayDt = new Date(todayDate);

    const [studAtt, teachAtt, staffAtt] = await Promise.all([
      prisma.studentAttendance.groupBy({ by: ["status"], where: { date: todayDt }, _count: true }),
      prisma.teacherAttendance.groupBy({ by: ["status"], where: { date: todayDt }, _count: true }),
      prisma.staffAttendance.groupBy({   by: ["status"], where: { date: todayDt }, _count: true }),
    ]);

    const attMap = (rows) => {
      const m = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
      rows.forEach((r) => { m[r.status] = r._count; });
      const total = Object.values(m).reduce((s, v) => s + v, 0);
      const presentPct = total > 0 ? Math.round(((m.PRESENT + m.LATE) / total) * 100) : null;
      return { ...m, total, presentPct };
    };

    const attendance = {
      students: attMap(studAtt),
      teachers: attMap(teachAtt),
      staff:    attMap(staffAtt),
    };

    // Attendance last 7 days for line chart (students)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const weeklyStudentAtt = await prisma.studentAttendance.groupBy({
      by: ["date", "status"],
      where: { date: { gte: sevenDaysAgo, lte: todayDt } },
      _count: true,
      orderBy: { date: "asc" },
    });

    const weeklyMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const key = d.toISOString().split("T")[0];
      weeklyMap[key] = { date: key, PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
    }
    weeklyStudentAtt.forEach((r) => {
      const key = r.date.toISOString().split("T")[0];
      if (weeklyMap[key]) weeklyMap[key][r.status] = r._count;
    });
    const weeklyAttendance = Object.values(weeklyMap).map((r) => ({
      date:    new Date(r.date).toLocaleDateString("en-PK", { weekday: "short", day: "numeric" }),
      Present: r.PRESENT + r.LATE,
      Absent:  r.ABSENT,
      Leave:   r.LEAVE,
    }));

    // ── 4. FINANCE ───────────────────────────────────────────────────────────
    const [feePaid, feeUnpaid, feePartial, feeOverdue,
           expPaid, expPending, payPaid, payPending, defaultersCount] = await Promise.all([
      prisma.feeCollection.aggregate({ where: { month: thisMonth, status: "PAID"    }, _sum: { amountPaid: true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { month: thisMonth, status: "UNPAID"  }, _sum: { amountDue:  true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { month: thisMonth, status: "PARTIAL" }, _sum: { amountDue: true, amountPaid: true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { month: thisMonth, status: "OVERDUE" }, _sum: { amountDue:  true }, _count: true }),
      prisma.expense.aggregate({ where: { academicYear: thisYear, status: "PAID"    }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { academicYear: thisYear, status: "PENDING" }, _sum: { amount: true } }),
      prisma.payroll.aggregate({ where: { month: thisMonth, status: "PAID"    }, _sum: { netSalary: true }, _count: true }),
      prisma.payroll.aggregate({ where: { month: thisMonth, status: "PENDING" }, _sum: { netSalary: true }, _count: true }),
      prisma.feeCollection.count({ where: { month: thisMonth, status: { in: ["UNPAID", "OVERDUE", "PARTIAL"] } } }),
    ]);

    const totalCollected = Number(feePaid._sum.amountPaid || 0) + Number(feePartial._sum.amountPaid || 0);
    const totalDue       = Number(feePaid._sum.amountPaid || 0)
                         + Number(feeUnpaid._sum.amountDue  || 0)
                         + Number(feePartial._sum.amountDue || 0)
                         + Number(feeOverdue._sum.amountDue || 0);
    const totalExpenses  = Number(expPaid._sum.amount || 0) + Number(payPaid._sum.netSalary || 0);

    const finance = {
      feeCollected:        totalCollected,
      feeDue:              totalDue,
      feePending:          Number(feeUnpaid._sum.amountDue  || 0)
                         + Number(feePartial._sum.amountDue || 0)
                         - Number(feePartial._sum.amountPaid|| 0),
      feeOverdue:          Number(feeOverdue._sum.amountDue || 0),
      collectionRate:      totalDue > 0 ? ((totalCollected / totalDue) * 100).toFixed(1) : "0.0",
      totalExpenses,
      expensesPaid:        Number(expPaid._sum.amount    || 0),
      expensesPending:     Number(expPending._sum.amount || 0),
      netBalance:          totalCollected - totalExpenses,
      payrollPaid:         Number(payPaid._sum.netSalary    || 0),
      payrollPending:      Number(payPending._sum.netSalary || 0),
      payrollPaidCount:    payPaid._count,
      payrollPendingCount: payPending._count,
      defaultersCount,
      feeStatusChart: [
        { name: "Collected", value: totalCollected,                                                                                              color: "#6366f1" },
        { name: "Pending",   value: Number(feeUnpaid._sum.amountDue  || 0),                                                                     color: "#f59e0b" },
        { name: "Overdue",   value: Number(feeOverdue._sum.amountDue || 0),                                                                     color: "#ef4444" },
        { name: "Partial",   value: Math.max(0, Number(feePartial._sum.amountDue || 0) - Number(feePartial._sum.amountPaid || 0)),              color: "#f97316" },
      ].filter((s) => s.value > 0),
      expenseBreakdown: [
        { name: "Operating", paid: Number(expPaid._sum.amount    || 0), pending: Number(expPending._sum.amount    || 0) },
        { name: "Payroll",   paid: Number(payPaid._sum.netSalary || 0), pending: Number(payPending._sum.netSalary || 0) },
      ],
    };

    // Monthly fee trend (last 6 months)
    const monthlyFeeRaw = await prisma.feeCollection.groupBy({
      by: ["month"],
      where: { month: { not: null } },
      _sum: { amountDue: true, amountPaid: true },
      orderBy: { month: "desc" },
      take: 6,
    });
    finance.monthlyFeeTrend = monthlyFeeRaw.reverse().map((r) => {
      const [y, mo] = r.month.split("-");
      return {
        month:     new Date(y, mo - 1).toLocaleString("en-PK", { month: "short", year: "2-digit" }),
        Collected: Number(r._sum.amountPaid || 0),
        Due:       Number(r._sum.amountDue  || 0),
      };
    });

    // ── 5. PENDING LEAVES ────────────────────────────────────────────────────
    const pendingLeaves = await prisma.leaveRequest.count({ where: { status: "PENDING" } });
    const recentLeaves  = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" }, orderBy: { appliedAt: "desc" }, take: 6,
      select: {
        id: true, leaveType: true, applicantType: true,
        fromDate: true, toDate: true, totalDays: true, appliedAt: true,
        student: { select: { firstName: true, lastName: true } },
        teacher: { select: { firstName: true, lastName: true } },
        staff:   { select: { firstName: true, lastName: true } },
      },
    });

    // ── 6. UPCOMING EXAMS ────────────────────────────────────────────────────
    const upcomingExams = await prisma.exam.findMany({
      where: { status: "SCHEDULED", date: { gte: today } },
      orderBy: { date: "asc" }, take: 6,
      include: {
        class:   { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    // ── 7. LIBRARY ───────────────────────────────────────────────────────────
    const [totalBooks, issuedBooks, overdueBooks, unpaidFines] = await Promise.all([
      prisma.book.aggregate({ _sum: { totalCopies: true, availableCopies: true } }),
      prisma.bookIssue.count({ where: { status: "ISSUED"  } }),
      prisma.bookIssue.count({ where: { status: "OVERDUE" } }),
      prisma.libraryFine.aggregate({ where: { status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { amount: true } }),
    ]);

    const library = {
      totalBooks:     Number(totalBooks._sum.totalCopies     || 0),
      availableBooks: Number(totalBooks._sum.availableCopies || 0),
      issuedBooks,
      overdueBooks,
      unpaidFines: Number(unpaidFines._sum.amount || 0),
      booksChart: [
        { name: "Available", value: Number(totalBooks._sum.availableCopies || 0), color: "#10b981" },
        { name: "Issued",    value: issuedBooks,                                  color: "#6366f1" },
        { name: "Overdue",   value: overdueBooks,                                 color: "#ef4444" },
      ].filter((s) => s.value > 0),
    };

    // ── 8. ACADEMICS ─────────────────────────────────────────────────────────
    const [totalSyllabus, completedSyllabus, inProgressSyllabus,
           scheduledExams, ongoingExams, completedExams] = await Promise.all([
      prisma.syllabus.count(),
      prisma.syllabus.count({ where: { status: "COMPLETED"   } }),
      prisma.syllabus.count({ where: { status: "IN_PROGRESS" } }),
      prisma.exam.count({ where: { status: "SCHEDULED" } }),
      prisma.exam.count({ where: { status: "ONGOING"   } }),
      prisma.exam.count({ where: { status: "COMPLETED" } }),
    ]);

    const academics = {
      totalSyllabus, completedSyllabus, inProgressSyllabus,
      plannedSyllabus: Math.max(0, totalSyllabus - completedSyllabus - inProgressSyllabus),
      syllabusCompletionPct: totalSyllabus > 0 ? Math.round((completedSyllabus / totalSyllabus) * 100) : 0,
      scheduledExams, ongoingExams, completedExams,
      syllabusChart: [
        { name: "Completed",   value: completedSyllabus,                                                    color: "#10b981" },
        { name: "In Progress", value: inProgressSyllabus,                                                   color: "#6366f1" },
        { name: "Planned",     value: Math.max(0, totalSyllabus - completedSyllabus - inProgressSyllabus),  color: "#d1d5db" },
      ].filter((s) => s.value > 0),
      examStatusChart: [
        { name: "Scheduled", value: scheduledExams, color: "#6366f1" },
        { name: "Ongoing",   value: ongoingExams,   color: "#f59e0b" },
        { name: "Completed", value: completedExams, color: "#10b981" },
      ].filter((s) => s.value > 0),
    };

    // ── 9. RECENT ADMISSIONS & NOTICES ───────────────────────────────────────
    const recentAdmissions = await prisma.student.findMany({
      orderBy: { admissionDate: "desc" }, take: 6,
      select: {
        studentId: true, firstName: true, lastName: true,
        admissionDate: true, status: true,
        class: { select: { name: true } },
      },
    });

    const recentNotices = await prisma.notice.findMany({
      where: { isPublished: true }, orderBy: { publishDate: "desc" }, take: 5,
      select: { id: true, title: true, category: true, priority: true, publishDate: true, targetAudience: true },
    });

    return NextResponse.json({
      students:  { total: totalStudents, active: activeStudents, newThisMonth },
      teachers:  { total: totalTeachers, active: activeTeachers },
      staff:     { total: totalStaff,    active: activeStaff    },
      totalClasses,
      attendance,
      weeklyAttendance,
      finance,
      pendingLeaves,
      recentLeaves: recentLeaves.map((l) => ({
        id: l.id, leaveType: l.leaveType, applicantType: l.applicantType,
        fromDate: l.fromDate, toDate: l.toDate, totalDays: l.totalDays, appliedAt: l.appliedAt,
        name: l.student
          ? `${l.student.firstName} ${l.student.lastName || ""}`.trim()
          : l.teacher
          ? `${l.teacher.firstName} ${l.teacher.lastName || ""}`.trim()
          : l.staff
          ? `${l.staff.firstName} ${l.staff.lastName || ""}`.trim()
          : "Unknown",
      })),
      upcomingExams: upcomingExams.map((e) => ({
        id: e.id, title: e.title, examType: e.examType,
        date: e.date, startTime: e.startTime, duration: e.duration,
        className: e.class.name, subject: e.subject.name, venue: e.venue,
      })),
      library,
      academics,
      recentAdmissions: recentAdmissions.map((s) => ({
        studentId: s.studentId,
        name: `${s.firstName} ${s.lastName || ""}`.trim(),
        className: s.class.name, admissionDate: s.admissionDate, status: s.status,
      })),
      recentNotices,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}