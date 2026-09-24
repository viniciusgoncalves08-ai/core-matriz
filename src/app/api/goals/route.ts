import { workResponse } from "@/features/projects/work-api";
import { listGoals, saveGoal } from "@/features/goals/goal-service";
export async function GET() { return workResponse(async userId => ({ goals: await listGoals(userId) })); }
export async function POST(request: Request) { return workResponse(async userId => ({ goal: await saveGoal(userId, await request.json()) }), 201); }
