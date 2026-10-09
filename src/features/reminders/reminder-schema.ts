import { z } from "zod";
export const reminderInput = z.object({
  title: z.string().trim().min(2).max(200),
  date: z.string().date(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
}).strict();
export const reminderUpdateInput = reminderInput.extend({ status: z.enum(["scheduled", "completed", "cancelled"]) });
export type ReminderInput = z.infer<typeof reminderUpdateInput>;
export const reminderLabels = { scheduled: "Agendado", completed: "Concluído", cancelled: "Cancelado" };
export const REMINDER_ZONE = "America/Sao_Paulo";
export class ReminderTimeError extends Error {}
export function reminderLocalTime(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: REMINDER_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
export function reminderInstant(date: string, time: string) {
  reminderInput.pick({ date: true, time: true }).parse({ date, time });
  const naive = new Date(`${date}T${time}:00.000Z`);
  const local = reminderLocalTime(naive);
  const offset = new Date(`${local.date}T${local.time}:00.000Z`).getTime() - naive.getTime();
  const result = new Date(naive.getTime() - offset);
  const check = reminderLocalTime(result);
  if (check.date !== date || check.time !== time) throw new ReminderTimeError("Esse horário não existe no fuso de Brasília. Escolha outro horário.");
  return result;
}
export function requireFutureReminder(date: Date, now = new Date()) {
  if (date <= now) throw new ReminderTimeError("Escolha uma data e hora futuras, no horário de Brasília.");
}
