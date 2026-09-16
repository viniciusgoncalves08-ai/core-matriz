import { actionResponse } from "@/features/actions/action-api";
import { decideAction } from "@/features/actions/action-service";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return actionResponse(async userId => ({ action: await decideAction(userId, (await params).id, await request.json()) }));
}
