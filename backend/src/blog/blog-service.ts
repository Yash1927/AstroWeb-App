import { createHash, randomUUID } from "node:crypto";
import "temporal-polyfill/global";
import { db } from "../prisma/db";
import type { z } from "zod";
import type { blogWriteSchema } from "./blog-schemas";

export type BlogWriteInput = z.infer<typeof blogWriteSchema>;

type BlogRow = {
  astrologerId: string;
  body: string;
  createdAt: Temporal.Instant;
  id: string;
  publishedAt: Temporal.Instant | null;
  status: "draft" | "published";
  title: string;
  updatedAt: Temporal.Instant;
};

type AstrologerRow = { displayName: string; id: string };
type CommentRow = {
  blogId: string;
  body: string;
  createdAt: Temporal.Instant;
  id: string;
  userId: string;
};
type UserRow = { id: string; name: string };

export type BlogSummary = {
  author: AstrologerRow;
  commentCount: number;
  excerpt: string;
  id: string;
  likeCount: number;
  publishedAt: string;
  title: string;
};

export type PublicBlogComment = {
  author: { avatarId: string; firstName: string };
  body: string;
  canDelete: boolean;
  createdAt: string;
  id: string;
};

export type PublicBlogPost = BlogSummary & {
  body: string;
  comments: PublicBlogComment[];
  likedByViewer: boolean;
};

export type AstrologerBlogPost = {
  body: string;
  commentCount: number;
  comments: Array<{
    authorFirstName: string;
    body: string;
    createdAt: string;
    id: string;
  }>;
  createdAt: string;
  id: string;
  likeCount: number;
  publishedAt: string | null;
  status: "draft" | "published";
  title: string;
  updatedAt: string;
};

export type RecentComment = {
  authorFirstName: string;
  blogId: string;
  body: string;
  createdAt: string;
  id: string;
  postTitle: string;
};

export class BlogNotFoundError extends Error {}

export interface BlogService {
  createComment(blogId: string, userId: string, body: string): Promise<PublicBlogComment>;
  deleteAstrologerComment(astrologerId: string, blogId: string, commentId: string): Promise<void>;
  deleteAstrologerPost(astrologerId: string, blogId: string): Promise<void>;
  deleteOwnerComment(commentId: string): Promise<void>;
  deleteUserComment(userId: string, blogId: string, commentId: string): Promise<void>;
  getPublishedPost(blogId: string, viewerId?: string): Promise<PublicBlogPost>;
  listAstrologerPosts(astrologerId: string): Promise<AstrologerBlogPost[]>;
  listPublishedPosts(page: number): Promise<{ nextPage: number | null; posts: BlogSummary[] }>;
  listRecentComments(): Promise<RecentComment[]>;
  saveAstrologerPost(astrologerId: string, blogId: string | null, input: BlogWriteInput): Promise<AstrologerBlogPost>;
  toggleLike(blogId: string, userId: string): Promise<{ likeCount: number; liked: boolean }>;
}

const blogFields = [
  "id",
  "astrologerId",
  "title",
  "body",
  "status",
  "publishedAt",
  "createdAt",
  "updatedAt",
] as const;

function firstName(name: string) {
  return name.trim().split(/\s+/u)[0] || "User";
}

function avatarId(userId: string) {
  return createHash("sha256").update(`blog-avatar\0${userId}`).digest("base64url");
}

function excerpt(body: string) {
  return body.replace(/\s+/gu, " ").trim();
}

