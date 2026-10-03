import cors from "cors";
import express from "express";
import helmet from "helmet";
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
import { paymentService } from "./src/payment/payment-service";

export function createApp() {
  const app = express();

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
    express.raw({ type: "application/json", limit: "64kb" }),
    createRazorpayWebhookHandler(paymentService),
  );
  app.use(express.json({ limit: "220kb" }));
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
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api", callsRouter);
  app.use("/api", publicRouter);
  app.use("/api", userRouter);
  app.use("/api", astroRouter);
  app.use("/api", blogsRouter);

  return app;
}

export const app = createApp();
