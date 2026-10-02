import { Router, type Response } from "express";
import { requireOwner } from "../src/auth/require-owner";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  sessionManager,
  type SessionManager,
} from "../src/auth/session";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import {
  activeSchema,
  astrologerIdSchema,
  createAstrologerSchema,
  listedSchema,
  resetPasswordSchema,
  settingsSchema,
  updateAstrologerSchema,
} from "../src/owner/owner-schemas";
import {
  OwnerConflictError,
  OwnerNotFoundError,
  ownerService,
  OwnerStateError,
  type OwnerService,
} from "../src/owner/owner-service";
import { blogService, BlogNotFoundError, type BlogService } from "../src/blog/blog-service";
import { ownerCommentParamsSchema } from "../src/blog/blog-schemas";

type OwnerRouterDependencies = {
  owners: OwnerService;
  blogs?: BlogService;
  sessions: SessionManager;
};

function respondWithOwnerError(error: unknown, response: Response) {
  if (error instanceof OwnerNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof OwnerConflictError || error instanceof OwnerStateError) {
    response.status(409).json({ error: error.message });
    return;
  }

  response.status(503).json({ error: "The service is unavailable. Please try again." });
}

export function createOwnerRouter({ owners, blogs = blogService, sessions }: OwnerRouterDependencies) {
  const router = Router();

  router.use(requireOwner(sessions, owners));

  router.get("/session", (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    response.json({ authenticated: true });
  });

  router.post("/logout", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      await sessions.destroy("owner", request.headers.cookie);
      response.clearCookie(
        sessionConfigs.owner.cookieName,
        clearSessionCookieOptions("owner"),
      );
      response.status(204).end();
    } catch {
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  });

  router.get("/astrologers", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({ astrologers: await owners.listAstrologers() });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.post("/astrologers", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(createAstrologerSchema, request.body, response);
    if (!body) return;

    try {
      response.status(201).json({ astrologer: await owners.createAstrologer(body) });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.get("/astrologers/:id", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const params = parseOrRespond(astrologerIdSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({ astrologer: await owners.getAstrologer(params.id) });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.patch("/astrologers/:id", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const params = parseOrRespond(astrologerIdSchema, request.params, response);
    const body = parseOrRespond(updateAstrologerSchema, request.body, response);
    if (!params || !body) return;

    try {
      response.json({ astrologer: await owners.updateAstrologer(params.id, body) });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.patch("/astrologers/:id/listing", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const params = parseOrRespond(astrologerIdSchema, request.params, response);
    const body = parseOrRespond(listedSchema, request.body, response);
    if (!params || !body) return;

    try {
      response.json({
        astrologer: await owners.setAstrologerListed(params.id, body.isListed),
      });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.patch("/astrologers/:id/active", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const params = parseOrRespond(astrologerIdSchema, request.params, response);
    const body = parseOrRespond(activeSchema, request.body, response);
    if (!params || !body) return;

    try {
      response.json({
        astrologer: await owners.setAstrologerActive(params.id, body.isActive),
      });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.post("/astrologers/:id/reset-password", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const params = parseOrRespond(astrologerIdSchema, request.params, response);
    const body = parseOrRespond(resetPasswordSchema, request.body, response);
    if (!params || !body) return;

    try {
      await owners.resetAstrologerPassword(params.id, body.temporaryPassword);
      response.json({ ok: true });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.get("/settings", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({ settings: await owners.getSettings() });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.put("/settings", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(settingsSchema, request.body, response);
    if (!body) return;

    try {
      response.json({ settings: await owners.updateSettings(body) });
    } catch (error) {
      respondWithOwnerError(error, response);
    }
  });

  router.get("/comments/recent", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      response.json({ comments: await blogs.listRecentComments() });
    } catch {
      response.status(503).json({ error: "Comments are unavailable. Please try again." });
    }
  });

  router.delete("/comments/:commentId", async (request, response) => {
    const params = parseOrRespond(ownerCommentParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      await blogs.deleteOwnerComment(params.commentId);
      response.status(204).end();
    } catch (error) {
      if (error instanceof BlogNotFoundError) response.status(404).json({ error: error.message });
      else response.status(503).json({ error: "The comment could not be deleted. Please try again." });
    }
  });

  return router;
}

export default createOwnerRouter({ owners: ownerService, blogs: blogService, sessions: sessionManager });