function countByBlog(rows: { blogId: string }[]) {
  const result = new Map<string, number>();
  for (const row of rows) result.set(row.blogId, (result.get(row.blogId) ?? 0) + 1);
  return result;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export class DatabaseBlogService implements BlogService {
  async listPublishedPosts(page: number) {
    const rows = await db.orm.public.Blog.select(...blogFields)
      .where({ status: "published" })
      .where((blog) => blog.publishedAt.isNotNull())
      .orderBy([(blog) => blog.publishedAt.desc(), (blog) => blog.id.desc()])
      .offset((page - 1) * 20)
      .limit(21)
      .all() as BlogRow[];
    const pageRows = rows.slice(0, 20);
    const [authors, likes, comments] = await Promise.all([
      this.findAstrologers(unique(pageRows.map((post) => post.astrologerId))),
      this.findLikes(pageRows.map((post) => post.id)),
      this.findComments(pageRows.map((post) => post.id)),
    ]);
    const authorMap = new Map(authors.map((author) => [author.id, author]));
    const likeCounts = countByBlog(likes);
    const commentCounts = countByBlog(comments);

    return {
      posts: pageRows.flatMap((post) => {
        const author = authorMap.get(post.astrologerId);
        return author && post.publishedAt ? [{
          id: post.id,
          title: post.title,
          excerpt: excerpt(post.body),
          publishedAt: post.publishedAt.toString(),
          author,
          likeCount: likeCounts.get(post.id) ?? 0,
          commentCount: commentCounts.get(post.id) ?? 0,
        }] : [];
      }),
      nextPage: rows.length > 20 ? page + 1 : null,
    };
  }

  async getPublishedPost(blogId: string, viewerId?: string) {
    const post = await db.orm.public.Blog.select(...blogFields).first({
      id: blogId,
      status: "published",
    }) as BlogRow | null;
    if (!post?.publishedAt) throw new BlogNotFoundError("Post not found.");

    const [authors, likes, comments] = await Promise.all([
      this.findAstrologers([post.astrologerId]),
      this.findLikes([post.id]),
      this.findComments([post.id]),
    ]);
    const author = authors[0];
    if (!author) throw new BlogNotFoundError("Post not found.");
    const users = await this.findUsers(unique(comments.map((comment) => comment.userId)));
    const userMap = new Map(users.map((user) => [user.id, user]));

    return {
      id: post.id,
      title: post.title,
      body: post.body,
      excerpt: excerpt(post.body),
      publishedAt: post.publishedAt.toString(),
      author,
      likeCount: likes.length,
      commentCount: comments.length,
      likedByViewer: viewerId ? likes.some((like) => like.userId === viewerId) : false,
      comments: comments
        .sort((left, right) => Temporal.Instant.compare(left.createdAt, right.createdAt))
        .flatMap((comment) => {
          const user = userMap.get(comment.userId);
          return user ? [{
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt.toString(),
            canDelete: comment.userId === viewerId,
            author: { firstName: firstName(user.name), avatarId: avatarId(user.id) },
          }] : [];
        }),
    };
  }

  async toggleLike(blogId: string, userId: string) {
    await this.requirePublished(blogId);
    const existing = await db.orm.public.BlogLike.select("blogId").first({ blogId, userId });
    if (existing) {
      await db.orm.public.BlogLike.where({ blogId, userId }).delete();
    } else {
      await db.orm.public.BlogLike.create({ blogId, userId });
    }
    const likes = await this.findLikes([blogId]);
    return { liked: !existing, likeCount: likes.length };
  }

  async createComment(blogId: string, userId: string, body: string) {
    await this.requirePublished(blogId);
    const user = (await this.findUsers([userId]))[0];
    if (!user) throw new BlogNotFoundError("User not found.");
    const comment = await db.orm.public.BlogComment.select(
      "id",
      "blogId",
      "userId",
      "body",
      "createdAt",
    ).create({ id: randomUUID(), blogId, userId, body }) as CommentRow;
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toString(),
      canDelete: true,
      author: { firstName: firstName(user.name), avatarId: avatarId(user.id) },
    };
  }

  async deleteUserComment(userId: string, blogId: string, commentId: string) {
    const comment = await db.orm.public.BlogComment.select("id").first({
      id: commentId,
      blogId,
      userId,
    });
    if (!comment) throw new BlogNotFoundError("Comment not found.");
    await db.orm.public.BlogComment.where({ id: commentId, blogId, userId }).delete();
  }

  async listAstrologerPosts(astrologerId: string) {
    const rows = await db.orm.public.Blog.select(...blogFields)
      .where({ astrologerId })
      .orderBy((blog) => blog.updatedAt.desc())
      .all() as BlogRow[];
    const [likes, comments] = await Promise.all([
      this.findLikes(rows.map((post) => post.id)),
      this.findComments(rows.map((post) => post.id)),
    ]);
    const users = await this.findUsers(unique(comments.map((comment) => comment.userId)));
    const userMap = new Map(users.map((user) => [user.id, user]));
    const likeCounts = countByBlog(likes);
    const commentCounts = countByBlog(comments);
    return rows.map((post) => this.astrologerPost(
      post,
      likeCounts.get(post.id) ?? 0,
      comments.filter((comment) => comment.blogId === post.id).flatMap((comment) => {
        const user = userMap.get(comment.userId);
        return user ? [{
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toString(),
          authorFirstName: firstName(user.name),
        }] : [];
      }),
    ));
  }

  async saveAstrologerPost(astrologerId: string, blogId: string | null, input: BlogWriteInput) {
    const now = Temporal.Now.instant();
    let id = blogId;
    if (blogId) {
      const current = await db.orm.public.Blog.select("id", "status", "publishedAt").first({
        id: blogId,
        astrologerId,
      });
      if (!current) throw new BlogNotFoundError("Post not found.");
      await db.orm.public.Blog.where({ id: blogId, astrologerId }).update({
        title: input.title,
        body: input.body,
        status: input.status,
        publishedAt: input.status === "published"
          ? current.status === "published" ? current.publishedAt : now
          : null,
      });
    } else {
      id = randomUUID();
      await db.orm.public.Blog.create({
        id,
        astrologerId,
        title: input.title,
        body: input.body,
        status: input.status,
        publishedAt: input.status === "published" ? now : null,
      });
    }
    const saved = await db.orm.public.Blog.select(...blogFields).first({ id, astrologerId }) as BlogRow | null;
    if (!saved) throw new BlogNotFoundError("Post not found.");
    const [likes, comments] = await Promise.all([this.findLikes([saved.id]), this.findComments([saved.id])]);
    const users = await this.findUsers(unique(comments.map((comment) => comment.userId)));
    const userMap = new Map(users.map((user) => [user.id, user]));
    return this.astrologerPost(saved, likes.length, comments.flatMap((comment) => {
      const user = userMap.get(comment.userId);
      return user ? [{
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toString(),
        authorFirstName: firstName(user.name),
      }] : [];
    }));
  }

  async deleteAstrologerPost(astrologerId: string, blogId: string) {
    const post = await db.orm.public.Blog.select("id").first({ id: blogId, astrologerId });
    if (!post) throw new BlogNotFoundError("Post not found.");
    await db.transaction(async (transaction) => {
      await transaction.orm.public.BlogLike.where({ blogId }).delete();
      await transaction.orm.public.BlogComment.where({ blogId }).delete();
      await transaction.orm.public.Blog.where({ id: blogId, astrologerId }).delete();
    });
  }

  async deleteAstrologerComment(astrologerId: string, blogId: string, commentId: string) {
    const post = await db.orm.public.Blog.select("id").first({ id: blogId, astrologerId });
    if (!post) throw new BlogNotFoundError("Comment not found.");
    const comment = await db.orm.public.BlogComment.select("id").first({ id: commentId, blogId });
    if (!comment) throw new BlogNotFoundError("Comment not found.");
    await db.orm.public.BlogComment.where({ id: commentId, blogId }).delete();
  }

  async listRecentComments() {
    const comments = await db.orm.public.BlogComment.select(
      "id",
      "blogId",
      "userId",
      "body",
      "createdAt",
    ).orderBy((comment) => comment.createdAt.desc()).limit(50).all() as CommentRow[];
    const [posts, users] = await Promise.all([
      this.findBlogs(unique(comments.map((comment) => comment.blogId))),
      this.findUsers(unique(comments.map((comment) => comment.userId))),
    ]);
    const postMap = new Map(posts.map((post) => [post.id, post]));
    const userMap = new Map(users.map((user) => [user.id, user]));
    return comments.flatMap((comment) => {
      const post = postMap.get(comment.blogId);
      const user = userMap.get(comment.userId);
      return post && user ? [{
        id: comment.id,
        blogId: comment.blogId,
        body: comment.body,
        createdAt: comment.createdAt.toString(),
        postTitle: post.title,
        authorFirstName: firstName(user.name),
      }] : [];
    });
  }

  async deleteOwnerComment(commentId: string) {
    const comment = await db.orm.public.BlogComment.select("id").first({ id: commentId });
    if (!comment) throw new BlogNotFoundError("Comment not found.");
    await db.orm.public.BlogComment.where({ id: commentId }).delete();
  }

  private astrologerPost(
    post: BlogRow,
    likeCount: number,
    comments: AstrologerBlogPost["comments"],
  ): AstrologerBlogPost {
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      publishedAt: post.publishedAt?.toString() ?? null,
      createdAt: post.createdAt.toString(),
      updatedAt: post.updatedAt.toString(),
      likeCount,
      commentCount: comments.length,
      comments: comments.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    };
  }

  private async requirePublished(blogId: string) {
    const post = await db.orm.public.Blog.select("id").first({ id: blogId, status: "published" });
    if (!post) throw new BlogNotFoundError("Post not found.");
  }

  private findAstrologers(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as AstrologerRow[]);
    return db.orm.public.Astrologer.select("id", "displayName")
      .where((astrologer) => astrologer.id.in(ids)).all();
  }

  private findBlogs(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as { id: string; title: string }[]);
    return db.orm.public.Blog.select("id", "title").where((blog) => blog.id.in(ids)).all();
  }

  private async findComments(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as CommentRow[]);
    const rows = await db.orm.public.BlogComment.select("id", "blogId", "userId", "body", "createdAt")
      .where((comment) => comment.blogId.in(ids)).all();
    return rows as CommentRow[];
  }

  private findLikes(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as { blogId: string; userId: string }[]);
    return db.orm.public.BlogLike.select("blogId", "userId")
      .where((like) => like.blogId.in(ids)).all();
  }

  private findUsers(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as UserRow[]);
    return db.orm.public.User.select("id", "name").where((user) => user.id.in(ids)).all();
  }
}

export const blogService = new DatabaseBlogService();

