#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import "./operations/textTo3D.js";
import { OperationRegistry } from "./operationRegistry.js";
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

  server.setRequestHandler(ListToolsRequestSchema, async() => {
    return {
      tools: OperationRegistry.operations.map((operation) => ({
        name: operation.describe.name,
        description: operation.describe.description,
        inputSchema: operation.describe.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async(request) => {
    try {
      const operation = OperationRegistry.operations.find((operation) => operation.describe.name === request.params.name);
      if (!operation) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      return await operation.execute(request, server);
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
