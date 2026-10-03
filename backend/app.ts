import cors from "cors";
import express from "express";
import helmet from "helmet";
import { accessSync, constants } from "node:fs";
import path from "node:path";
import astroRouter from "./routes/Astro";
import astrologerRouter from "./routes/Astrologer";
import astrologerAuthRouter from "./routes/AstrologerAuth";
import publicAstrologerRouter from "./routes/Astrologers";
import blogsRouter from "./routes/Blogs";
import bookingsRouter from "./routes/Bookings";
import callsRouter from "./routes/Calls";
import ownerRouter from "./routes/Owner";
import ownerAuthRouter from "./routes/OwnerAuth";
import paymentsRouter, { createRazorpayWebhookHandler } from "./routes/Payments";
import publicRouter from "./routes/Public";
import userRouter from "./routes/User";
import userAuthRouter from "./routes/UserAuth";
import { emptyObjectSchema, parseOrRespond } from "./src/http/validation";
import { paymentService } from "./src/payment/payment-service";

type AppOptions = {
  frontendDistPath?: string;
  nodeEnv?: string;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;

  if (nodeEnv === "production") {
    app.set("trust proxy", 1);
    app.use((request, response, next) => {
      if (request.secure) {
        next();
        return;
      }
      const origin = process.env.APP_ORIGIN;
      if (!origin?.startsWith("https://")) {
        response.status(503).json({ error: "The production HTTPS origin is not configured." });
        return;
      }
      response.redirect(308, `${origin}${request.originalUrl}`);
    });
  }

  const mediaOrigin = (() => {
    try { return process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL).origin : undefined; }
    catch { return undefined; }
  })();
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", ...(mediaOrigin ? [mediaOrigin] : [])],
        "script-src": ["'self'", "https://checkout.razorpay.com", "https://accounts.google.com"],
        "frame-src": ["'self'", "https://api.razorpay.com", "https://accounts.google.com"],
        "connect-src": ["'self'", "https://checkout.razorpay.com", "https://accounts.google.com"],
      },
    },
  }));

  app.post(
    "/api/razorpay/webhook",
    (request, response, next) => {
      if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
      if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
      next();
    },
    express.raw({ type: "application/json", limit: "64kb" }),
    createRazorpayWebhookHandler(paymentService),
  );
  app.use(express.json({ limit: "220kb" }));
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(
    cors({
      origin: process.env.APP_ORIGIN || false,
      credentials: true,
    }),
  );

  app.get("/api/health", (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    response.json({ ok: true });
  });

  app.use("/api/auth/owner", ownerAuthRouter);
  app.use("/api/auth/astrologer", astrologerAuthRouter);
  app.use("/api/auth", userAuthRouter);
  app.use("/api/owner", ownerRouter);
  app.use("/api/astrologer", astrologerRouter);
  app.use("/api/astrologers", publicAstrologerRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api", callsRouter);
  app.use("/api", publicRouter);
  app.use("/api", userRouter);
  app.use("/api", astroRouter);
  app.use("/api", blogsRouter);

  if (nodeEnv === "production") {
    if (!options.frontendDistPath) {
      throw new Error("The production frontend path is not configured.");
    }

    const indexPath = path.join(options.frontendDistPath, "index.html");
    try {
      accessSync(indexPath, constants.R_OK);
    } catch {
      throw new Error(`The production frontend is missing at ${indexPath}. Run npm run build first.`);
    }

    app.use(express.static(options.frontendDistPath, { index: false }));
    app.use((request, response, next) => {
      if (
        request.method !== "GET"
        || request.path.startsWith("/api")
        || request.path === "/ws"
        || request.path.startsWith("/ws/")
      ) {
        next();
        return;
      }
      response.sendFile(indexPath);
    });
  }

  return app;
}
