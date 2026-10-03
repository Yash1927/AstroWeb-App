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

  it("rejects unsafe links, unsupported nodes, more than 20 images and bodies over 200 KB", () => {
    expect(blogDocumentSchema.safeParse({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] }).success).toBe(false);
    expect(blogDocumentSchema.safeParse({ type: "doc", content: [{ type: "video" }] }).success).toBe(false);
    expect(blogDocumentSchema.safeParse({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "No strike", marks: [{ type: "strike" }] }] }] }).success).toBe(false);
    expect(blogDocumentSchema.safeParse({ type: "doc", content: Array.from({ length: 21 }, (_, index) => ({ type: "image", attrs: { src: `https://media.example/${index}.webp` } })) }).success).toBe(false);
    expect(blogDocumentSchema.safeParse({ type: "doc", content: [paragraph("x".repeat(205 * 1024))] }).success).toBe(false);
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
