import { reminderResponse } from "@/features/reminders/reminder-api";
import { changeReminder } from "@/features/reminders/reminder-service";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return reminderResponse(async userId => ({ reminder: await changeReminder(userId, (await params).id, await request.json()) })); }
