import { z } from "zod";
import { API_KEY } from "../common/apiKey.js";
import { EventSourcePolyfill } from "event-source-polyfill";
import { downloadFromUrl } from "../common/downloadFromUrl.js";
import path from "path";
import { registerOperation } from "../index.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Request } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

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
type TaskStreamResultInProgressSchema = z.output<typeof taskStreamResultInProgressSchema>;

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
    onProgress?: (progress: TaskStreamResultInProgressSchema) => void;
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

  // console.error(`task created: ${taskId}`);

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
        options?.onProgress?.(data);
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

const textTo3DMergedTaskSchema = previewTaskSchema.merge(refineTaskSchema).omit({
  mode: true,
  preview_task_id: true,
});
type TextTo3DMergedTaskSchema = z.input<typeof textTo3DMergedTaskSchema>;

interface TextTo3DOptions {
  onProgress?: (step: "preview" | "refine", progress: TaskStreamResultInProgressSchema) => void;
}

async function textTo3DMerged(
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

  await Promise.all([
    // download the model
    downloadFromUrl(refineResult.model_urls["glb"], path.join(outputPath, fileName + ".glb")),
    // download the thumbnail
    downloadFromUrl(refineResult.thumbnail_url, path.join(outputPath, fileName + ".png")),
    // download the video
    downloadFromUrl(refineResult.video_url, path.join(outputPath, fileName + ".mp4")),
  ]);
} 

type Task = {
  outputPath: string;
  previewTaskId: string | null;
  refineTaskId: string | null;
  step: "preview" | "refine" | "done";
  progress: number;
};

function createOutputPathDescription(): string {
  const description = "The absolute path to the directory where the generated files will be saved\n";
  // if (process.platform === "win32") {
  //   description += "(e.g. C:/path/to/output, %USERPROFILE%/Downloads/output, %USERPROFILE%/Desktop/output)\n";

  //   description += "current available environment variables for path:\n";
  //   for (const key in process.env) {
  //     if (key.startsWith("USERPROFILE")) {
  //       description += `  - ${key}\n`;
  //     }
  //   }
  // } else {
  //   description += "(e.g. /path/to/output, $HOME/Downloads/output, $HOME/Desktop/output)\n";

  //   description += "current available environment variables for path:\n";
  //   for (const key in process.env) {
  //     if (key.startsWith("HOME")) {
  //       description += `  - ${key}\n`;
  //     }
  //   }
  // }
  return description;
}

function resolveEnvVariables(data: string): string {
  if (process.platform === "win32") {
    try {
      return data.replace(/%([^%]+)%/g, (_, p1) => {
        const env = process.env[p1];
        if (!env) {
          throw new Error(`Environment variable ${p1} not found`);
        }
        return env;
      });
    } catch (error) {
      console.error("Error resolving environment variables", error);
      return data;
    }
  } else {
    try {
      return data.replace(/\$([^/]+)/g, (_, p1) => {
        const env = process.env[p1];
        if (!env) {
          throw new Error(`Environment variable ${p1} not found`);
        }
        return env;
      });
    } catch (error) {
      console.error("Error resolving environment variables", error);
      return data;
    }
  }
}

// Schema for the textTo3D tool input
const TextTo3DToolSchema = z.object({
  tasks:z.array(textTo3DMergedTaskSchema.extend({
    outputPath: z.string() 
      .describe(createOutputPathDescription())
      .transform(resolveEnvVariables)
      .refine((data) => { // check output path is absolute
        return path.isAbsolute(data);
      }, {
        message: "The output path must be an absolute path",
      }),
    fileName: z.string().describe("The name of the file to save the generated 3D model as (without extension)")
      .refine((data) => { // check file system naming conventions
        return data.match(/^[a-zA-Z0-9_-]+$/);
      }, {
        message: "The file name must contain only alphanumeric characters, underscores, and hyphens",
      }).refine((data) => { // check filename is not containing extension
        return !path.extname(data).length;
      }, {
        message: "The file name must not contain an extension",
      }),
  }))
    .describe("The tasks to generate 3D models from (max 4 at a time) more than 4 will not recommended to use due to the API cost")
    .max(4, {
      message: "You can only generate up to 4 3D models at a time",
    }),
});

