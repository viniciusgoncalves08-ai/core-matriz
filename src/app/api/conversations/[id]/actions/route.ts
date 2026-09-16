import { actionResponse } from "@/features/actions/action-api";
import { listActions } from "@/features/actions/action-service";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return actionResponse(async userId => ({ actions: await listActions(userId, (await params).id) }));
}
