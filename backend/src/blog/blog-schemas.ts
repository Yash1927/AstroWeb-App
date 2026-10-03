import { z } from "zod";
import { blogDocumentSchema, documentText, imageUrls } from "./blog-content";

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const blogIdParamsSchema = z.object({
  id: z.uuid(),
}).strict();

export const blogCommentParamsSchema = z.object({
  id: z.uuid(),
  commentId: z.uuid(),
}).strict();

export const ownerCommentParamsSchema = z.object({
  commentId: z.uuid(),
}).strict();

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
}).strict();

export const blogWriteSchema = z.object({
  title: trimmedText(120),
  body: blogDocumentSchema,
  coverMediaId: z.uuid().nullable(),
  status: z.enum(["draft", "published"]),
}).strict().superRefine((value, context) => {
  const hasText = documentText(value.body).length > 0;
  const hasImage = imageUrls(value.body).length > 0;
  if (!hasText && !hasImage) context.addIssue({ code: "custom", path: ["body"], message: "Add some content to the post." });
});

export const blogCommentSchema = z.object({
  body: trimmedText(500),
}).strict();
