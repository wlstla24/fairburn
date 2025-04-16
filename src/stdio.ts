import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index.js";

async function runServer(): Promise<void> {
  const { server, cleanup } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Meshy MCP Server running on stdio");
  
  // Cleanup on exit
  process.on("SIGINT", async(): Promise<void> => {
    console.error("SIGINT received, cleaning up");
    await cleanup();
    await server.close();
    process.exit(0);
  });
}
  
runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 
  
