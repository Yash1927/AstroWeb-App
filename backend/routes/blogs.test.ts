import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedSession, SessionManager } from "../src/auth/session";
import type { BlogService, PublicBlogComment, PublicBlogPost } from "../src/blog/blog-service";
import { CommentRateLimiter } from "../src/blog/comment-rate-limit";
import type { UserDetails, UserService } from "../src/user/user-service";
import { createBlogsRouter } from "./Blogs";

const blogId = "43f7d52f-98aa-4f2d-bc32-3baa7382080f";
const commentId = "8b834d55-89c3-47d2-ab28-b8373842fd40";
const userId = "1d0f2227-690e-49e4-bd96-06440f358424";

const comment: PublicBlogComment = {
  id: commentId,
  body: "A calm comment.",
  createdAt: "2026-10-02T08:00:00Z",
  canDelete: true,
  author: { firstName: "Maya", avatarId: "public-avatar" },
};

const post: PublicBlogPost = {
  id: blogId,
  title: "A gentle guide",
  body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "First paragraph." }] }] },
  excerpt: "First paragraph. Second paragraph.",
  publishedAt: "2026-10-02T07:00:00Z",
  author: { id: "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0", displayName: "Anika Rao", photoUrl: null },
  coverUrl: null,
  readingMinutes: 1,
  likeCount: 2,
  commentCount: 1,
  likedByViewer: true,
  comments: [comment],
};

function fakeBlogs(): BlogService {
  return {
    createComment: vi.fn(async () => comment),
    deleteAstrologerComment: vi.fn(async () => undefined),
    deleteAstrologerPost: vi.fn(async () => undefined),
    deleteOwnerComment: vi.fn(async () => undefined),
    deleteUserComment: vi.fn(async () => undefined),
    getPublishedPost: vi.fn(async () => post),
    listAstrologerPosts: vi.fn(async () => []),
    listPublishedPosts: vi.fn(async () => ({ nextPage: null, posts: [post] })),
    listRecentComments: vi.fn(async () => []),
    saveAstrologerPost: vi.fn(async () => ({
      id: blogId,
      title: post.title,
      body: post.body,
      coverMediaId: null,
      coverUrl: null,
      status: "published" as const,
      publishedAt: post.publishedAt,
      createdAt: post.publishedAt,
      updatedAt: post.publishedAt,
      likeCount: 2,
      readingMinutes: 1,
      commentCount: 1,
      comments: [{ id: commentId, body: comment.body, createdAt: comment.createdAt, authorFirstName: "Maya" }],
    })),
    toggleLike: vi.fn(async () => ({ liked: true, likeCount: 3 })),
  };
}

function fakeUsers(): UserService {
  const details: UserDetails = {
    id: userId,
    email: "maya@example.com",
    name: "Maya Shah",
    birthDate: null,
    birthTime: null,
    birthPlace: null,
    phone: null,
    gender: null,
    subscriptionCredits: 0,
    detailsComplete: false,
  };
  return {
    findOrCreateGoogleUser: vi.fn(async () => ({ id: userId })),
    getUser: vi.fn(async () => details),
    updateUser: vi.fn(async () => details),
    userExists: vi.fn(async () => true),
  };
}

function fakeSessions(authenticated = true): SessionManager {
  const session: ResolvedSession = { id: "session", role: "user", subjectId: userId };
  return {
    create: vi.fn(async () => "signed"),
    destroy: vi.fn(async () => undefined),
    resolve: vi.fn(async () => authenticated ? session : null),
  };
}

function testApp(
  blogs = fakeBlogs(),
  authenticated = true,
  comments = new CommentRateLimiter(),
) {
  const app = express();
  app.use(express.json());
  app.use("/api", createBlogsRouter({
    blogs,
    comments,
    sessions: fakeSessions(authenticated),
    users: fakeUsers(),
  }));
  return { app, blogs };
}

describe("public blogs", () => {
  it("lists published summaries 20 at a time and reads a post without login", async () => {
    const { app, blogs } = testApp(fakeBlogs(), false);
    const list = await request(app).get("/api/blogs?page=2");
    const detail = await request(app).get(`/api/blogs/${blogId}`);

    expect(list.status).toBe(200);
    expect(blogs.listPublishedPosts).toHaveBeenCalledWith(2);
    expect(detail.status).toBe(200);
    expect(detail.body.post.body.type).toBe("doc");
    expect(JSON.stringify(detail.body.post.body)).toContain("First paragraph.");
    expect(blogs.getPublishedPost).toHaveBeenCalledWith(blogId, undefined);
  });

  it("rejects unknown pagination and invalid ids", async () => {
    const { app, blogs } = testApp();
    expect((await request(app).get("/api/blogs?page=0")).status).toBe(400);
    expect((await request(app).get("/api/blogs?status=draft")).status).toBe(400);
    expect((await request(app).get("/api/blogs/not-an-id")).status).toBe(400);
    expect(blogs.listPublishedPosts).not.toHaveBeenCalled();
  });
});

describe("user blog actions", () => {
  it("requires a live user session for likes, comments and deletion", async () => {
    const { app, blogs } = testApp(fakeBlogs(), false);
    expect((await request(app).put(`/api/blogs/${blogId}/like`)).status).toBe(401);
    expect((await request(app).post(`/api/blogs/${blogId}/comments`).send({ body: "Hello" })).status).toBe(401);
    expect((await request(app).delete(`/api/blogs/${blogId}/comments/${commentId}`)).status).toBe(401);
    expect(blogs.toggleLike).not.toHaveBeenCalled();
  });

  it("uses the session subject and preserves plain comment text", async () => {
    const { app, blogs } = testApp();
    const like = await request(app).put(`/api/blogs/${blogId}/like`);
    const created = await request(app).post(`/api/blogs/${blogId}/comments`).send({
      body: " <script>alert(1)</script> ",
    });
    const removed = await request(app).delete(`/api/blogs/${blogId}/comments/${commentId}`);

    expect(like.status).toBe(200);
    expect(created.status).toBe(201);
    expect(removed.status).toBe(204);
    expect(blogs.toggleLike).toHaveBeenCalledWith(blogId, userId);
    expect(blogs.createComment).toHaveBeenCalledWith(blogId, userId, "<script>alert(1)</script>");
    expect(blogs.deleteUserComment).toHaveBeenCalledWith(userId, blogId, commentId);
  });

  it("limits comments and validates the 500-character maximum", async () => {
    const limiter = new CommentRateLimiter({ limit: 1, windowMs: 60_000 });
    const { app, blogs } = testApp(fakeBlogs(), true, limiter);
    expect((await request(app).post(`/api/blogs/${blogId}/comments`).send({ body: "First" })).status).toBe(201);
    const limited = await request(app).post(`/api/blogs/${blogId}/comments`).send({ body: "Second" });
    const tooLong = await request(app).post(`/api/blogs/${blogId}/comments`).send({ body: "x".repeat(501) });

    expect(limited.status).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    expect(tooLong.status).toBe(400);
    expect(blogs.createComment).toHaveBeenCalledTimes(1);
  });
});
