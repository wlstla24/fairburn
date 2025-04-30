import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Request, Result } from "@modelcontextprotocol/sdk/types.js";

export interface OperationObject {
  describe: {
    name: string;
    description: string;
    inputSchema: object;
  };
  execute: (request: Request, server: Server) => Promise<Result>;
}

export class OperationRegistry {
  private static readonly _operations: OperationObject[] = [];

  public static registerOperation(operation: OperationObject): void {
    this._operations.push(operation);
  }

  public static get operations(): OperationObject[] {
    return this._operations;
  }
}
