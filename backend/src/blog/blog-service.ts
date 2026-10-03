import { createHash, randomUUID } from "node:crypto";
import "temporal-polyfill/global";
import { db } from "../prisma/db";
import type { z } from "zod";
import type { blogWriteSchema } from "./blog-schemas";
import { documentText, imageUrls, normalizeDocument, type BlogDocument } from "./blog-content";
import { getMediaService, publicMediaUrl } from "../media/media-service";

export type BlogWriteInput = z.infer<typeof blogWriteSchema>;

type BlogRow = {
  astrologerId: string;
  body: BlogDocument;
  coverMediaId: string | null;
  createdAt: Temporal.Instant;
  excerpt: string;
  id: string;
  publishedAt: Temporal.Instant | null;
  status: "draft" | "published";
  title: string;
  readingMinutes: number;
  updatedAt: Temporal.Instant;
};

type AstrologerRow = { displayName: string; id: string; photoUrl: string | null };
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
  coverUrl: string | null;
  id: string;
  likeCount: number;
  publishedAt: string;
  title: string;
  readingMinutes: number;
};

export type PublicBlogComment = {
  author: { avatarId: string; firstName: string };
  body: string;
  canDelete: boolean;
  createdAt: string;
  id: string;
};

export type PublicBlogPost = BlogSummary & {
  body: BlogDocument;
  comments: PublicBlogComment[];
  likedByViewer: boolean;
};

