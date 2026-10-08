import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// |------------------------------------------|
// |              Studnets routes             |
// |------------------------------------------|

// Students 
export const studentsApi = {
  getAll: (params) => api.get("/students", { params }).then(r => r.data),
  getOne: (id) => api.get(`/students/${id}`).then(r => r.data),
  create: (data) => api.post("/students", data).then(r => r.data),
  update: (id, data) => api.put(`/students/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/students/${id}`).then(r => r.data),
};

// Classes routes
// export const classesApi = {
//   getAll: () => api.get("/classes").then(r => r.data),
//   create: (data) => api.post("/classes", data).then(r => r.data),
// };

export const classesApi = {
  getAll: () => axios.get("/api/classes").then((r) => r.data),
  getOne: (id) => axios.get(`/api/classes/${id}`).then((r) => r.data),
  create: (data) => axios.post("/api/classes", data).then((r) => r.data),
  update: (id, data) => axios.put(`/api/classes/${id}`, data).then((r) => r.data),
  delete: (id) => axios.delete(`/api/classes/${id}`).then((r) => r.data),
};
 
export const teachersApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.department) query.set("department", params.department);
    if (params.status) query.set("status", params.status);
    if (params.employmentType) query.set("employmentType", params.employmentType);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    return axios.get(`/api/teachers?${query}`).then((r) => r.data);
  },
 
  getOne: (id) => axios.get(`/api/teachers/${id}`).then((r) => r.data),
  create: (data) => axios.post("/api/teachers", data).then((r) => r.data),
  update: (id, data) => axios.put(`/api/teachers/${id}`, data).then((r) => r.data),
  delete: (id) => axios.delete(`/api/teachers/${id}`).then((r) => r.data),
};

// ─── Add these to your existing src/lib/api.js ───────────────────────────────

export const timetableApi = {
  // Slots
  getSlots: () =>
    axios.get("/api/timetable/slots").then((r) => r.data),

  createSlot: (data) =>
    axios.post("/api/timetable/slots", data).then((r) => r.data),

  updateSlot: (id, data) =>
    axios.put(`/api/timetable/slots/${id}`, data).then((r) => r.data),

  deleteSlot: (id) =>
    axios.delete(`/api/timetable/slots/${id}`).then((r) => r.data),

  // Entries
  getEntries: (params = {}) => {
    const query = new URLSearchParams();
    if (params.classId)   query.set("classId",   params.classId);
    if (params.teacherId) query.set("teacherId", params.teacherId);
    if (params.day)       query.set("day",       params.day);
    return axios.get(`/api/timetable/entries?${query}`).then((r) => r.data);
  },

  createEntry: (data) =>
    axios.post("/api/timetable/entries", data).then((r) => r.data),

  deleteEntry: (id) =>
    axios.delete(`/api/timetable/entries?id=${id}`).then((r) => r.data),
};

export const appraisalsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.teacherId) query.set("teacherId", params.teacherId);
    return axios.get(`/api/appraisals?${query}`).then((r) => r.data);
  },
  create: (data) =>
    axios.post("/api/appraisals", data).then((r) => r.data),
  delete: (id) =>
    axios.delete(`/api/appraisals/${id}`).then((r) => r.data),
};

// ─── Add these to your existing src/lib/api.js ───────────────────────────────

export const sectionsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.classId) query.set("classId", params.classId);
    return axios.get(`/api/sections?${query}`).then((r) => r.data);
  },
  create: (data) => axios.post("/api/sections", data).then((r) => r.data),
  update: (id, data) => axios.put(`/api/sections/${id}`, data).then((r) => r.data),
  delete: (id) => axios.delete(`/api/sections/${id}`).then((r) => r.data),
};

export const subjectsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.classId) query.set("classId", params.classId);
    if (params.search)  query.set("search",  params.search);
    return axios.get(`/api/subjects?${query}`).then((r) => r.data);
  },
  create: (data) => axios.post("/api/subjects", data).then((r) => r.data),
  update: (id, data) => axios.put(`/api/subjects/${id}`, data).then((r) => r.data),
  delete: (id) => axios.delete(`/api/subjects/${id}`).then((r) => r.data),
};

