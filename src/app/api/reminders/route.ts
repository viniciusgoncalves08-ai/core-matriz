import { reminderResponse } from "@/features/reminders/reminder-api";
import { listReminders } from "@/features/reminders/reminder-service";
export async function GET(request: Request) { return reminderResponse(userId => listReminders(userId, Object.fromEntries(new URL(request.url).searchParams))); }
