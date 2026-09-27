import { and, eq } from "drizzle-orm";
import { classAssignments, classNotes, students, teachers } from "../drizzle/schema";
import { getDb } from "../server/db";

const CLASS_ID = "3B";
const DEPARTMENT = "Computer Science";

const studentProfiles = [
  { name: "Maya Patel", email: "student@college.edu", rollNumber: "CS-2412" },
  { name: "Aarav Shah", email: "aarav.shah@college.edu", rollNumber: "CS-2401" },
  { name: "Diya Mehta", email: "diya.mehta@college.edu", rollNumber: "CS-2402" },
  { name: "Kabir Nair", email: "kabir.nair@college.edu", rollNumber: "CS-2403" },
  { name: "Ananya Rao", email: "ananya.rao@college.edu", rollNumber: "CS-2404" },
  { name: "Reyansh Kapoor", email: "reyansh.kapoor@college.edu", rollNumber: "CS-2405" },
  { name: "Ishita Das", email: "ishita.das@college.edu", rollNumber: "CS-2406" },
];

const teacherProfiles = [
  { name: "Prof. Naina Verma", email: "teacher@college.edu", subjects: ["Data Structures", "Computer Networks", "Software Engineering"] },
  { name: "Prof. K. Menon", email: "menon@college.edu", subjects: ["Database Systems"] },
];

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured; run this script in the Smart Campus project environment.");

  for (const profile of studentProfiles) {
    await db.insert(students).values({
      userId: null, name: profile.name, email: profile.email, rollNumber: profile.rollNumber,
      classId: CLASS_ID, department: DEPARTMENT, status: "active",
    }).onDuplicateKeyUpdate({ set: { name: profile.name, email: profile.email, classId: CLASS_ID, department: DEPARTMENT, status: "active" } });
  }

  for (const profile of teacherProfiles) {
    await db.insert(teachers).values({
      userId: null, name: profile.name, email: profile.email, role: "teacher", classId: CLASS_ID, department: DEPARTMENT,
    }).onDuplicateKeyUpdate({ set: { name: profile.name, classId: CLASS_ID, department: DEPARTMENT } });
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, profile.email)).limit(1);
    if (!teacher) throw new Error(`Could not load seeded teacher ${profile.email}`);
    for (const subjectId of profile.subjects) {
      await db.insert(classAssignments).values({ teacherId: teacher.id, classId: CLASS_ID, subjectId, active: true })
        .onDuplicateKeyUpdate({ set: { active: true } });
    }
  }

  const demoNotes = [
    { teacherEmail: "teacher@college.edu", subjectId: "Data Structures", topic: "Trees & graph traversal", content: "Starter class note: review tree traversals, graph representations, and breadth-first search." },
    { teacherEmail: "menon@college.edu", subjectId: "Database Systems", topic: "Transactions & ACID properties", content: "Starter class note: transaction states, atomicity, consistency, isolation, and durability." },
    { teacherEmail: "teacher@college.edu", subjectId: "Computer Networks", topic: "Transport layer · TCP and UDP", content: "Starter class note: compare connection-oriented TCP with connectionless UDP." },
  ];
  for (const note of demoNotes) {
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, note.teacherEmail)).limit(1);
    if (!teacher) throw new Error(`Could not load teacher for note ${note.topic}`);
    const [existing] = await db.select({ id: classNotes.id }).from(classNotes)
      .where(and(eq(classNotes.teacherId, teacher.id), eq(classNotes.classId, CLASS_ID), eq(classNotes.subjectId, note.subjectId), eq(classNotes.topic, note.topic))).limit(1);
    if (!existing) await db.insert(classNotes).values({ teacherId: teacher.id, classId: CLASS_ID, subjectId: note.subjectId, topic: note.topic, content: note.content, status: "published", createdAt: Date.now() });
  }

  console.log(`Starter class ${CLASS_ID}: ${studentProfiles.length} students, ${teacherProfiles.length} teachers, 4 teaching assignments, ${demoNotes.length} published notes.`);
  await db.$client.end();
}

main().catch((error) => {
  console.error("Campus starter-data setup failed:", error);
  process.exitCode = 1;
});