// ─── Add this to your existing src/lib/api.js ────────────────────────────────

export const syllabusApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.classId)   query.set("classId",   params.classId);
    if (params.subjectId) query.set("subjectId", params.subjectId);
    if (params.status)    query.set("status",    params.status);
    if (params.term)      query.set("term",      params.term);
    if (params.search)    query.set("search",    params.search);
    return axios.get(`/api/syllabus?${query}`).then((r) => r.data);
  },

  create: (data) =>
    axios.post("/api/syllabus", data).then((r) => r.data),

  update: (id, data) =>
    axios.put(`/api/syllabus/${id}`, data).then((r) => r.data),

  delete: (id) =>
    axios.delete(`/api/syllabus/${id}`).then((r) => r.data),
};

// ─── Add these to your existing src/lib/api.js ───────────────────────────────

export const noticesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)    query.set("search",    params.search);
    if (params.category)  query.set("category",  params.category);
    if (params.priority)  query.set("priority",  params.priority);
    if (params.audience)  query.set("audience",  params.audience);
    if (params.published !== undefined) query.set("published", params.published);
    if (params.page)      query.set("page",      params.page);
    if (params.limit)     query.set("limit",     params.limit);
    return axios.get(`/api/notices?${query}`).then((r) => r.data);
  },
  getOne:  (id)       => axios.get(`/api/notices/${id}`).then((r) => r.data),
  create:  (data)     => axios.post("/api/notices", data).then((r) => r.data),
  update:  (id, data) => axios.put(`/api/notices/${id}`, data).then((r) => r.data),
  delete:  (id)       => axios.delete(`/api/notices/${id}`).then((r) => r.data),
};

export const messagesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)        query.set("search",        params.search);
    if (params.recipientType) query.set("recipientType", params.recipientType);
    if (params.isRead !== undefined) query.set("isRead", params.isRead);
    if (params.page)          query.set("page",          params.page);
    if (params.limit)         query.set("limit",         params.limit);
    return axios.get(`/api/messages?${query}`).then((r) => r.data);
  },
  getOne:   (id)       => axios.get(`/api/messages/${id}`).then((r) => r.data),
  create:   (data)     => axios.post("/api/messages", data).then((r) => r.data),
  markRead: (id)       => axios.put(`/api/messages/${id}`, { isRead: true }).then((r) => r.data),
  delete:   (id)       => axios.delete(`/api/messages/${id}`).then((r) => r.data),
};

// ─── Add this to your existing src/lib/api.js ────────────────────────────────

export const parentsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)                          query.set("search",       params.search);
    if (params.portalAccess !== undefined)      query.set("portalAccess", params.portalAccess);
    if (params.page)                            query.set("page",         params.page);
    if (params.limit)                           query.set("limit",        params.limit);
    return axios.get(`/api/parents?${query}`).then((r) => r.data);
  },

  getOne: (id) =>
    axios.get(`/api/parents/${id}`).then((r) => r.data),

  create: (data) =>
    axios.post("/api/parents", data).then((r) => r.data),

  update: (id, data) =>
    axios.put(`/api/parents/${id}`, data).then((r) => r.data),

  delete: (id) =>
    axios.delete(`/api/parents/${id}`).then((r) => r.data),

  toggleAccess: (id, portalAccess) =>
    axios.put(`/api/parents/${id}`, { portalAccess }).then((r) => r.data),

  regeneratePin: (id) =>
    axios.put(`/api/parents/${id}`, { regeneratePin: true }).then((r) => r.data),
};

// ─── Add these to your existing src/lib/api.js ───────────────────────────────

