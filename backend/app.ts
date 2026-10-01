import cors from "cors";
import express from "express";
import astroRouter from "./routes/Astro";
import astrologerRouter from "./routes/Astrologer";
import astrologerAuthRouter from "./routes/AstrologerAuth";
import publicAstrologerRouter from "./routes/Astrologers";
import blogsRouter from "./routes/Blogs";
import ownerRouter from "./routes/Owner";
import ownerAuthRouter from "./routes/OwnerAuth";
import publicRouter from "./routes/Public";
import userRouter from "./routes/User";
import userAuthRouter from "./routes/UserAuth";

export function createApp() {
  const app = express();

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

  app.use("/api/auth/owner", ownerAuthRouter);
  app.use("/api/auth/astrologer", astrologerAuthRouter);
  app.use("/api/auth", userAuthRouter);
  app.use("/api/owner", ownerRouter);
  app.use("/api/astrologer", astrologerRouter);
  app.use("/api/astrologers", publicAstrologerRouter);
  app.use("/api", publicRouter);
  app.use("/api", userRouter);
  app.use("/api", astroRouter);
  app.use("/api", blogsRouter);

  return app;
}

export const app = createApp();
