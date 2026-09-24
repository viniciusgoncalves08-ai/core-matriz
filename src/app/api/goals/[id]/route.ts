import { workResponse } from "@/features/projects/work-api";
import { saveGoal } from "@/features/goals/goal-service";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return workResponse(async userId => ({ goal: await saveGoal(userId, await request.json(), (await params).id) }));
}