export const booksApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)   query.set("search",   params.search);
    if (params.category) query.set("category", params.category);
    if (params.status)   query.set("status",   params.status);
    if (params.language) query.set("language", params.language);
    if (params.page)     query.set("page",     params.page);
    if (params.limit)    query.set("limit",    params.limit);
    return axios.get(`/api/books?${query}`).then((r) => r.data);
  },
  getOne:  (id)       => axios.get(`/api/books/${id}`).then((r) => r.data),
  create:  (data)     => axios.post("/api/books", data).then((r) => r.data),
  update:  (id, data) => axios.put(`/api/books/${id}`, data).then((r) => r.data),
  delete:  (id)       => axios.delete(`/api/books/${id}`).then((r) => r.data),
};

export const issuesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)       query.set("search",       params.search);
    if (params.status)       query.set("status",       params.status);
    if (params.borrowerType) query.set("borrowerType", params.borrowerType);
    if (params.bookId)       query.set("bookId",       params.bookId);
    if (params.overdue)      query.set("overdue",      params.overdue);
    if (params.page)         query.set("page",         params.page);
    if (params.limit)        query.set("limit",        params.limit);
    return axios.get(`/api/issues?${query}`).then((r) => r.data);
  },
  create:   (data)     => axios.post("/api/issues", data).then((r) => r.data),
  return:   (id, data) => axios.put(`/api/issues/${id}`, { action: "return", ...data }).then((r) => r.data),
  payFine:  (id)       => axios.put(`/api/issues/${id}`, { action: "payFine" }).then((r) => r.data),
  markLost: (id, fine) => axios.put(`/api/issues/${id}`, { action: "lost", fineAmount: fine }).then((r) => r.data),
  delete:   (id)       => axios.delete(`/api/issues/${id}`).then((r) => r.data),
};

// ─── Add this to your existing src/lib/api.js ────────────────────────────────

export const libraryMembersApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)     query.set("search",     params.search);
    if (params.memberType) query.set("memberType", params.memberType);
    if (params.status)     query.set("status",     params.status);
    if (params.classId)    query.set("classId",    params.classId);
    if (params.page)       query.set("page",       params.page);
    if (params.limit)      query.set("limit",      params.limit);
    return axios.get(`/api/library-members?${query}`).then((r) => r.data);
  },
  getOne:  (id)       => axios.get(`/api/library-members/${id}`).then((r) => r.data),
  create:  (data)     => axios.post("/api/library-members", data).then((r) => r.data),
  update:  (id, data) => axios.put(`/api/library-members/${id}`, data).then((r) => r.data),
  delete:  (id)       => axios.delete(`/api/library-members/${id}`).then((r) => r.data),
};

// ─── Add this to your existing src/lib/api.js ────────────────────────────────

export const libraryFinesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)   query.set("search",   params.search);
    if (params.fineType) query.set("fineType", params.fineType);
    if (params.status)   query.set("status",   params.status);
    if (params.page)     query.set("page",      params.page);
    if (params.limit)    query.set("limit",     params.limit);
    return axios.get(`/api/library-fines?${query}`).then((r) => r.data);
  },

  getOne:      (id)              => axios.get(`/api/library-fines/${id}`).then((r) => r.data),
  create:      (data)            => axios.post("/api/library-fines", data).then((r) => r.data),
  update:      (id, data)        => axios.put(`/api/library-fines/${id}`, data).then((r) => r.data),
  payFull:     (id, remarks)     => axios.put(`/api/library-fines/${id}`, { action: "payFull",     remarks }).then((r) => r.data),
  payPartial:  (id, amt, remarks)=> axios.put(`/api/library-fines/${id}`, { action: "payPartial",  payAmount: amt, remarks }).then((r) => r.data),
  waive:       (id, remarks)     => axios.put(`/api/library-fines/${id}`, { action: "waive",       remarks }).then((r) => r.data),
  delete:      (id)              => axios.delete(`/api/library-fines/${id}`).then((r) => r.data),
};

// ─── ADD THIS TO YOUR EXISTING src/lib/api.js ────────────────────────────────

