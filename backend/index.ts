import "dotenv/config";
import { createServer } from "node:http";
import { app } from "./app";
import { attachRealtimeServer } from "./src/realtime/index";
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = createServer(app);
attachRealtimeServer(server);

server.listen(port, () => {
  console.log(`AstroWebApp backend listening on port ${port}.`);
});
