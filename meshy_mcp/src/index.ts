#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { textTo3D, PreviewTaskSchema, RefineTaskSchema } from "./operations/textTo3D.js";

// Version information
const VERSION = "1.0.0";

const server = new Server(
  {
    name: "meshy-mcp-server",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async() => {
  // Get the Zod schemas from textTo3D operations
  // Here we're creating schemas that match the exported types
  const previewSchema = z.object({
    mode: z.literal("preview"),
    prompt: z.string().max(600),
    art_style: z.enum(["realistic", "sculpture"]).optional(),
    seed: z.number().int().optional(),
    ai_model: z.enum(["meshy-4", "latest"]).optional(),
    topology: z.enum(["quad", "triangle"]).optional(),
    target_polycount: z.number().int().min(100).max(300000).optional(),
    should_remesh: z.boolean().optional(),
    symmetry_mode: z.enum(["off", "auto", "on"]).optional(),
  });

  const refineSchema = z.object({
    mode: z.literal("refine"),
    preview_task_id: z.string(),
    enable_pbr: z.boolean().optional(),
    texture_prompt: z.string().max(600).optional(),
  });

  return {
    tools: [
      {
        name: "text_to_3d_preview",
        description: "Create a preview 3D model from a text prompt",
        inputSchema: zodToJsonSchema(previewSchema),
      },
      {
        name: "text_to_3d_refine",
        description: "Refine a previously generated 3D model with textures",
        inputSchema: zodToJsonSchema(refineSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async(request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
    case "text_to_3d_preview": {
      // Ensure arguments match the PreviewTaskSchema type
      const args = {
        mode: "preview",
        ...request.params.arguments,
      } as PreviewTaskSchema;
        
      const result = await textTo3D(args, {
        onProgress: (progress) => {
          console.error(`Preview progress: ${progress}`);
        },
      });
        
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "text_to_3d_refine": {
      // Ensure arguments match the RefineTaskSchema type
      const args = {
        mode: "refine",
        ...request.params.arguments,
      } as RefineTaskSchema;
        
      const result = await textTo3D(args, {
        onProgress: (progress) => {
          console.error(`Refine progress: ${progress}`);
        },
      });
        
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
});

async function runServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Meshy MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
