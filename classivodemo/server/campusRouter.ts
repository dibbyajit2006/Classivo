import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { attendance, cameraEvents, classAssignments, classNotes, complaints, notifications, students, teachers } from "../drizzle/schema";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";

async function findStudent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; email?: string | null }) {
  const [byUser] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
  if (byUser) return byUser;
  const email = user.email?.trim().toLowerCase();
  if (!email) return undefined;
  const [byEmail] = await db.select().from(students).where(eq(students.email, email)).limit(1);
  if (!byEmail || (byEmail.userId !== null && byEmail.userId !== user.id)) return undefined;
  await db.update(students).set({ userId: user.id }).where(eq(students.id, byEmail.id));
  return { ...byEmail, userId: user.id };
}

async function findTeacher(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; email?: string | null }) {
  const [byUser] = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
  if (byUser) return byUser;
  const email = user.email?.trim().toLowerCase();
  if (!email) return undefined;
  const [byEmail] = await db.select().from(teachers).where(eq(teachers.email, email)).limit(1);
  if (!byEmail || (byEmail.userId !== null && byEmail.userId !== user.id)) return undefined;
  await db.update(teachers).set({ userId: user.id }).where(eq(teachers.id, byEmail.id));
  return { ...byEmail, userId: user.id };
}

async function activeAssignments(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, teacherId: number) {
  return db.select().from(classAssignments).where(and(eq(classAssignments.teacherId, teacherId), eq(classAssignments.active, true)));
}

async function ensureTeacher(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; email?: string | null; role: string }) {
  if (user.role === "admin") return undefined;
  const teacher = await findTeacher(db, user);
  if (!teacher) throw new TRPCError({ code: "FORBIDDEN", message: "No teacher profile is linked to this college account." });
  return teacher;
}

async function teacherClassIds(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; email?: string | null; role: string }) {
  if (user.role === "admin") {
    const rows = await db.selectDistinct({ classId: classAssignments.classId }).from(classAssignments).where(eq(classAssignments.active, true));
    return rows.map((row) => row.classId);
  }
  const teacher = await ensureTeacher(db, user);
  if (!teacher) return [];
  const assignments = await activeAssignments(db, teacher.id);
  return Array.from(new Set(assignments.map((row) => row.classId)));
}

async function notifyAssignedTeachers(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  classId: string,
  subjectId: string,
  eventId: number,
  title: string,
  message: string,
  now: number,
) {
  const assigned = await db.select({ userId: teachers.userId }).from(classAssignments)
    .innerJoin(teachers, eq(classAssignments.teacherId, teachers.id))
    .where(and(eq(classAssignments.classId, classId), eq(classAssignments.subjectId, subjectId), eq(classAssignments.active, true)));
  const recipients = Array.from(new Set(assigned.flatMap((row) => row.userId === null ? [] : [row.userId])));
  if (recipients.length) await db.insert(notifications).values(recipients.map((recipientId) => ({ recipientId, eventId, title, message, priority: "normal" as const, isRead: false, createdAt: now })));
}

