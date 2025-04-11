import { z } from "zod";
import { API_KEY } from "../common/apiKey.js";

// Base task schema with common fields
const baseTaskSchema = z.object({
    mode: z.enum(["preview", "refine"]),
});

// Preview task schema
const previewTaskSchema = baseTaskSchema.extend({
    mode: z.literal("preview"),
    prompt: z.string().max(600)
        .describe("Describe what kind of object the 3D model is. Maximum 600 characters."),
    art_style: z.enum(["realistic", "sculpture"]).default("realistic")
        .describe("Describe your desired art style of the object. Default to realistic if not specified."),
    seed: z.number().int()
        .describe("When you use the same prompt and seed, you will generate the same result."),
    ai_model: z.enum(["meshy-4", "latest"]).default("meshy-4")
        .describe("ID of the model to use. Default to meshy-4 if not specified."),
    topology: z.enum(["quad", "triangle"]).default("triangle")
        .describe("Specify the topology of the generated model. Default to triangle if not specified."),
    target_polycount: z.number().int().min(100).max(300000)
        .describe("Specify the target number of polygons in the generated model. The actual number of polygons may deviate from the target depending on the complexity of the geometry."),
    should_remesh: z.boolean()
        .describe("Flag controls whether to enable the remesh phase."),
    symmetry_mode: z.enum(["off", "auto", "on"]).default("auto")
        .describe("Controls symmetry mode: off (disables), auto (automatic determination), or on (enforces symmetry)"),
});

// Refine task schema
const refineTaskSchema = baseTaskSchema.extend({
    mode: z.literal("refine"),
    preview_task_id: z.string()
        .describe("The corresponding preview task id."),
    enable_pbr: z.boolean().default(false)
        .describe("Generate PBR Maps (metallic, roughness, normal) in addition to the base color."),
    texture_prompt: z.string().max(600).optional()
        .describe("Provide an additional text prompt to guide the texturing process. Maximum 600 characters."),
});

// Discriminated union for all task types
export const textTo3DTaskSchema = z.discriminatedUnion("mode", [
    previewTaskSchema,
    refineTaskSchema,
]);

// Response schemas
export const taskResultSchema = z.object({
    result: z.string(),
});

// Type exports
export type PreviewTaskSchema = z.infer<typeof previewTaskSchema>;
export type RefineTaskSchema = z.infer<typeof refineTaskSchema>;
export type TextTo3DTaskSchema = z.infer<typeof textTo3DTaskSchema>;
export type TaskId = string;
export type PreviewTaskResultSchema = z.infer<typeof taskResultSchema>;
export type RefineTaskResultSchema = z.infer<typeof taskResultSchema>;

/**
 * Call the text to 3D API
 * @param task - The task to call the API with
 * @returns The response from the API
 */
export async function textTo3D(task: PreviewTaskSchema): Promise<PreviewTaskResultSchema>;

/**
 * Call the text to 3D API
 * @param task - The task to call the API with
 * @returns The response from the API
 */
export async function textTo3D(task: RefineTaskSchema): Promise<RefineTaskResultSchema>;

export async function textTo3D(task: TextTo3DTaskSchema): Promise<PreviewTaskResultSchema | RefineTaskResultSchema> {
    // use fetch to call the api
    const headers = { Authorization: `Bearer ${API_KEY}` };
    const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
        method: "POST",
        body: JSON.stringify(task),
        headers,
    });
    return response.json();
}

