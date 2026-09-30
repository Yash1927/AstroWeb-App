import "dotenv/config";
import cors from "cors";
import express from "express";
import astroRouter from "./routes/Astro";
import blogsRouter from "./routes/Blogs";
import publicRouter from "./routes/Public";
import userRouter from "./routes/User";

const app = express();
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

app.use(express.json());
app.use(
  cors({
    origin: process.env.APP_ORIGIN || false,
    credentials: true,
  }),
);

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api", publicRouter);
app.use("/api", userRouter);
app.use("/api", astroRouter);
app.use("/api", blogsRouter);

app.listen(port, () => {
  console.log(`AstroWebApp backend listening on port ${port}.`);
});
