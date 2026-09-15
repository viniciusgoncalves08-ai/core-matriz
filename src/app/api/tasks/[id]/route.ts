import { workResponse } from "@/features/projects/work-api";
import { saveTask } from "@/features/projects/work-service";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return workResponse(async userId => ({ task: await saveTask(userId, await request.json(), (await params).id) }));
}
