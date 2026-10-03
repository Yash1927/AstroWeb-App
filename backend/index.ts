import "dotenv/config";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { attachRealtimeServer } from "./src/realtime/index";
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const app = createApp({
  frontendDistPath: process.env.NODE_ENV === "production"
    ? fileURLToPath(new URL("./public", import.meta.url))
    : undefined,
});
const server = createServer(app);
attachRealtimeServer(server);

server.listen(port, () => {
  console.log(`Astromaitreyi listening on port ${port}.`);
});