registerOperation({
  describe: {
    name: "text_to_3d",
    description: "Generate a 3D models from a text description" +
      "if you want only one model, just pass an array with one element." +
      "if you want multiple models, pass an array with multiple elements." +
      "each element in the array will processed simultaneously," +
      "so if you want to generate multiple models. it's better to pass multiple elements in the array," +
      "instead of calling this tool multiple times",
    inputSchema: zodToJsonSchema(TextTo3DToolSchema),
  },
  execute: async(request: Request, server: Server) => {
    if (!request.params?.arguments) {
      throw new Error("Arguments are required");
    }

    const args = TextTo3DToolSchema.parse(request.params.arguments);
    const tasks = new Map<number, Task>(); // key is the task id
    function addTask(taskIndex: number, outputPath: string): void {
      tasks.set(taskIndex, { outputPath, previewTaskId: null, refineTaskId: null, step: "preview", progress: 0 });
    }
    function updateAndPrintProgress(taskIndex: number, step: "preview" | "refine" | "done", data?: TaskStreamResultInProgressSchema): void {
      const task = tasks.get(taskIndex);
      if (!task) {
        throw new Error(`Task ${taskIndex} not found`);
      }
      task.step = step;
      if (data) {
        task.progress = data.progress;
        if (step === "preview") {
          task.previewTaskId = data.id;
        } else {
          task.refineTaskId = data.id;
        }
      }
      let progressMessage = "\n\n\n\n\n";
      progressMessage += "==========Generating 3D models==========\n";
      for (const [taskIndex, progress] of tasks.entries()) {
        progressMessage += taskIndex;
        if (progress.previewTaskId) {
          progressMessage += ` (preview: ${progress.previewTaskId})`;
        }
        if (progress.refineTaskId) {
          progressMessage += ` (refine: ${progress.refineTaskId})`;
        }
        if (progress.step === "done") {
          progressMessage += " (done)";
        } else {
          progressMessage += `: ${progress.progress}%`;
        }
        progressMessage += "\n";
      }
      progressMessage += "========================================\n";
      for (let i = 0; i < progressMessage.split("\n").length; i++) {
        process.stdout.clearLine(0);
        process.stdout.moveCursor(0, -1);
      }
      process.stdout.write(progressMessage);
    }

    const promises: Promise<void>[] = [];

    for (let i = 0; i < args.tasks.length; i++) {
      const { outputPath, fileName, ...taskArgs } = args.tasks[i];

      let finalOutputPath = outputPath;
      // if windows
      if (process.platform === "win32") {
        // transform /c:/ to C:\
        finalOutputPath = outputPath.replace(/\/([a-zA-Z]):/, "$1:\\");
        // transform /c%3A/ to C:\
        finalOutputPath = finalOutputPath.replace(/\/([a-zA-Z])%3A/, "$1:\\");
      }
      // normalize the path
      finalOutputPath = path.normalize(finalOutputPath);

      console.error("Starting text to 3D generation with args", taskArgs, "to", finalOutputPath);

      addTask(i, finalOutputPath);
      promises.push(textTo3DMerged(taskArgs, finalOutputPath, fileName, {
        onProgress: (step, data) => {
          updateAndPrintProgress(i, step, data);
          // Send progress notification
          if (request.params!._meta?.progressToken !== undefined) {
            server.notification({
              method: "notifications/progress",
              params: {
                progress: step === "preview" ? data.progress * 0.5 : 50 + data.progress * 0.5,
                total: 100,
                progressToken: request.params!._meta.progressToken,
                message: `${step === "preview" ? "Previewing" : "Refining"} 3D model (${Math.round(data.progress)}%)`,
              },
            });
          }
        },
      }).then(() => {
        updateAndPrintProgress(i, "done");
      }).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate 3D model: ${errorMessage}`);
      }));
    }

    await Promise.all(promises);

    let successMessage = "";
    for (const [taskIndex, progress] of tasks.entries()) {
      successMessage += `Successfully generated 3D model at ${progress.outputPath} (${taskIndex})\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: successMessage,
        },
      ],
    };
  },
});