export const staffApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)         query.set("search",         params.search);
    if (params.department)     query.set("department",     params.department);
    if (params.status)         query.set("status",         params.status);
    if (params.employmentType) query.set("employmentType", params.employmentType);
    if (params.page)           query.set("page",           params.page);
    if (params.limit)          query.set("limit",          params.limit);
    return axios.get(`/api/staff?${query}`).then((r) => r.data);
  },
  getOne: (id) =>
    axios.get(`/api/staff/${id}`).then((r) => r.data),
  create: (data) =>
    axios.post("/api/staff", data).then((r) => r.data),
  update: (id, data) =>
    axios.put(`/api/staff/${id}`, data).then((r) => r.data),
  delete: (id) =>
    axios.delete(`/api/staff/${id}`).then((r) => r.data),
};

export const studentAttendanceApi = {
  get: (params) => {
    const query = new URLSearchParams();
    if (params.date)    query.set("date",    params.date);
    if (params.classId) query.set("classId", params.classId);
    return axios.get(`/api/attendance/students?${query}`).then((r) => r.data);
  },
  save: (data) => axios.post("/api/attendance/students", data).then((r) => r.data),
};

export const teacherAttendanceApi = {
  get: (params) => {
    const query = new URLSearchParams();
    if (params.date)       query.set("date",       params.date);
    if (params.department) query.set("department", params.department);
    return axios.get(`/api/attendance/teachers?${query}`).then((r) => r.data);
  },
  save: (data) => axios.post("/api/attendance/teachers", data).then((r) => r.data),
};

export const staffAttendanceApi = {
  get: (params) => {
    const query = new URLSearchParams();
    if (params.date)       query.set("date",       params.date);
    if (params.department) query.set("department", params.department);
    return axios.get(`/api/attendance/staff?${query}`).then((r) => r.data);
  },
  save: (data) => axios.post("/api/attendance/staff", data).then((r) => r.data),
};

export const attendanceReportApi = {
  get: (params = {}) => {
    const query = new URLSearchParams();
    if (params.type)       query.set("type",       params.type);
    if (params.from)       query.set("from",       params.from);
    if (params.to)         query.set("to",         params.to);
    if (params.classId)    query.set("classId",    params.classId);
    if (params.teacherId)  query.set("teacherId",  params.teacherId);
    if (params.department) query.set("department", params.department);
    if (params.status)     query.set("status",     params.status);
    if (params.page)       query.set("page",       params.page);
    if (params.limit)      query.set("limit",      params.limit);
    return axios.get(`/api/attendance/report?${query}`).then((r) => r.data);
  },
};

export const leavesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.applicantType) query.set("applicantType", params.applicantType);
    if (params.status)        query.set("status",        params.status);
    if (params.leaveType)     query.set("leaveType",     params.leaveType);
    if (params.search)        query.set("search",        params.search);
    if (params.classId)       query.set("classId",       params.classId);
    if (params.department)    query.set("department",    params.department);
    if (params.from)          query.set("from",          params.from);
    if (params.to)            query.set("to",            params.to);
    if (params.page)          query.set("page",          params.page);
    if (params.limit)         query.set("limit",         params.limit);
    return axios.get(`/api/leaves?${query}`).then((r) => r.data);
  },
  create:  (data)           => axios.post("/api/leaves", data).then((r) => r.data),
  approve: (id, remarks)    => axios.patch(`/api/leaves/${id}`, { status: "APPROVED",  remarks }).then((r) => r.data),
  reject:  (id, remarks)    => axios.patch(`/api/leaves/${id}`, { status: "REJECTED",  remarks }).then((r) => r.data),
  cancel:  (id, remarks)    => axios.patch(`/api/leaves/${id}`, { status: "CANCELLED", remarks }).then((r) => r.data),
  delete:  (id)             => axios.delete(`/api/leaves/${id}`).then((r) => r.data),
};

export const examsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)    query.set("search",    params.search);
    if (params.classId)   query.set("classId",   params.classId);
    if (params.subjectId) query.set("subjectId", params.subjectId);
    if (params.examType)  query.set("examType",  params.examType);
    if (params.status)    query.set("status",    params.status);
    if (params.page)      query.set("page",      params.page);
    if (params.limit)     query.set("limit",     params.limit);
    return axios.get(`/api/exams?${query}`).then((r) => r.data);
  },
  getOne:  (id)       => axios.get(`/api/exams/${id}`).then((r) => r.data),
  create:  (data)     => axios.post("/api/exams", data).then((r) => r.data),
  update:  (id, data) => axios.put(`/api/exams/${id}`, data).then((r) => r.data),
  delete:  (id)       => axios.delete(`/api/exams/${id}`).then((r) => r.data),
};

