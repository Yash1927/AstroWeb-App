import { Router, type Response } from "express";
import multer from "multer";
import { requireAstrologer } from "../src/auth/require-astrologer";
import {
  bookingHistoryService,
  type BookingHistoryService,
} from "../src/booking-history/booking-history-service";
import { bookingHistoryParamsSchema } from "../src/booking-history/booking-history-schemas";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  sessionCookieOptions,
  sessionManager,
  type SessionManager,
} from "../src/auth/session";
import {
  astrologerProfileSchema,
  changeAstrologerPasswordSchema,
} from "../src/astrologer/astrologer-schemas";
import { availabilitySchema } from "../src/availability/availability-schemas";
import {
  availabilityService,
  type AvailabilityService,
} from "../src/availability/availability-service";
import {
  AstrologerNotFoundError,
  AstrologerPasswordStateError,
  astrologerService,
  type AstrologerService,
} from "../src/astrologer/astrologer-service";
import { emptyObjectSchema, parseOrRespond, parseOrRespondWithIssue } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";
import { blogService, BlogMediaValidationError, BlogNotFoundError, type BlogService } from "../src/blog/blog-service";
import { blogCommentParamsSchema, blogIdParamsSchema, blogWriteSchema } from "../src/blog/blog-schemas";
import { getMediaService, MAX_UPLOAD_BYTES, MediaUploadError, type MediaService } from "../src/media/media-service";
import { z } from "zod";

type Dependencies = {
  astrologers: AstrologerService;
  availability: AvailabilityService;
  bookings: BookingHistoryService;
  blogs?: BlogService;
  media?: MediaService;
  sessions: SessionManager;
};

const mediaIdParamsSchema = z.object({ id: z.uuid() }).strict();
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }).single("image");

function receiveImage(request: Parameters<typeof imageUpload>[0], response: Parameters<typeof imageUpload>[1], next: Parameters<typeof imageUpload>[2]) {
  imageUpload(request, response, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ error: "Choose an image smaller than 5 MB." });
      return;
    }
    if (error) {
      response.status(400).json({ error: "The image could not be read." });
      return;
    }
    next();
  });
}