export type AstrologerBlogPost = {
  body: BlogDocument;
  coverMediaId: string | null;
  coverUrl: string | null;
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
  readingMinutes: number;
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
export class BlogMediaValidationError extends Error {}

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
  "excerpt",
  "readingMinutes",
  "coverMediaId",
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

function derivedFields(body: BlogDocument) {
  const text = documentText(body);
  return { excerpt: text.slice(0, 200), readingMinutes: Math.max(1, Math.ceil(text.split(/\s+/u).filter(Boolean).length / 200)) };
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
    const [authors, likes, comments, covers] = await Promise.all([
      this.findAstrologers(unique(pageRows.map((post) => post.astrologerId))),
      this.findLikes(pageRows.map((post) => post.id)),
      this.findComments(pageRows.map((post) => post.id)),
      this.findMedia(pageRows.flatMap((post) => post.coverMediaId ? [post.coverMediaId] : [])),
    ]);
    const authorMap = new Map(authors.map((author) => [author.id, author]));
    const likeCounts = countByBlog(likes);
    const commentCounts = countByBlog(comments);
    const coverMap = new Map(covers.map((asset) => [asset.id, publicMediaUrl(asset.storageKey)]));

    return {
      posts: pageRows.flatMap((post) => {
        const author = authorMap.get(post.astrologerId);
        return author && post.publishedAt ? [{
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          readingMinutes: post.readingMinutes,
          coverUrl: post.coverMediaId ? coverMap.get(post.coverMediaId) ?? null : imageUrls(post.body)[0] ?? null,
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

    const [authors, likes, comments, covers] = await Promise.all([
      this.findAstrologers([post.astrologerId]),
      this.findLikes([post.id]),
      this.findComments([post.id]),
      this.findMedia(post.coverMediaId ? [post.coverMediaId] : []),
    ]);
    const author = authors[0];
    if (!author) throw new BlogNotFoundError("Post not found.");
    const users = await this.findUsers(unique(comments.map((comment) => comment.userId)));
    const userMap = new Map(users.map((user) => [user.id, user]));

    return {
      id: post.id,
      title: post.title,
      body: post.body,
      excerpt: post.excerpt,
      readingMinutes: post.readingMinutes,
      coverUrl: covers[0] ? publicMediaUrl(covers[0].storageKey) : imageUrls(post.body)[0] ?? null,
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
    const [likes, comments, covers] = await Promise.all([
      this.findLikes(rows.map((post) => post.id)),
      this.findComments(rows.map((post) => post.id)),
      this.findMedia(rows.flatMap((post) => post.coverMediaId ? [post.coverMediaId] : [])),
    ]);
    const coverMap = new Map(covers.map((asset) => [asset.id, publicMediaUrl(asset.storageKey)]));
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
      post.coverMediaId ? coverMap.get(post.coverMediaId) ?? null : imageUrls(post.body)[0] ?? null,
    ));
  }

  async saveAstrologerPost(astrologerId: string, blogId: string | null, input: BlogWriteInput) {
    const now = Temporal.Now.instant();
    const body = normalizeDocument(input.body);
    const derived = derivedFields(body);
    await this.validateMedia(astrologerId, body, input.coverMediaId);
    let id = blogId;
    if (blogId) {
      const current = await db.orm.public.Blog.select("id", "status", "publishedAt").first({
        id: blogId,
        astrologerId,
      });
      if (!current) throw new BlogNotFoundError("Post not found.");
      await db.orm.public.Blog.where({ id: blogId, astrologerId }).update({
        title: input.title,
        body: body as any,
        excerpt: derived.excerpt,
        readingMinutes: derived.readingMinutes,
        coverMediaId: input.coverMediaId,
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
        body: body as any,
        excerpt: derived.excerpt,
        readingMinutes: derived.readingMinutes,
        coverMediaId: input.coverMediaId,
        status: input.status,
        publishedAt: input.status === "published" ? now : null,
      });
    }
    const saved = await db.orm.public.Blog.select(...blogFields).first({ id, astrologerId }) as BlogRow | null;
    if (!saved) throw new BlogNotFoundError("Post not found.");
    const [likes, comments, cover] = await Promise.all([
      this.findLikes([saved.id]),
      this.findComments([saved.id]),
      this.findMedia(saved.coverMediaId ? [saved.coverMediaId] : []),
    ]);
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
    }), cover[0] ? publicMediaUrl(cover[0].storageKey) : imageUrls(saved.body)[0] ?? null);
  }

  async deleteAstrologerPost(astrologerId: string, blogId: string) {
    const post = await db.orm.public.Blog.select("id", "body", "coverMediaId").first({ id: blogId, astrologerId });
    if (!post) throw new BlogNotFoundError("Post not found.");
    await db.transaction(async (transaction) => {
      const deleteLikes = transaction.sql.public.BlogLike.delete()
        .where((like, functions) => functions.eq(like.blogId, blogId))
        .build();
      const deleteComments = transaction.sql.public.BlogComment.delete()
        .where((comment, functions) => functions.eq(comment.blogId, blogId))
        .build();
      await transaction.execute(deleteLikes);
      await transaction.execute(deleteComments);
      await transaction.orm.public.Blog.where({ id: blogId, astrologerId }).delete();
    });
    const assets = await this.findMediaByUrls(astrologerId, imageUrls(post.body as BlogDocument));
    const ids = [...new Set([...assets.map((asset) => asset.id), ...(post.coverMediaId ? [post.coverMediaId] : [])])];
    if (ids.length) await getMediaService().deletePostAssets(astrologerId, ids);
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
    coverUrl: string | null = null,
  ): AstrologerBlogPost {
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      coverMediaId: post.coverMediaId,
      coverUrl,
      status: post.status,
      publishedAt: post.publishedAt?.toString() ?? null,
      createdAt: post.createdAt.toString(),
      updatedAt: post.updatedAt.toString(),
      likeCount,
      readingMinutes: post.readingMinutes,
      commentCount: comments.length,
      comments: comments.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    };
  }

  private async requirePublished(blogId: string) {
    const post = await db.orm.public.Blog.select("id").first({ id: blogId, status: "published" });
    if (!post) throw new BlogNotFoundError("Post not found.");
  }

  private async findAstrologers(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as AstrologerRow[]);
    const astrologers = await db.orm.public.Astrologer.select("id", "displayName", "profileMediaId")
      .where((astrologer) => astrologer.id.in(ids)).all();
    const media = await this.findMedia(astrologers.flatMap((item) => item.profileMediaId ? [item.profileMediaId] : []));
    const mediaMap = new Map(media.map((asset) => [asset.id, publicMediaUrl(asset.storageKey)]));
    return astrologers.map(({ profileMediaId, ...item }) => ({ ...item, photoUrl: profileMediaId ? mediaMap.get(profileMediaId) ?? null : null }));
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

  private findMedia(ids: string[]) {
    if (!ids.length) return Promise.resolve([] as Array<{ id: string; kind: "profile_photo" | "blog_image"; ownerAstrologerId: string; storageKey: string }>);
    return db.orm.public.MediaAsset.select("id", "ownerAstrologerId", "kind", "storageKey")
      .where((asset) => asset.id.in([...new Set(ids)])).all();
  }

  private async findMediaByUrls(astrologerId: string, urls: string[]) {
    if (!urls.length) return [];
    const assets = await db.orm.public.MediaAsset.select("id", "ownerAstrologerId", "storageKey")
      .where({ ownerAstrologerId: astrologerId, kind: "blog_image" }).all();
    const wanted = new Set(urls);
    return assets.filter((asset) => wanted.has(publicMediaUrl(asset.storageKey) ?? ""));
  }

  private async validateMedia(astrologerId: string, body: BlogDocument, coverMediaId: string | null) {
    const urls = imageUrls(body);
    const owned = await this.findMediaByUrls(astrologerId, urls);
    if (owned.length !== new Set(urls).size) throw new BlogMediaValidationError("Every image must belong to this astrologer.");
    if (coverMediaId) {
      const cover = (await this.findMedia([coverMediaId]))[0];
      if (!cover || cover.ownerAstrologerId !== astrologerId || cover.kind !== "blog_image") throw new BlogMediaValidationError("Cover image not found.");
    }
  }
}

export const blogService = new DatabaseBlogService();
