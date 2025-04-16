#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { textTo3DMerged, textTo3DMergedTaskSchema } from "./operations/textTo3D.js";
import path from "path";

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
  const TextTo3DToolSchema = textTo3DMergedTaskSchema.extend({
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
  });

  server.setRequestHandler(ListToolsRequestSchema, async() => {
    return {
      tools: [
        {
          name: "text_to_3d",
          description: "Generate a 3D model from text description",
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
        const { outputPath, fileName, ...taskArgs } = args;

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

        try {
          await textTo3DMerged(taskArgs, finalOutputPath, fileName, {
            onProgress: (step, progress) => {
              console.error("Progress", step, progress);
              // Send progress notification
              if (request.params._meta?.progressToken !== undefined) {
                server.notification({
                  method: "notifications/progress",
                  params: {
                    progress: step === "preview" ? progress * 0.5 : 50 + progress * 0.5,
                    total: 100,
                    progressToken: request.params._meta.progressToken,
                    message: `${step === "preview" ? "Previewing" : "Refining"} 3D model (${Math.round(progress)}%)`,
                  },
                });
              }
            },
          });

          return {
            content: [
              {
                type: "text",
                text: `Successfully generated 3D model at ${outputPath}`,
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to generate 3D model: ${errorMessage}`);
        }
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
