import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("campus protected workflows", () => {
  it("requires a signed-in user before reading the linked campus profile", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.myProfile()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before reading the assigned roster", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.listTeacherStudents()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before listing class notes", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.listClassNotes({ view: "student" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before creating a complaint", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.createComplaint({
      category: "Facilities",
      title: "Water cooler needs attention",
      description: "The water flow has become very slow.",
      location: "North wing",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before saving webcam evidence", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.captureFrame({
      imageData: "data:image/jpeg;base64,dGVzdA==",
      eventType: "attendance-check-in",
      subjectId: "Computer Networks",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before reviewing attendance", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.reviewAttendance({ id: 1, decision: "approved" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before publishing class notes", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.createNote({
      classId: "3B",
      subjectId: "Data Structures",
      topic: "Trees & graph traversal",
      content: "Notes",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a signed-in user before uploading a class-note attachment", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.campus.uploadNoteFile({
      classId: "3B",
      subjectId: "Data Structures",
      fileName: "lecture.pdf",
      mimeType: "application/pdf",
      base64: "dGVzdA==",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