export const campusRouter = router({
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const student = await findStudent(db, ctx.user);
    const teacher = await findTeacher(db, ctx.user);
    const assignments = teacher ? await activeAssignments(db, teacher.id) : [];
    const studentAssignments = student ? await db.select({
      classId: classAssignments.classId,
      subjectId: classAssignments.subjectId,
      teacherName: teachers.name,
      teacherEmail: teachers.email,
    }).from(classAssignments).innerJoin(teachers, eq(classAssignments.teacherId, teachers.id))
      .where(and(eq(classAssignments.classId, student.classId), eq(classAssignments.active, true))) : [];
    return {
      userId: ctx.user.id,
      name: ctx.user.name ?? "Campus user",
      email: ctx.user.email ?? null,
      portalRole: ctx.user.role === "admin" ? "admin" : student ? "student" : teacher ? "teacher" : "unassigned",
      student: student ? { id: student.id, name: student.name, email: student.email, rollNumber: student.rollNumber, classId: student.classId, department: student.department } : null,
      teacher: teacher ? { id: teacher.id, name: teacher.name, email: teacher.email, department: teacher.department, assignments: assignments.map(({ classId, subjectId }) => ({ classId, subjectId })) } : null,
      studentSubjects: studentAssignments,
    };
  }),

  listTeacherStudents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const classIds = await teacherClassIds(db, ctx.user);
    if (!classIds.length) return [];
    const roster = await db.select().from(students).where(and(eq(students.status, "active"), inArray(students.classId, classIds)));
    if (!roster.length) return [];
    const studentIds = roster.map((row) => row.id);
    const records = await db.select().from(attendance).where(inArray(attendance.studentId, studentIds)).orderBy(desc(attendance.markedAt));
    let scopedRecords = records;
    if (ctx.user.role !== "admin") {
      const teacher = await ensureTeacher(db, ctx.user);
      if (!teacher) return [];
      const assignments = await activeAssignments(db, teacher.id);
      const allowedPairs = new Set(assignments.map((item) => `${item.classId}\u0000${item.subjectId}`));
      scopedRecords = records.filter((record) => allowedPairs.has(`${record.classId}\u0000${record.subject}`));
    }
    const today = new Date().toISOString().slice(0, 10);
    const byStudent = new Map<number, typeof records>();
    for (const record of scopedRecords) byStudent.set(record.studentId, [...(byStudent.get(record.studentId) ?? []), record]);
    return roster.map((student) => {
      const own = byStudent.get(student.id) ?? [];
      const decided = own.filter((row) => row.reviewStatus !== "pending");
      const present = decided.filter((row) => row.status === "present" && row.reviewStatus === "approved").length;
      const attendancePct = decided.length ? Math.round((present / decided.length) * 100) : 0;
      const todayRecord = own.find((row) => row.attendanceDate === today);
      const status = todayRecord?.reviewStatus === "pending" ? "Pending review" : todayRecord?.status === "present" && todayRecord.reviewStatus === "approved" ? "Present" : todayRecord ? "Absent" : "No record";
      return { id: student.id, name: student.name, email: student.email ?? "", roll: student.rollNumber, classId: student.classId, department: student.department, attendance: attendancePct, status };
    });
  }),

  listTeacherAttendance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const classIds = await teacherClassIds(db, ctx.user);
    if (!classIds.length) return [];
    return db.select({
      id: attendance.id,
      studentId: attendance.studentId,
      studentName: students.name,
      rollNumber: students.rollNumber,
      classId: attendance.classId,
      subject: attendance.subject,
      attendanceDate: attendance.attendanceDate,
      markedAt: attendance.markedAt,
      status: attendance.status,
      reviewStatus: attendance.reviewStatus,
      confidence: attendance.confidence,
      evidenceUrl: attendance.evidenceUrl,
    }).from(attendance).innerJoin(students, eq(attendance.studentId, students.id))
      .where(inArray(attendance.classId, classIds)).orderBy(desc(attendance.markedAt)).limit(500)
      .then(async (rows) => {
        if (ctx.user.role === "admin") return rows;
        const teacher = await ensureTeacher(db, ctx.user);
        if (!teacher) return [];
        const assignments = await activeAssignments(db, teacher.id);
        const allowed = new Set(assignments.map((item) => `${item.classId}\u0000${item.subjectId}`));
        return rows.filter((row) => allowed.has(`${row.classId}\u0000${row.subject}`));
      });
  }),

  listMyAttendance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const student = await findStudent(db, ctx.user);
    if (!student) return [];
    return db.select({ id: attendance.id, classId: attendance.classId, subject: attendance.subject, attendanceDate: attendance.attendanceDate, markedAt: attendance.markedAt, status: attendance.status, reviewStatus: attendance.reviewStatus, confidence: attendance.confidence, evidenceUrl: attendance.evidenceUrl })
      .from(attendance).where(eq(attendance.studentId, student.id)).orderBy(desc(attendance.markedAt)).limit(200);
  }),

  listClassNotes: protectedProcedure.input(z.object({ view: z.enum(["student", "teacher"]) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    if (input.view === "student") {
      const student = await findStudent(db, ctx.user);
      if (!student) return [];
      return db.select({ id: classNotes.id, classId: classNotes.classId, subject: classNotes.subjectId, topic: classNotes.topic, content: classNotes.content, fileUrl: classNotes.fileUrl, createdAt: classNotes.createdAt, teacherName: teachers.name, teacherEmail: teachers.email })
        .from(classNotes).innerJoin(classAssignments, and(eq(classAssignments.classId, classNotes.classId), eq(classAssignments.subjectId, classNotes.subjectId), eq(classAssignments.teacherId, classNotes.teacherId), eq(classAssignments.active, true)))
        .innerJoin(teachers, eq(classNotes.teacherId, teachers.id))
        .where(and(eq(classNotes.classId, student.classId), eq(classNotes.status, "published"))).orderBy(desc(classNotes.createdAt)).limit(100);
    }
    const teacher = await ensureTeacher(db, ctx.user);
    if (!teacher) return [];
    return db.select({ id: classNotes.id, classId: classNotes.classId, subject: classNotes.subjectId, topic: classNotes.topic, content: classNotes.content, fileUrl: classNotes.fileUrl, createdAt: classNotes.createdAt, teacherName: teachers.name, teacherEmail: teachers.email })
      .from(classNotes).innerJoin(teachers, eq(classNotes.teacherId, teachers.id))
      .where(eq(classNotes.teacherId, teacher.id)).orderBy(desc(classNotes.createdAt)).limit(100);
  }),

  createComplaint: protectedProcedure.input(z.object({
    category: z.string().min(2).max(80), title: z.string().min(3).max(220),
    description: z.string().min(3).max(4000), location: z.string().min(2).max(180),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const student = await findStudent(db, ctx.user);
    if (!student) throw new TRPCError({ code: "FORBIDDEN", message: "A student profile is required to submit a complaint." });
    const assignment = await db.select({ teacherId: classAssignments.teacherId }).from(classAssignments)
      .where(and(eq(classAssignments.classId, student.classId), eq(classAssignments.active, true))).limit(1);
    const now = Date.now();
    const result = await db.insert(complaints).values({ studentId: student.id, teacherId: assignment[0]?.teacherId ?? null, category: input.category, title: input.title, description: input.description, location: input.location, status: "submitted", createdAt: now, updatedAt: now });
    if (assignment[0]) {
      const [assignedTeacher] = await db.select({ userId: teachers.userId }).from(teachers).where(eq(teachers.id, assignment[0].teacherId)).limit(1);
      if (assignedTeacher?.userId) await db.insert(notifications).values({ recipientId: assignedTeacher.userId, title: "New campus complaint", message: `${input.title} · ${input.location}`, priority: "normal", isRead: false, createdAt: now });
    }
    return { success: true, id: Number(result[0].insertId), status: "submitted" as const };
  }),

  listComplaints: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    if (ctx.user.role === "admin") return db.select().from(complaints).orderBy(desc(complaints.createdAt)).limit(100);
    const student = await findStudent(db, ctx.user);
    if (student) return db.select().from(complaints).where(eq(complaints.studentId, student.id)).orderBy(desc(complaints.createdAt)).limit(100);
    const teacher = await findTeacher(db, ctx.user);
    if (!teacher) return [];
    return db.select().from(complaints).where(eq(complaints.teacherId, teacher.id)).orderBy(desc(complaints.createdAt)).limit(100);
  }),

  updateComplaint: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["acknowledged", "in_progress", "resolved", "closed"]), response: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const teacher = await ensureTeacher(db, ctx.user);
    const [found] = await db.select().from(complaints).where(eq(complaints.id, input.id)).limit(1);
    if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found" });
    if (ctx.user.role !== "admin" && found.teacherId !== teacher?.id) throw new TRPCError({ code: "FORBIDDEN", message: "This complaint belongs to another teaching team." });
    const now = Date.now();
    await db.update(complaints).set({ status: input.status, response: input.response ?? found.response, updatedAt: now }).where(eq(complaints.id, input.id));
    const [student] = await db.select({ userId: students.userId }).from(students).where(eq(students.id, found.studentId)).limit(1);
    if (student?.userId) await db.insert(notifications).values({ recipientId: student.userId, eventId: input.id, title: "Complaint update", message: `Your request “${found.title}” is now ${input.status.replace("_", " ")}.`, priority: "normal", isRead: false, createdAt: now });
    return { success: true };
  }),

  createNote: protectedProcedure.input(z.object({
    classId: z.string().min(1).max(64), subjectId: z.string().min(1).max(120), topic: z.string().min(3).max(220), content: z.string().max(20000).optional(), fileUrl: z.string().startsWith("/manus-storage/").max(1000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const teacher = await ensureTeacher(db, ctx.user);
    const assignments = await db.select().from(classAssignments).where(and(eq(classAssignments.classId, input.classId), eq(classAssignments.subjectId, input.subjectId), eq(classAssignments.active, true)));
    const assignment = ctx.user.role === "admin" ? assignments[0] : assignments.find((row) => row.teacherId === teacher?.id);
    if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "You can only publish notes for a class and subject assigned to you." });
    const now = Date.now();
    const [created] = await db.insert(classNotes).values({ teacherId: assignment.teacherId, classId: input.classId, subjectId: input.subjectId, topic: input.topic, content: input.content, fileUrl: input.fileUrl, status: "published", createdAt: now });
    const enrolled = await db.select({ userId: students.userId }).from(students).where(and(eq(students.classId, input.classId), eq(students.status, "active"))).limit(500);
    const recipients = enrolled.flatMap((row) => row.userId === null ? [] : [row.userId]);
    if (recipients.length) await db.insert(notifications).values(recipients.map((recipientId) => ({ recipientId, eventId: Number(created.insertId), title: "New class note", message: `${input.topic} · ${input.subjectId}`, priority: "normal" as const, isRead: false, createdAt: now })));
    return { success: true, id: Number(created.insertId) };
  }),

  uploadNoteFile: protectedProcedure.input(z.object({ classId: z.string().min(1).max(64), subjectId: z.string().min(1).max(120), fileName: z.string().min(1).max(180), mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]), base64: z.string().min(1).max(11_000_000) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const teacher = await ensureTeacher(db, ctx.user);
    const assignments = await db.select({ id: classAssignments.id, teacherId: classAssignments.teacherId }).from(classAssignments).where(and(eq(classAssignments.classId, input.classId), eq(classAssignments.subjectId, input.subjectId), eq(classAssignments.active, true)));
    if (ctx.user.role !== "admin" && !assignments.some((row) => row.teacherId === teacher?.id)) throw new TRPCError({ code: "FORBIDDEN", message: "You can only attach files to notes for your assigned classes." });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const bytes = Buffer.from(input.base64, "base64");
    if (!bytes.length || bytes.length > 8_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Choose a file smaller than 8 MB" });
    const uploaded = await storagePut(`class-notes/${input.classId}/${input.subjectId}/${Date.now()}-${safeName}`, bytes, input.mimeType);
    return { success: true, key: uploaded.key, url: uploaded.url };
  }),

  captureFrame: protectedProcedure.input(z.object({ imageData: z.string().max(4_500_000).startsWith("data:image/jpeg;base64,"), eventType: z.enum(["attendance-check-in", "unmatched-entry"]).default("attendance-check-in"), subjectId: z.string().min(1).max(120).default("Computer Networks") })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const student = await findStudent(db, ctx.user);
    if (!student) throw new TRPCError({ code: "FORBIDDEN", message: "No student profile is linked to this college account. Ask your campus administrator to add your profile." });
    const assignment = await db.select({ id: classAssignments.id }).from(classAssignments).where(and(eq(classAssignments.classId, student.classId), eq(classAssignments.subjectId, input.subjectId), eq(classAssignments.active, true))).limit(1);
    if (!assignment.length) throw new TRPCError({ code: "BAD_REQUEST", message: "That subject is not assigned to your class." });
    const base64 = input.imageData.slice(input.imageData.indexOf(",") + 1);
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length || bytes.length > 3_200_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Evidence image is too large" });
    const uploaded = await storagePut(`camera-evidence/${ctx.user.id}/${Date.now()}.jpg`, bytes, "image/jpeg");
    const now = Date.now();
    const dateKey = new Date(now).toISOString().slice(0, 10);
    const [event] = await db.insert(cameraEvents).values({ eventType: input.eventType, studentId: student.id, evidenceUrl: uploaded.url, location: `${student.classId} · class check-in`, timestamp: now, confidence: null, reviewStatus: "pending" });
    const [existing] = await db.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.studentId, student.id), eq(attendance.classId, student.classId), eq(attendance.subject, input.subjectId), eq(attendance.attendanceDate, dateKey))).limit(1);
    let attendanceId: number | null = existing?.id ?? null;
    if (!existing) {
      const [created] = await db.insert(attendance).values({ studentId: student.id, classId: student.classId, subject: input.subjectId, evidenceUrl: uploaded.url, attendanceDate: dateKey, markedAt: now, status: "present", confidence: null, reviewStatus: "pending" });
      attendanceId = Number(created.insertId);
    }
    await notifyAssignedTeachers(db, student.classId, input.subjectId, Number(event.insertId), "Attendance check-in needs review", `${student.name} · ${student.rollNumber} submitted a check-in for ${input.subjectId}.`, now);
    return { success: true, reviewStatus: "pending" as const, attendanceId, duplicate: !!existing, evidenceUrl: uploaded.url };
  }),

  reviewAttendance: protectedProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const [record] = await db.select().from(attendance).where(eq(attendance.id, input.id)).limit(1);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Attendance record not found." });
    const teacher = await ensureTeacher(db, ctx.user);
    if (ctx.user.role !== "admin") {
      const [authorized] = await db.select({ id: classAssignments.id }).from(classAssignments).where(and(eq(classAssignments.teacherId, teacher!.id), eq(classAssignments.classId, record.classId), eq(classAssignments.subjectId, record.subject), eq(classAssignments.active, true))).limit(1);
      if (!authorized) throw new TRPCError({ code: "FORBIDDEN", message: "This attendance belongs to another teaching assignment." });
    }
    await db.update(attendance).set({ reviewStatus: input.decision, status: input.decision === "approved" ? "present" : "absent" }).where(eq(attendance.id, input.id));
    const [student] = await db.select({ userId: students.userId }).from(students).where(eq(students.id, record.studentId)).limit(1);
    if (student?.userId) await db.insert(notifications).values({ recipientId: student.userId, eventId: input.id, title: "Attendance reviewed", message: `Your ${record.subject} check-in was ${input.decision}.`, priority: "normal", isRead: false, createdAt: Date.now() });
    return { success: true, reviewStatus: input.decision };
  }),

  listCameraEvents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const classIds = await teacherClassIds(db, ctx.user);
    if (!classIds.length) return [];
    const studentRows = await db.select({ id: students.id }).from(students).where(inArray(students.classId, classIds));
    if (!studentRows.length) return [];
    return db.select().from(cameraEvents).where(inArray(cameraEvents.studentId, studentRows.map((row) => row.id))).orderBy(desc(cameraEvents.timestamp)).limit(100);
  }),

  reviewCameraEvent: protectedProcedure.input(z.object({ id: z.number().int().positive(), reviewStatus: z.enum(["acknowledged", "dismissed"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campus database unavailable" });
    const teacher = await ensureTeacher(db, ctx.user);
    const [found] = await db.select().from(cameraEvents).where(and(eq(cameraEvents.id, input.id), eq(cameraEvents.reviewStatus, "pending"))).limit(1);
    if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "Pending event not found" });
    if (ctx.user.role !== "admin") {
      if (!found.studentId || !teacher) throw new TRPCError({ code: "FORBIDDEN", message: "This event is outside your teaching assignments." });
      const [student] = await db.select({ classId: students.classId }).from(students).where(eq(students.id, found.studentId)).limit(1);
      if (!student) throw new TRPCError({ code: "FORBIDDEN", message: "This event is outside your teaching assignments." });
      const scopedClasses = await teacherClassIds(db, ctx.user);
      if (!scopedClasses.includes(student.classId)) throw new TRPCError({ code: "FORBIDDEN", message: "This event is outside your teaching assignments." });
    }
    await db.update(cameraEvents).set({ reviewStatus: input.reviewStatus }).where(eq(cameraEvents.id, input.id));
    return { success: true };
  }),
});