function respondWithMediaError(error: unknown, response: Response) {
  if (error instanceof MediaUploadError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  logRouteError("astrologer.media", error);
  response.status(503).json({ error: "The image could not be saved. Please try again." });
}

function respondWithAstrologerError(error: unknown, response: Response) {
  if (error instanceof AstrologerNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof AstrologerPasswordStateError) {
    response.status(409).json({ error: error.message });
    return;
  }

  logRouteError("astrologer.route", error);
  response.status(503).json({ error: "The service is unavailable. Please try again." });
}

export function createAstrologerRouter({ astrologers, availability, bookings, blogs = blogService, media, sessions }: Dependencies) {
  const router = Router();
  router.use(requireAstrologer(sessions, astrologers));

  router.get("/session", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const state = await astrologers.getSessionState(response.locals.astrologerSession.subjectId);
      if (!state) {
        response.status(401).json({ error: "Please log in to continue." });
        return;
      }
      response.json({ authenticated: true, mustChangePassword: state.mustChangePassword });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.post("/logout", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      await sessions.destroy("astrologer", request.headers.cookie);
      response.clearCookie(
        sessionConfigs.astrologer.cookieName,
        clearSessionCookieOptions("astrologer"),
      );
      response.status(204).end();
    } catch (error) {
      logRouteError("astrologer.logout", error);
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  });

  router.put("/password", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(changeAstrologerPasswordSchema, request.body, response);
    if (!body) return;

    const astrologerId = response.locals.astrologerSession.subjectId;

    try {
      await astrologers.replaceTemporaryPassword(astrologerId, body.newPassword);
      const cookie = await sessions.create("astrologer", astrologerId);
      response.cookie(
        sessionConfigs.astrologer.cookieName,
        cookie,
        sessionCookieOptions("astrologer"),
      );
      response.json({ ok: true });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.use(async (_request, response, next) => {
    try {
      const state = await astrologers.getSessionState(
        response.locals.astrologerSession.subjectId,
      );
      if (!state) {
        response.status(401).json({ error: "Please log in to continue." });
        return;
      }
      if (state.mustChangePassword) {
        response.status(409).json({ error: "Set a new password before continuing." });
        return;
      }
      next();
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.get("/profile", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({
        profile: await astrologers.getProfile(response.locals.astrologerSession.subjectId),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.put("/profile", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(astrologerProfileSchema, request.body, response);
    if (!body) return;

    try {
      response.json({
        profile: await astrologers.saveProfile(
          response.locals.astrologerSession.subjectId,
          body,
        ),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.post("/profile/photo", receiveImage, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    if (!request.file) {
      response.status(400).json({ error: "Choose an image to upload." });
      return;
    }
    try {
      const asset = await (media ?? getMediaService()).uploadProfile(response.locals.astrologerSession.subjectId, request.file.buffer);
      response.status(201).json({ asset });
    } catch (error) { respondWithMediaError(error, response); }
  });

  router.delete("/profile/photo", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      await (media ?? getMediaService()).removeOwnProfile(response.locals.astrologerSession.subjectId);
      response.status(204).end();
    } catch (error) { respondWithMediaError(error, response); }
  });

  router.post("/blog-images", receiveImage, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    if (!request.file) {
      response.status(400).json({ error: "Choose an image to upload." });
      return;
    }
    try {
      const asset = await (media ?? getMediaService()).uploadBlogImage(response.locals.astrologerSession.subjectId, request.file.buffer);
      response.status(201).json({ asset });
    } catch (error) { respondWithMediaError(error, response); }
  });

  router.delete("/media/:id", async (request, response) => {
    const params = parseOrRespond(mediaIdParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      await (media ?? getMediaService()).deleteOwnAsset(response.locals.astrologerSession.subjectId, params.id);
      response.status(204).end();
    } catch (error) { respondWithMediaError(error, response); }
  });

  router.get("/availability", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({
        availability: await availability.getAvailability(
          response.locals.astrologerSession.subjectId,
        ),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.put("/availability", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(availabilitySchema, request.body, response);
    if (!body) return;

    try {
      response.json({
        availability: await availability.saveAvailability(
          response.locals.astrologerSession.subjectId,
          body,
        ),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.get("/bookings", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json(await bookings.listAstrologerBookings(
        response.locals.astrologerSession.subjectId,
      ));
    } catch (error) {
      logRouteError("astrologer.bookings.list", error);
      response.status(503).json({ error: "Bookings are unavailable. Please try again." });
    }
  });

  router.get("/bookings/:bookingId", async (request, response) => {
    const params = parseOrRespond(bookingHistoryParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const booking = await bookings.getAstrologerBooking(
        response.locals.astrologerSession.subjectId,
        params.bookingId,
      );
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }
      response.json({ booking });
    } catch (error) {
      logRouteError("astrologer.bookings.get", error);
      response.status(503).json({ error: "The booking is unavailable. Please try again." });
    }
  });

  router.get("/blogs", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      response.json({ posts: await blogs.listAstrologerPosts(response.locals.astrologerSession.subjectId) });
    } catch (error) {
      logRouteError("astrologer.blogs.list", error);
      response.status(503).json({ error: "Blogs are unavailable. Please try again." });
    }
  });

  router.post("/blogs", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespondWithIssue(blogWriteSchema, request.body, response);
    if (!body) return;
    try {
      response.status(201).json({ post: await blogs.saveAstrologerPost(response.locals.astrologerSession.subjectId, null, body) });
    } catch (error) {
      if (error instanceof BlogMediaValidationError) response.status(400).json({ error: error.message });
      else if (error instanceof BlogNotFoundError) response.status(404).json({ error: error.message });
      else {
        logRouteError("astrologer.blogs.create", error);
        response.status(503).json({ error: "The post could not be saved. Please try again." });
      }
    }
  });

  router.put("/blogs/:id", async (request, response) => {
    const params = parseOrRespond(blogIdParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespondWithIssue(blogWriteSchema, request.body, response);
    if (!body) return;
    try {
      response.json({ post: await blogs.saveAstrologerPost(response.locals.astrologerSession.subjectId, params.id, body) });
    } catch (error) {
      if (error instanceof BlogMediaValidationError) response.status(400).json({ error: error.message });
      else if (error instanceof BlogNotFoundError) response.status(404).json({ error: error.message });
      else {
        logRouteError("astrologer.blogs.update", error);
        response.status(503).json({ error: "The post could not be saved. Please try again." });
      }
    }
  });

  router.delete("/blogs/:id", async (request, response) => {
    const params = parseOrRespond(blogIdParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      await blogs.deleteAstrologerPost(response.locals.astrologerSession.subjectId, params.id);
      response.status(204).end();
    } catch (error) {
      if (error instanceof BlogNotFoundError) response.status(404).json({ error: error.message });
      else {
        logRouteError("astrologer.blogs.delete", error);
        response.status(503).json({ error: "The post could not be deleted. Please try again." });
      }
    }
  });

  router.delete("/blogs/:id/comments/:commentId", async (request, response) => {
    const params = parseOrRespond(blogCommentParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      await blogs.deleteAstrologerComment(response.locals.astrologerSession.subjectId, params.id, params.commentId);
      response.status(204).end();
    } catch (error) {
      if (error instanceof BlogNotFoundError) response.status(404).json({ error: error.message });
      else {
        logRouteError("astrologer.blog-comments.delete", error);
        response.status(503).json({ error: "The comment could not be deleted. Please try again." });
      }
    }
  });

  return router;
}

export default createAstrologerRouter({
  astrologers: astrologerService,
  availability: availabilityService,
  bookings: bookingHistoryService,
  blogs: blogService,
  sessions: sessionManager,
});
