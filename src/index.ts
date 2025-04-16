#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TaskStreamResultInProgressSchema, textTo3DMerged, textTo3DMergedTaskSchema } from "./operations/textTo3D.js";
import path from "path";

type Task = {
  outputPath: string;
  previewTaskId: string | null;
  refineTaskId: string | null;
  step: "preview" | "refine";
  progress: number;
};

export function createServer(): {
  server: Server;
  cleanup: () => Promise<void>;
  } {
  const server = new Server(
    {
      name: "meshy-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  function createOutputPathDescription(): string {
    let description = "The absolute path to the directory where the generated files will be saved\n";
    if (process.platform === "win32") {
      description += "(e.g. C:/path/to/output, %USERPROFILE%/Downloads/output, %USERPROFILE%/Desktop/output)\n";

      description += "current available environment variables for path:\n";
      for (const key in process.env) {
        if (key.startsWith("USERPROFILE")) {
          description += `  - ${key}\n`;
        }
      }
    } else {
      description += "(e.g. /path/to/output, $HOME/Downloads/output, $HOME/Desktop/output)\n";

      description += "current available environment variables for path:\n";
      for (const key in process.env) {
        if (key.startsWith("HOME")) {
          description += `  - ${key}\n`;
        }
      }
    }
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
    })).max(8, {
      message: "You can only generate up to 8 3D models at a time",
    }),
  });

  server.setRequestHandler(ListToolsRequestSchema, async() => {
    return {
      tools: [
        {
          name: "text_to_3d",
          description: "Generate a 3D models from a text description",
          // "if you want only one model, just pass an array with one element." +
          // "if you want multiple models, pass an array with multiple elements." +
          // "each element in the array will processed simultaneously," +
          // "so if you want to generate multiple models. it's better to pass multiple elements in the array," +
          // "instead of calling this tool multiple times",
          inputSchema: zodToJsonSchema(TextTo3DToolSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async(request) => {
    try {
      if (!request.params.arguments) {
        throw new Error("Arguments are required");
      }

      if (request.params.name === "text_to_3d") {
        const args = TextTo3DToolSchema.parse(request.params.arguments);

        const tasks = new Map<number, Task>(); // key is the task id
        function addTask(taskIndex: number, outputPath: string): void {
          tasks.set(taskIndex, { outputPath, previewTaskId: null, refineTaskId: null, step: "preview", progress: 0 });
        }
        function updateAndPrintProgress(taskIndex: number, step: "preview" | "refine", data: TaskStreamResultInProgressSchema): void {
          const task = tasks.get(taskIndex);
          if (!task) {
            throw new Error(`Task ${taskIndex} not found`);
          }
          task.step = step;
          task.progress = data.progress;
          if (step === "preview") {
            task.previewTaskId = data.id;
          } else {
            task.refineTaskId = data.id;
          }
          let progressMessage = "";
          for (const [taskIndex, progress] of tasks.entries()) {
            progressMessage += taskIndex;
            if (progress.previewTaskId) {
              progressMessage += ` (preview: ${progress.previewTaskId})`;
            }
            if (progress.refineTaskId) {
              progressMessage += ` (refine: ${progress.refineTaskId})`;
            }
            progressMessage += `: ${progress.progress}%\n`;
          }
          console.error(progressMessage);
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
              if (request.params._meta?.progressToken !== undefined) {
                server.notification({
                  method: "notifications/progress",
                  params: {
                    progress: step === "preview" ? data.progress * 0.5 : 50 + data.progress * 0.5,
                    total: 100,
                    progressToken: request.params._meta.progressToken,
                    message: `${step === "preview" ? "Previewing" : "Refining"} 3D model (${Math.round(data.progress)}%)`,
                  },
                });
              }
            },
          }).then(() => {
            tasks.set(i, {
              ...tasks.get(i)!,
              progress: 100,
            });
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
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
      }
      throw error;
    }
  });

  return {
    server,
    cleanup: async(): Promise<void> => {
      await server.close();
    },
  };
}
