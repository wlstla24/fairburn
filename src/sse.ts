import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createServer } from "./index.js";

const app = express();

const { server, cleanup } = createServer();

let transport: SSEServerTransport;

app.get("/sse", async(req, res) => {
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

process.on("SIGINT", async(): Promise<void> => {
  console.log("SIGINT received, cleaning up");
  await cleanup();
  await server.close();
  process.exit(0);
});

app.post("/message", async(req, res) => {
  console.log("Received message");

  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3031;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
