import { workResponse } from "@/features/projects/work-api";
import { saveProject } from "@/features/projects/work-service";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return workResponse(async userId => ({ project: await saveProject(userId, await request.json(), (await params).id) }));
}