// Marks Entry
export const examMarksApi = {
  get:  (examId) => axios.get(`/api/marks?examId=${examId}`).then((r) => r.data),
  save: (data)   => axios.post("/api/marks", data).then((r) => r.data),
};

export const resultsApi = {
  get: (params = {}) => {
    const query = new URLSearchParams();
    if (params.examId)    query.set("examId",    params.examId);
    if (params.classId)   query.set("classId",   params.classId);
    if (params.subjectId) query.set("subjectId", params.subjectId);
    if (params.search)    query.set("search",    params.search);
    if (params.status)    query.set("status",    params.status);
    if (params.page)      query.set("page",      params.page);
    if (params.limit)     query.set("limit",     params.limit);
    return axios.get(`/api/results?${query}`).then((r) => r.data);
  },
};

export const reportCardsApi = {
  get: (params = {}) => {
    const query = new URLSearchParams();
    if (params.classId)  query.set("classId",  params.classId);
    if (params.examType) query.set("examType", params.examType);
    if (params.search)   query.set("search",   params.search);
    if (params.page)     query.set("page",     params.page);
    if (params.limit)    query.set("limit",    params.limit);
    return axios.get(`/api/report-cards?${query}`).then((r) => r.data);
  },
};
export const gradeConfigApi = {
  getAll: () =>
    axios.get("/api/grade-config").then((r) => r.data),
  create: (data) =>
    axios.post("/api/grade-config", data).then((r) => r.data),
  update: (id, data) =>
    axios.put(`/api/grade-config/${id}`, data).then((r) => r.data),
  delete: (id) =>
    axios.delete(`/api/grade-config/${id}`).then((r) => r.data),
};

export const feeStructuresApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)       query.set("search",       params.search);
    if (params.classId)      query.set("classId",      params.classId);
    if (params.feeType)      query.set("feeType",      params.feeType);
    if (params.frequency)    query.set("frequency",    params.frequency);
    if (params.academicYear) query.set("academicYear", params.academicYear);
    if (params.isActive !== undefined && params.isActive !== "")
                             query.set("isActive",     params.isActive);
    if (params.page)         query.set("page",         params.page);
    if (params.limit)        query.set("limit",        params.limit);
    return axios.get(`/api/fee-structures?${query}`).then((r) => r.data);
  },
  getOne:  (id)       => axios.get(`/api/fee-structures/${id}`).then((r) => r.data),
  create:  (data)     => axios.post("/api/fee-structures", data).then((r) => r.data),
  update:  (id, data) => axios.put(`/api/fee-structures/${id}`, data).then((r) => r.data),
  delete:  (id)       => axios.delete(`/api/fee-structures/${id}`).then((r) => r.data),
  toggleActive: (id, isActive) =>
    axios.put(`/api/fee-structures/${id}`, { isActive }).then((r) => r.data),
};

// ─── Add this to your existing src/lib/api.js ────────────────────────────────

export const feeCollectionsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)         query.set("search",         params.search);
    if (params.classId)        query.set("classId",        params.classId);
    if (params.feeStructureId) query.set("feeStructureId", params.feeStructureId);
    if (params.status)         query.set("status",         params.status);
    if (params.month)          query.set("month",          params.month);
    if (params.page)           query.set("page",           params.page);
    if (params.limit)          query.set("limit",          params.limit);
    return axios.get(`/api/fee-collections?${query}`).then((r) => r.data);
  },

  getOne: (id) =>
    axios.get(`/api/fee-collections/${id}`).then((r) => r.data),

  generate: (data) =>
    axios.post("/api/fee-collections", data).then((r) => r.data),

  recordPayment: (id, data) =>
    axios.put(`/api/fee-collections/${id}`, data).then((r) => r.data),

  delete: (id) =>
    axios.delete(`/api/fee-collections/${id}`).then((r) => r.data),
};

