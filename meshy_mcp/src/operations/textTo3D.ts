import { z } from "zod";
import { API_KEY } from "../common/apiKey.js";
import { EventSourcePolyfill } from "event-source-polyfill";

export type TaskId = string;

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
export type PreviewTaskSchema = z.infer<typeof previewTaskSchema>;

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
export type RefineTaskSchema = z.infer<typeof refineTaskSchema>;

// Discriminated union for all task types
export const textTo3DTaskSchema = z.discriminatedUnion("mode", [
  previewTaskSchema,
  refineTaskSchema,
]);
export type TextTo3DTaskSchema = z.infer<typeof textTo3DTaskSchema>;

// Response schemas
export const taskCreateResultSchema = z.object({
  result: z.string(),
});
export type TaskCreateResultSchema = z.infer<typeof taskCreateResultSchema>;

// export const taskStreamErrorSchema = z.object({
//   status_code: z.number(),
//   message: z.string(),
// });
// export type TaskStreamErrorSchema = z.infer<typeof taskStreamErrorSchema>;

export const taskStreamResultBaseSchema = z.object({
  id: z.string(),
  progress: z.number(),
  // status: z.enum(["PENDING", "IN_PROGRESS", "SUCCEEDED", "FAILED", "CANCELED"]),
});

export const taskStreamResultPendingSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("PENDING"),
});

export const taskStreamResultInProgressSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("IN_PROGRESS"),
  progress: z.number(),
  started_at: z.number(),
});

export const taskStreamResultSucceededSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("SUCCEEDED"),
  created_at: z.number(),
  started_at: z.number(),
  finished_at: z.number(),
  model_urls: z.record(z.string(), z.string()),
  texture_urls: z.array(z.object({
    base_color: z.string(),
    metallic: z.string(),
    roughness: z.string(),
    normal: z.string(),
  })),
  preceding_tasks: z.number(),
  task_error: z.object({
    message: z.string(),
  }).optional(),
});

export const taskStreamResultFailedSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("FAILED"),
  task_error: z.object({
    message: z.string(),
  }),
});

export const taskStreamResultCanceledSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("CANCELED"),
});

export const taskStreamResultSchema = z.discriminatedUnion("status", [
  taskStreamResultPendingSchema,
  taskStreamResultInProgressSchema,
  taskStreamResultSucceededSchema,
  taskStreamResultFailedSchema,
  taskStreamResultCanceledSchema,
]);
export type TaskStreamResultSchema = z.infer<typeof taskStreamResultSchema>;

export interface TextTo3DOptions {
    onProgress?: (progress: number) => void;
}

/**
 * Call the text to 3D API
 * @param task - The task to call the API with
 * @param options - The options for the API call
 * @returns The response from the API
 */
export async function textTo3D(task: PreviewTaskSchema, options?: TextTo3DOptions): Promise<TaskStreamResultSchema>;

/**
 * Call the text to 3D API
 * @param task - The task to call the API with
 * @param options - The options for the API call
 * @returns The response from the API
 */
export async function textTo3D(task: RefineTaskSchema, options?: TextTo3DOptions): Promise<TaskStreamResultSchema>;

export async function textTo3D(task: TextTo3DTaskSchema, options?: TextTo3DOptions): Promise<TaskStreamResultSchema> {
  // use fetch to call the api
  const headers = { Authorization: `Bearer ${API_KEY}` };
  const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
    method: "POST",
    body: JSON.stringify(task),
    headers,
  });
    
  // parse the response
  const taskId = taskCreateResultSchema.parse(
    await response.json(),
  ).result;

  // stream the response
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 5000;
  const errors: Error[] = [];
  while (retryCount < maxRetries) {
    try {
      return await waitForTaskToFinish(taskId, options);
    } catch (error) {
      errors.push(error as Error);
      retryCount += 1;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  console.error(errors);
  throw new Error("Task failed after max retries", { cause: errors });
}

function waitForTaskToFinish(taskId: TaskId, options?: TextTo3DOptions): Promise<TaskStreamResultSchema> {
  return new Promise<TaskStreamResultSchema>((resolve, reject) => {
    // due to EventSource does not support Headers, we need to manually add it to the URL
    const eventSource = new EventSourcePolyfill (
      `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}/stream`,
      { 
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      },
    );

    eventSource.onmessage = (event): void => {
      const parseResult = taskStreamResultSchema.safeParse(JSON.parse(event.data));
      if (parseResult.success) {
        const data = parseResult.data;
        if (data.status === "SUCCEEDED" || data.status === "FAILED" || data.status === "CANCELED") {
          eventSource.close();
          resolve(data);
        } else if (data.status === "IN_PROGRESS") {
          options?.onProgress?.(data.progress);
        } else if (data.status === "PENDING") {
          // do nothing
        } else {
          console.error(data);
          eventSource.close();
          reject(new Error("Unknown task status"));
        }
      } else {
        console.error(parseResult.error);
        eventSource.close();
        reject(new Error("Failed to parse task stream result"));
      }
    };

    eventSource.onerror = (event): void => {
      eventSource.close();
      console.error(event);
      reject(new Error("EventSource error occurred"));
    };
  });
}
