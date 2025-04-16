import { z } from "zod";
import { API_KEY } from "../common/apiKey.js";
import { EventSourcePolyfill } from "event-source-polyfill";
import { downloadFromUrl } from "../common/downloadFromUrl.js";
import path from "path";

type TaskId = string;

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
  seed: z.number().int().optional()
    .describe("When you use the same prompt and seed, you will generate the same result."),
  ai_model: z.enum(["meshy-4", "latest"]).default("meshy-4")
    .describe("ID of the model to use. Default to meshy-4 if not specified."),
  topology: z.enum(["quad", "triangle"]).default("triangle")
    .describe("Specify the topology of the generated model. Default to triangle if not specified."),
  target_polycount: z.number().int().min(100).max(300000).default(30000)
    .describe("Specify the target number of polygons in the generated model. The actual number of polygons may deviate from the target depending on the complexity of the geometry."),
  should_remesh: z.boolean().default(true)
    .describe("Flag controls whether to enable the remesh phase."),
  symmetry_mode: z.enum(["off", "auto", "on"]).default("auto")
    .describe("Controls symmetry mode: off (disables), auto (automatic determination), or on (enforces symmetry)"),
});
type PreviewTaskSchema = z.input<typeof previewTaskSchema>;

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
type RefineTaskSchema = z.input<typeof refineTaskSchema>;

// Response schemas
const taskCreateResultSchema = z.object({
  result: z.string(),
});

// const taskStreamErrorSchema = z.object({
//   status_code: z.number(),
//   message: z.string(),
// });
// type TaskStreamErrorSchema = z.output<typeof taskStreamErrorSchema>;

const taskStreamResultBaseSchema = z.object({
  id: z.string(),
  progress: z.number(),
  // status: z.enum(["PENDING", "IN_PROGRESS", "SUCCEEDED", "FAILED", "CANCELED"]),
});

const taskStreamResultPendingSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("PENDING"),
});

const taskStreamResultInProgressSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("IN_PROGRESS"),
  progress: z.number(),
  // started_at: z.number(),
});

const taskStreamResultSucceededSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("SUCCEEDED"),
  created_at: z.number(),
  started_at: z.number(),
  finished_at: z.number(),
  model_urls: z.record(z.string(), z.string()),
  thumbnail_url: z.string(),
  video_url: z.string(),
  texture_urls: z.array(z.object({
    base_color: z.string().optional(),
    metallic: z.string().optional(),
    roughness: z.string().optional(),
    normal: z.string().optional(),
  })),
  task_error: z.object({
    message: z.string(),
  }).nullable(),
});

const taskStreamResultFailedSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("FAILED"),
  task_error: z.object({
    message: z.string(),
  }).nullable(),
});

const taskStreamResultCanceledSchema = taskStreamResultBaseSchema.extend({
  status: z.literal("CANCELED"),
});

const taskStreamResultSchema = z.discriminatedUnion("status", [
  taskStreamResultPendingSchema,
  taskStreamResultInProgressSchema,
  taskStreamResultSucceededSchema,
  taskStreamResultFailedSchema,
  taskStreamResultCanceledSchema,
]);

type TaskStreamFinishResultSchema = z.output<typeof taskStreamResultSucceededSchema> |
  z.output<typeof taskStreamResultFailedSchema> |
  z.output<typeof taskStreamResultCanceledSchema>;

interface TextTo3DInternalOptions {
    onProgress?: (progress: number) => void;
}

/**
 * Call the text to 3D API
 * @param task - The task to call the API with
 * @param options - The options for the API call
 * @returns The response from the API
 */
async function textTo3D(task: PreviewTaskSchema, options?: TextTo3DInternalOptions): Promise<TaskStreamFinishResultSchema>;

/**
 * Call the text to 3D API
 * @param task - The task to call the API with
 * @param options - The options for the API call
 * @returns The response from the API
 */
async function textTo3D(task: RefineTaskSchema, options?: TextTo3DInternalOptions): Promise<TaskStreamFinishResultSchema>;

async function textTo3D(task: PreviewTaskSchema | RefineTaskSchema, options?: TextTo3DInternalOptions): Promise<TaskStreamFinishResultSchema> {
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

  console.error(`task created: ${taskId}`);

  // stream the response
  return await waitForTaskToFinish(taskId, options);
}

function waitForTaskToFinish(taskId: TaskId, options?: TextTo3DInternalOptions): Promise<TaskStreamFinishResultSchema> {
  return new Promise<TaskStreamFinishResultSchema>((resolve, reject) => {
    // due to EventSource does not support Headers, we need to manually add it to the URL
    const eventSource = new EventSourcePolyfill (
      `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}/stream`,
      { headers: { Authorization: `Bearer ${API_KEY}` } },
    );

    eventSource.onmessage = (event): void => {
      const data = taskStreamResultSchema.parse(JSON.parse(event.data));
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
    };
  });
}

export const textTo3DMergedTaskSchema = previewTaskSchema.merge(refineTaskSchema).omit({
  mode: true,
  preview_task_id: true,
});
export type TextTo3DMergedTaskSchema = z.input<typeof textTo3DMergedTaskSchema>;

interface TextTo3DOptions {
  onProgress?: (step: "preview" | "refine", progress: number) => void;
}

export async function textTo3DMerged(
  task: TextTo3DMergedTaskSchema,
  outputPath: string,
  fileName: string,
  options?: TextTo3DOptions,
): Promise<void> {
  const mergedTask = textTo3DMergedTaskSchema.parse(task);

  const previewTask: PreviewTaskSchema = {
    mode: "preview",
    ...mergedTask,
  };

  const previewResult = await textTo3D(previewTask, {
    onProgress: (progress) => {
      options?.onProgress?.("preview", progress);
    },
  });

  if (previewResult.status !== "SUCCEEDED") {
    console.error("Preview failed", previewResult);
    throw new Error("Preview failed");
  }

  const refineTask: RefineTaskSchema = {
    mode: "refine",
    preview_task_id: previewResult.id,
    ...mergedTask,
  };

  const refineResult = await textTo3D(refineTask, {
    onProgress: (progress) => {
      options?.onProgress?.("refine", progress);
    },
  });

  if (refineResult.status !== "SUCCEEDED") {
    console.error("Refine failed", refineResult);
    throw new Error("Refine failed");
  }

  console.error("Refine succeeded", refineResult);

  await Promise.all([
    // download the model
    downloadFromUrl(refineResult.model_urls["glb"], path.join(outputPath, fileName + ".glb")),
    // download the thumbnail
    downloadFromUrl(refineResult.thumbnail_url, path.join(outputPath, fileName + ".png")),
    // download the video
    downloadFromUrl(refineResult.video_url, path.join(outputPath, fileName + ".mp4")),
  ]);
} 
