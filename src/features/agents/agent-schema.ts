import { z } from "zod";
export const agentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  role: z.string().trim().min(2).max(300),
  systemPrompt: z.string().trim().min(1).max(20000),
  preferredModel: z.string().trim().max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export const agentPatchSchema = agentSchema.partial().extend({ status: z.enum(["ACTIVE", "PAUSED", "DISABLED"]).optional() });
