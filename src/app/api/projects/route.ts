import { workResponse } from "@/features/projects/work-api";
import { listProjects, saveProject } from "@/features/projects/work-service";
export async function GET() { return workResponse(async userId => ({ projects: await listProjects(userId) })); }
export async function POST(request: Request) { return workResponse(async userId => ({ project: await saveProject(userId, await request.json()) }), 201); }
