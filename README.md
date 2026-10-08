# EduSphere ERP

A complete campus management platform for schools, built with **Next.js 16**, **React 19**, **Prisma** and **MySQL**. EduSphere brings admissions, academics, attendance, examinations, finance, payroll and library operations together in one clean admin dashboard.

![Dashboard](screenshots/01-dashboard.png)

## Features

- **Dashboard** – live overview of students, staff, attendance, fee collection, payroll, syllabus progress and library stats with interactive charts
- **Students** – enrollment, profiles, promotions, alumni records and guardian details
- **Teachers & Staff** – employee records, class assignments, timetables and performance appraisals
- **Attendance** – daily attendance for students, teachers and staff, leave management and reports
- **Academics** – classes, sections, subjects, syllabus tracking and timetable builder
- **Exams & Results** – exam scheduling, marks entry, configurable grading, results and report cards
- **Finance** – fee structures, fee collection with receipts, defaulters, expenses, payroll and financial reports
- **Communication** – notices, messages and parent portal management
- **Library** – book catalog, issue/return, members and fine management

## Screenshots

| Students | Teachers |
| --- | --- |
| ![Students](screenshots/02-students.png) | ![Teachers](screenshots/03-teachers.png) |

| Fee Collection | Exam Schedule |
| --- | --- |
| ![Fee Collection](screenshots/04-fee-collection.png) | ![Exam Schedule](screenshots/05-exam-schedule.png) |

| Library |
| --- |
| ![Library](screenshots/06-library.png) |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Charts | Recharts |
| Data fetching | TanStack Query, Axios |
| ORM | Prisma |
| Database | MySQL |

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+

### Installation

```bash
git clone https://github.com/ahmadbajwa9932-netizen/edusphere-erp.git
cd edusphere-erp
npm install
```

Create a `.env` file in the project root (see `.env.example`):

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/edusphere"
```

Set up the database and seed base data (classes and grade configuration):

```bash
npx prisma db push
npm run seed
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
prisma/
  schema.prisma        # Database schema
  seed.js              # Base seed data
src/
  app/
    (dashboard)/       # Admin dashboard pages
    api/               # REST API route handlers
  components/          # Sidebar and reusable UI components
  lib/                 # Prisma client and API helpers
screenshots/           # App screenshots
```

## License

This project is available for personal and educational use.
