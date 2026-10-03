import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { force: true, recursive: true })
  )));
  delete process.env.APP_ORIGIN;
});

async function productionApp() {
  const directory = await mkdtemp(path.join(tmpdir(), "astromaitreyi-frontend-"));
  temporaryDirectories.push(directory);
  await writeFile(path.join(directory, "index.html"), "<!doctype html><title>Astromaitreyi shell</title>");
  await writeFile(path.join(directory, "asset.js"), "globalThis.productionAsset = true;");
  process.env.APP_ORIGIN = "https://app.example.test";
  return createApp({ frontendDistPath: directory, nodeEnv: "production" });
}

describe("production HTTP app", () => {
  it("trusts one hosting proxy and redirects direct HTTP to the HTTPS origin", async () => {
    const app = await productionApp();
    const response = await request(app).get("/history?from=test");

    expect(app.get("trust proxy")).toBe(1);
    expect(response.status).toBe(308);
    expect(response.headers.location).toBe("https://app.example.test/history?from=test");
  });

  it("serves static assets and the SPA shell only on non-API routes", async () => {
    const app = await productionApp();
    const secure = { "X-Forwarded-Proto": "https" };

    const asset = await request(app).get("/asset.js").set(secure);
    const screen = await request(app).get("/blogs/a-post").set(secure);
    const apiMiss = await request(app).get("/api/not-a-route").set(secure);
    const websocketMiss = await request(app).get("/ws").set(secure);
    const websocketChildMiss = await request(app).get("/ws/other").set(secure);

    expect(asset.status).toBe(200);
    expect(asset.text).toContain("productionAsset");
    expect(screen.status).toBe(200);
    expect(screen.text).toContain("Astromaitreyi shell");
    expect(apiMiss.status).toBe(404);
    expect(websocketMiss.status).toBe(404);
    expect(websocketChildMiss.status).toBe(404);
  });

  it("sets HSTS, a restricted CSP and exact-origin credentialed CORS", async () => {
    const app = await productionApp();
    const response = await request(app)
      .get("/api/health")
      .set("X-Forwarded-Proto", "https")
      .set("Origin", "https://app.example.test");

    expect(response.status).toBe(200);
    expect(response.headers["strict-transport-security"]).toContain("max-age=");
    expect(response.headers["content-security-policy"]).toContain("checkout.razorpay.com");
    expect(response.headers["content-security-policy"]).toContain("accounts.google.com");
    expect(response.headers["access-control-allow-origin"]).toBe("https://app.example.test");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");

    const denied = await request(app)
      .get("/api/health")
      .set("X-Forwarded-Proto", "https")
      .set("Origin", "https://evil.example");
    expect(denied.headers["access-control-allow-origin"]).toBe("https://app.example.test");
    expect(denied.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });

  it("rejects unexpected health and webhook query input before handling it", async () => {
    const app = await productionApp();
    const secure = { "X-Forwarded-Proto": "https" };
    expect((await request(app).get("/api/health?extra=true").set(secure)).status).toBe(400);
    expect((await request(app).get("/api/health/db?extra=true").set(secure)).status).toBe(400);
    expect((await request(app).get("/api/settings/public?extra=true").set(secure)).status).toBe(400);
    expect((await request(app).post("/api/razorpay/webhook?extra=true").set(secure)).status).toBe(400);
  });

  it("fails clearly when the production frontend build is absent", () => {
    process.env.APP_ORIGIN = "https://app.example.test";
    expect(() => createApp({ frontendDistPath: path.join(tmpdir(), "missing-astromaitreyi-build"), nodeEnv: "production" }))
      .toThrow("Run npm run build first");
  });
});

describe("development HTTP app", () => {
  it("does not trust proxies or expose a production SPA fallback", async () => {
    const app = createApp({ nodeEnv: "development" });
    expect(app.get("trust proxy")).toBe(false);
    expect((await request(app).get("/history")).status).toBe(404);
  });
});
