import { Router, type Response } from "express";
import { requireUser } from "../src/auth/require-user";
import { sessionManager, type SessionManager } from "../src/auth/session";
import { blogService, BlogNotFoundError, type BlogService } from "../src/blog/blog-service";
import { blogCommentParamsSchema, blogCommentSchema, blogIdParamsSchema, blogListQuerySchema } from "../src/blog/blog-schemas";
import { commentRateLimiter, type CommentRateLimiter } from "../src/blog/comment-rate-limit";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { userService, type UserService } from "../src/user/user-service";

type Dependencies = { blogs: BlogService; comments: CommentRateLimiter; sessions: SessionManager; users: UserService };

function blogError(error: unknown, response: Response) {
  if (error instanceof BlogNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }
  response.status(503).json({ error: "Blogs are unavailable. Please try again." });
}

export function createBlogsRouter({ blogs, comments, sessions, users }: Dependencies) {
  const router = Router();
  const userGuard = requireUser(sessions, users);

  router.get("/blogs", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    const query = parseOrRespond(blogListQuerySchema, request.query, response);
    if (!query) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try { response.json(await blogs.listPublishedPosts(query.page)); }
    catch (error) { blogError(error, response); }
  });

  router.get("/blogs/:id", async (request, response) => {
    const params = parseOrRespond(blogIdParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      const session = await sessions.resolve("user", request.headers.cookie);
      const viewerId = session && await users.userExists(session.subjectId) ? session.subjectId : undefined;
      response.json({ post: await blogs.getPublishedPost(params.id, viewerId) });
    } catch (error) { blogError(error, response); }
  });

  router.put("/blogs/:id/like", userGuard, async (request, response) => {
    const params = parseOrRespond(blogIdParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try { response.json(await blogs.toggleLike(params.id, response.locals.userSession.subjectId)); }
    catch (error) { blogError(error, response); }
  });

  router.post("/blogs/:id/comments", userGuard, async (request, response) => {
    const params = parseOrRespond(blogIdParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(blogCommentSchema, request.body, response);
    if (!body) return;
    const rate = comments.consume(comments.key(response.locals.userSession.subjectId, request.ip ?? request.socket.remoteAddress ?? "unknown"));
    if (!rate.allowed) {
      response.set("Retry-After", String(rate.retryAfterSeconds));
      response.status(429).json({ error: "Please wait before posting another comment." });
      return;
    }
    try {
      response.status(201).json({ comment: await blogs.createComment(params.id, response.locals.userSession.subjectId, body.body) });
    } catch (error) { blogError(error, response); }
  });

  router.delete("/blogs/:id/comments/:commentId", userGuard, async (request, response) => {
    const params = parseOrRespond(blogCommentParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
    try {
      await blogs.deleteUserComment(response.locals.userSession.subjectId, params.id, params.commentId);
      response.status(204).end();
    } catch (error) { blogError(error, response); }
  });

  return router;
}

export default createBlogsRouter({ blogs: blogService, comments: commentRateLimiter, sessions: sessionManager, users: userService });