// ─── Add this to your existing src/lib/api.js ────────────────────────────────

export const defaultersApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)   query.set("search",   params.search);
    if (params.classId)  query.set("classId",  params.classId);
    if (params.month)    query.set("month",    params.month);
    if (params.severity) query.set("severity", params.severity);
    if (params.minDays)  query.set("minDays",  params.minDays);
    if (params.page)     query.set("page",     params.page);
    if (params.limit)    query.set("limit",    params.limit);
    return axios.get(`/api/defaulters?${query}`).then((r) => r.data);
  },

  markOverdue: (ids) =>
    axios.patch("/api/defaulters", { ids }).then((r) => r.data),
};

export const expensesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)        query.set("search",        params.search);
    if (params.category)      query.set("category",      params.category);
    if (params.status)        query.set("status",        params.status);
    if (params.paymentMethod) query.set("paymentMethod", params.paymentMethod);
    if (params.academicYear)  query.set("academicYear",  params.academicYear);
    if (params.from)          query.set("from",          params.from);
    if (params.to)            query.set("to",            params.to);
    if (params.page)          query.set("page",          params.page);
    if (params.limit)         query.set("limit",         params.limit);
    return axios.get(`/api/expenses?${query}`).then((r) => r.data);
  },

  getOne:  (id)       => axios.get(`/api/expenses/${id}`).then((r) => r.data),
  create:  (data)     => axios.post("/api/expenses", data).then((r) => r.data),
  update:  (id, data) => axios.put(`/api/expenses/${id}`, data).then((r) => r.data),
  delete:  (id)       => axios.delete(`/api/expenses/${id}`).then((r) => r.data),
};

export const payrollApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search)       query.set("search",       params.search);
    if (params.employeeType) query.set("employeeType", params.employeeType);
    if (params.status)       query.set("status",       params.status);
    if (params.month)        query.set("month",        params.month);
    if (params.academicYear) query.set("academicYear", params.academicYear);
    if (params.department)   query.set("department",   params.department);
    if (params.page)         query.set("page",         params.page);
    if (params.limit)        query.set("limit",        params.limit);
    return axios.get(`/api/payroll?${query}`).then((r) => r.data);
  },

  getOne: (id) =>
    axios.get(`/api/payroll/${id}`).then((r) => r.data),

  // Bulk generate payroll for a month
  generate: (data) =>
    axios.post("/api/payroll", data).then((r) => r.data),

  // Update bonus/deduction/status/remarks etc.
  update: (id, data) =>
    axios.put(`/api/payroll/${id}`, data).then((r) => r.data),

  // Mark as PAID shorthand
  markPaid: (id, { paymentMethod, paidBy, remarks } = {}) =>
    axios.put(`/api/payroll/${id}`, {
      status: "PAID",
      paymentMethod,
      paidBy,
      remarks,
    }).then((r) => r.data),

  // Revert to PENDING
  markPending: (id) =>
    axios.put(`/api/payroll/${id}`, { status: "PENDING" }).then((r) => r.data),

  // Cancel a payroll record
  cancel: (id, remarks) =>
    axios.put(`/api/payroll/${id}`, { status: "CANCELLED", remarks }).then((r) => r.data),

  delete: (id) =>
    axios.delete(`/api/payroll/${id}`).then((r) => r.data),
};

export const financeReportsApi = {
  get: (params = {}) => {
    const query = new URLSearchParams();
    if (params.academicYear) query.set("academicYear", params.academicYear);
    if (params.month)        query.set("month",        params.month);
    if (params.from)         query.set("from",         params.from);
    if (params.to)           query.set("to",           params.to);
    if (params.classId)      query.set("classId",      params.classId);
    return axios.get(`/api/finance/reports?${query}`).then((r) => r.data);
  },
};

export const dashboardApi = {
  get: () => axios.get("/api/dashboard").then((r) => r.data),
};