import { boolean, bigint, double, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Manus OAuth identity. The base session table remains the authority for login. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 160 }).notNull().default("Student"),
  email: varchar("email", { length: 320 }),
  rollNumber: varchar("rollNumber", { length: 40 }).notNull().unique(),
  classId: varchar("classId", { length: 64 }).notNull(),
  department: varchar("department", { length: 120 }).notNull(),
  faceImageKey: text("faceImageKey"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
}, (table) => ({
  userIdUnique: uniqueIndex("students_userId_unique").on(table.userId),
  emailUnique: uniqueIndex("students_email_unique").on(table.email),
}));

export const teachers = mysqlTable("teachers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 160 }).notNull().default("Teacher"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["teacher", "admin"]).default("teacher").notNull(),
  classId: varchar("classId", { length: 64 }),
  department: varchar("department", { length: 120 }),
}, (table) => ({
  userIdUnique: uniqueIndex("teachers_userId_unique").on(table.userId),
  emailUnique: uniqueIndex("teachers_email_unique").on(table.email),
}));

/** One teacher may teach multiple subjects/classes; only active assignments define portal visibility. */
export const classAssignments = mysqlTable("class_assignments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  classId: varchar("classId", { length: 64 }).notNull(),
  subjectId: varchar("subjectId", { length: 120 }).notNull(),
  active: boolean("active").default(true).notNull(),
}, (table) => ({
  assignmentUnique: uniqueIndex("class_assignment_unique").on(table.teacherId, table.classId, table.subjectId),
}));

export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  classId: varchar("classId", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 160 }).notNull(),
  evidenceUrl: text("evidenceUrl"),
  attendanceDate: varchar("attendanceDate", { length: 10 }).notNull().default("1970-01-01"),
  markedAt: bigint("markedAt", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["present", "absent"]).default("present").notNull(),
  confidence: double("confidence"),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  teacherId: int("teacherId"),
  category: varchar("category", { length: 80 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["submitted", "acknowledged", "in_progress", "resolved", "closed"]).default("submitted").notNull(),
  response: text("response"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export const classNotes = mysqlTable("class_notes", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  classId: varchar("classId", { length: 64 }).notNull(),
  subjectId: varchar("subjectId", { length: 120 }).notNull(),
  topic: varchar("topic", { length: 220 }).notNull(),
  content: text("content"),
  fileUrl: text("fileUrl"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export const cameraEvents = mysqlTable("camera_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  studentId: int("studentId"),
  evidenceUrl: text("evidenceUrl"),
  location: varchar("location", { length: 180 }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  confidence: double("confidence"),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "acknowledged", "dismissed"]).default("pending").notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  eventId: int("eventId"),
  title: varchar("title", { length: 220 }).notNull(),
  message: text("message").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
