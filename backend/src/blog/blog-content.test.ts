import { describe, expect, it } from "vitest";
import { blogDocumentSchema, documentText, imageUrls, normalizeDocument, plainTextDocument } from "./blog-content";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("rich blog content", () => {
  it("allows the documented nodes and normalizes safe link attributes", () => {
    const document = {
      type: "doc" as const,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Read", marks: [{ type: "link" as const, attrs: { href: "https://example.com" } }] }] }],
    };
    expect(blogDocumentSchema.safeParse(document).success).toBe(true);
    expect(normalizeDocument(document).content?.[0].content?.[0].marks?.[0].attrs).toEqual({
      href: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer nofollow ugc",
    });
  });

  it("rejects javascript links", () => {
    const result = blogDocumentSchema.safeParse({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain("Links must use HTTP or HTTPS.");
  });

  it("rejects unknown node types", () => {
    const result = blogDocumentSchema.safeParse({ type: "doc", content: [{ type: "video" }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain("The post contains an unsupported block.");
  });

  it("rejects extra image attributes", () => {
    const result = blogDocumentSchema.safeParse({
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://media.example/image.webp", alt: "A chart", title: null, onerror: "alert(1)" } }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain("The post contains unsupported image details.");
  });

  it("allows 20 images and rejects the twenty-first", () => {
    const images = (count: number) => ({
      type: "doc",
      content: Array.from({ length: count }, (_, index) => ({ type: "image", attrs: { src: `https://media.example/${index}.webp` } })),
    });
    expect(blogDocumentSchema.safeParse(images(20)).success).toBe(true);
    const result = blogDocumentSchema.safeParse(images(21));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain("A post can contain up to 20 images.");
  });

  it("allows exactly 200 KB and rejects one byte more", () => {
    const emptyDocument = { type: "doc", content: [paragraph("")] };
    const overhead = Buffer.byteLength(JSON.stringify(emptyDocument), "utf8");
    const document = (bytes: number) => ({ type: "doc", content: [paragraph("x".repeat(bytes - overhead))] });
    expect(Buffer.byteLength(JSON.stringify(document(200 * 1024)), "utf8")).toBe(200 * 1024);
    expect(blogDocumentSchema.safeParse(document(200 * 1024)).success).toBe(true);
    const result = blogDocumentSchema.safeParse(document(200 * 1024 + 1));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain("The post is larger than 200 KB.");
  });

  it("rejects unsupported formatting", () => {
    expect(blogDocumentSchema.safeParse({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "No strike", marks: [{ type: "strike" }] }] }] }).success).toBe(false);
  });

  it("extracts text and image URLs for excerpts, reading time and ownership checks", () => {
    const document = { type: "doc" as const, content: [paragraph("A calm guide"), { type: "image", attrs: { src: "https://media.example/one.webp" } }] };
    expect(documentText(document)).toBe("A calm guide");
    expect(imageUrls(document)).toEqual(["https://media.example/one.webp"]);
  });

  it("separates adjacent heading and paragraph blocks in excerpts", () => {
    const document = {
      type: "doc" as const,
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Breathing together" }] },
        paragraph("When the stars feel unsettled, pause."),
      ],
    };
    expect(documentText(document)).toBe("Breathing together. When the stars feel unsettled, pause.");
  });

  it("round-trips valid content without changing its structure", () => {
    const document = {
      type: "doc" as const,
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A heading", marks: [{ type: "bold" as const }] }] },
        paragraph("A paragraph."),
      ],
    };
    expect(normalizeDocument(document)).toEqual(document);
  });

  it("converts legacy plain text into paragraph nodes", () => {
    expect(plainTextDocument("First paragraph.\r\n\r\n Second paragraph. ")).toEqual({
      type: "doc",
      content: [paragraph("First paragraph."), paragraph("Second paragraph.")],
    });
  });
});
