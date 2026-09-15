import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ project: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() }, task: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() }, auditLog: { create: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: { ...mock, $transaction: (action: (tx: typeof mock) => unknown) => action(mock) } }));
import { listProjects, listTasks, saveProject, saveTask, WorkNotFoundError } from "./work-service";
beforeEach(() => { vi.resetAllMocks(); mock.project.create.mockResolvedValue({ id: "p1" }); mock.project.update.mockResolvedValue({ id: "p1" }); mock.task.create.mockResolvedValue({ id: "t1" }); mock.task.update.mockResolvedValue({ id: "t1" }); });
it("does not modify projects belonging to another account", async () => {
  mock.project.findFirst.mockResolvedValue(null);
  await expect(saveProject("u1", { status: "ARCHIVED" }, "foreign")).rejects.toBeInstanceOf(WorkNotFoundError);
  expect(mock.project.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "u1" }, select: { id: true } });
  expect(mock.project.update).not.toHaveBeenCalled(); expect(mock.auditLog.create).not.toHaveBeenCalled();
});
it("does not attach a task to another account's project", async () => {
  mock.project.findFirst.mockResolvedValue(null);
  await expect(saveTask("u1", { title: "Planejar", projectId: "foreign" })).rejects.toBeInstanceOf(WorkNotFoundError);
  expect(mock.task.create).not.toHaveBeenCalled();
});
it("checks task ownership before moving it to a project", async () => {
  mock.task.findFirst.mockResolvedValue(null);
  await expect(saveTask("u1", { projectId: "p1" }, "foreign")).rejects.toBeInstanceOf(WorkNotFoundError);
  expect(mock.task.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "u1" }, select: { id: true } });
  expect(mock.project.findFirst).not.toHaveBeenCalled(); expect(mock.task.update).not.toHaveBeenCalled();
});
it("updates only task status without resetting dates or priority", async () => {
  mock.task.findFirst.mockResolvedValue({ id: "t1" });
  await saveTask("u1", { status: "COMPLETED" }, "t1");
  expect(mock.task.update).toHaveBeenCalledWith({ where: { id: "t1", userId: "u1" }, data: { status: "COMPLETED" } });
  expect(mock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "u1", action: "TASK_UPDATED", entityId: "t1" }) });
});
it("supports removing a task date and project", async () => {
  mock.task.findFirst.mockResolvedValue({ id: "t1" });
  await saveTask("u1", { dueAt: null, projectId: null }, "t1");
  expect(mock.task.update).toHaveBeenCalledWith({ where: { id: "t1", userId: "u1" }, data: { dueAt: null, projectId: null } });
});
it("persists date-only deadlines consistently and uses session ownership", async () => {
  await saveTask("u1", { title: "Planejar", dueAt: "2026-10-02", priority: 3 });
  expect(mock.task.create).toHaveBeenCalledWith({ data: { title: "Planejar", userId: "u1", dueAt: new Date("2026-10-02T00:00:00Z"), priority: 3 } });
});
it.each([{ title: "Planejar", userId: "u2" }, { title: " " }, { title: "Planejar", dueAt: "2026-02-30" }, { title: "Planejar", priority: 9 }, { title: "Planejar", status: "unknown" }])("rejects invalid or ownership-changing task input", async input => {
  await expect(saveTask("u1", input)).rejects.toThrow(); expect(mock.task.create).not.toHaveBeenCalled();
});
it("filters project and task listings by the authenticated user", async () => {
  await listProjects("u1"); await listTasks("u1");
  expect(mock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  expect(mock.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
});
it("does not list tasks inside a foreign project", async () => {
  mock.project.findFirst.mockResolvedValue(null);
  await expect(listTasks("u1", "foreign")).rejects.toBeInstanceOf(WorkNotFoundError);
  expect(mock.task.findMany).not.toHaveBeenCalled();
});
it("archives only the project and records the change", async () => {
  mock.project.findFirst.mockResolvedValue({ id: "p1" });
  await saveProject("u1", { status: "ARCHIVED" }, "p1");
  expect(mock.project.update).toHaveBeenCalledWith({ where: { id: "p1", userId: "u1" }, data: { status: "ARCHIVED" } });
  expect(mock.task.update).not.toHaveBeenCalled();
});
