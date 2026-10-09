import { expect, it } from "vitest";
import { reminderInstant, reminderLocalTime, requireFutureReminder, reminderInput } from "./reminder-schema";
import { parseReminderQuery } from "./reminder-query";
import { isMemorySnapshot } from "@/features/memory/memory-snapshot";
it("converts Brasilia time to an instant and back independently of server timezone", () => {
  expect(reminderInstant("2030-01-02", "09:30").toISOString()).toBe("2030-01-02T12:30:00.000Z");
  expect(reminderLocalTime("2030-01-02T02:00:00.000Z")).toEqual({ date: "2030-01-01", time: "23:00" });
  expect(reminderLocalTime(reminderInstant("2030-01-02", "00:00"))).toEqual({ date: "2030-01-02", time: "00:00" });
});
it.each([["2030-02-30", "09:00"], ["2030-01-01", "24:00"], ["2030-01-01", "09:61"], ["2030-01-01", "9:00"]])("rejects invalid scheduling values %s %s", (date, time) => expect(() => reminderInstant(date, time)).toThrow());
it("requires a future instant when scheduling, including the confirmation boundary", () => {
  const due = reminderInstant("2030-01-01", "09:00");
  expect(() => requireFutureReminder(due, new Date("2030-01-01T11:59:59Z"))).not.toThrow();
  expect(() => requireFutureReminder(due, due)).toThrow("futuras");
});
it("requires both date and time and rejects extra ownership or recurrence", () => {
  for (const input of [{ title: "Ligar", date: "2030-01-01" }, { title: "Ligar", date: "2030-01-01", time: "09:00", userId: "foreign" }, { title: "Ligar", date: "2030-01-01", time: "09:00", repeat: "daily" }]) expect(reminderInput.safeParse(input).success).toBe(false);
});
it("recognizes explicit read requests and keeps old reminder inventories out of model history", () => {
  expect(parseReminderQuery("meus lembretes")).toBe("scheduled");
  expect(parseReminderQuery("lembretes vencidos")).toBe("due");
  expect(parseReminderQuery("Ele disse: meus lembretes")).toBeNull();
  expect(isMemorySnapshot({ kind: "reminder_query" })).toBe(true);
});
