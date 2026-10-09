import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), list: vi.fn(), change: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: m.session }));
vi.mock("./reminder-service", () => ({ listReminders: m.list, changeReminder: m.change, ReminderNotFound: class extends Error {}, ReminderConflict: class extends Error {} }));
import { GET } from "@/app/api/reminders/route";
import { PATCH } from "@/app/api/reminders/[id]/route";
import { ReminderConflict } from "./reminder-service";
import { ReminderTimeError } from "./reminder-schema";
beforeEach(() => vi.clearAllMocks());
it("blocks unauthenticated list and mutation requests", async () => {
  m.session.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/reminders"))).status).toBe(401);
  expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "r" }) })).status).toBe(401);
  expect(m.list).not.toHaveBeenCalled(); expect(m.change).not.toHaveBeenCalled();
});
it("uses authenticated identity and private responses", async () => {
  m.session.mockResolvedValue("owner"); m.list.mockResolvedValue({ reminders: [] });
  const response = await GET(new Request("http://localhost/api/reminders?filter=due"));
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(m.list).toHaveBeenCalledWith("owner", { filter: "due" });
});
it("distinguishes stale edits and invalid dates without leaking internal errors", async () => {
  m.session.mockResolvedValue("owner");
  for (const [error, status] of [[new ReminderConflict(), 409], [new ReminderTimeError("Horário passado"), 400], [new Error("secret database"), 500]] as const) {
    m.change.mockRejectedValue(error);
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "r" }) });
    expect(response.status).toBe(status); expect(await response.text()).not.toContain("secret database");
  }
});
