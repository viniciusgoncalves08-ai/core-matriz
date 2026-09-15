import { workResponse } from "@/features/projects/work-api";
import { listTasks, saveTask } from "@/features/projects/work-service";
export async function GET(request: Request) { return workResponse(async userId => ({ tasks: await listTasks(userId, new URL(request.url).searchParams.get("projectId") || undefined) })); }
export async function POST(request: Request) { return workResponse(async userId => ({ task: await saveTask(userId, await request.json()) }), 201); }
