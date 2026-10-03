import { z } from "zod";

export type BlogMark = { attrs?: Record<string, unknown>; type: "bold" | "italic" | "underline" | "link" };
export type BlogNode = {
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
  marks?: BlogMark[];
  text?: string;
  type: string;
};
export type BlogDocument = { content?: BlogNode[]; type: "doc" };

const nodeTypes = new Set(["doc", "paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem", "image", "hardBreak", "text"]);
const markTypes = new Set(["bold", "italic", "underline", "link"]);

function validUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function inspectNode(node: unknown, issues: string[], depth = 0, parentType?: string): number {
  if (!node || typeof node !== "object" || Array.isArray(node) || depth > 30) {
    issues.push("The post contains invalid content.");
    return 0;
  }
  const value = node as BlogNode;
  if (!nodeTypes.has(value.type)) issues.push("The post contains an unsupported block.");
  const allowedChildren: Record<string, Set<string>> = {
    doc: new Set(["paragraph", "heading", "blockquote", "bulletList", "orderedList", "image", "hardBreak"]),
    paragraph: new Set(["text", "hardBreak"]),
    heading: new Set(["text", "hardBreak"]),
    blockquote: new Set(["paragraph"]),
    bulletList: new Set(["listItem"]),
    orderedList: new Set(["listItem"]),
    listItem: new Set(["paragraph", "bulletList", "orderedList"]),
  };
  if (parentType && !allowedChildren[parentType]?.has(value.type)) issues.push("The post contains an invalid block order.");
  if (value.type === "heading" && ![2, 3].includes(Number(value.attrs?.level))) issues.push("Only level 2 and 3 headings are allowed.");
  if (value.type === "image") {
    if (!validUrl(value.attrs?.src)) issues.push("Every image must have a valid HTTPS URL.");
    const imageAttributes = value.attrs && !Array.isArray(value.attrs) ? Object.keys(value.attrs) : [];
    if (imageAttributes.some((attribute) => !["src", "alt", "title"].includes(attribute))) {
      issues.push("The post contains unsupported image details.");
    }
    if (value.attrs?.alt !== undefined && value.attrs.alt !== null && typeof value.attrs.alt !== "string") {
      issues.push("The post contains invalid image details.");
    }
    if (value.attrs?.title !== undefined && value.attrs.title !== null && typeof value.attrs.title !== "string") {
      issues.push("The post contains invalid image details.");
    }
  }
  if (value.type === "text" && typeof value.text !== "string") issues.push("The post contains invalid text.");
  for (const mark of value.marks ?? []) {
    if (!mark || !markTypes.has(mark.type)) issues.push("The post contains unsupported formatting.");
    if (mark.type === "link" && !validUrl(mark.attrs?.href)) issues.push("Links must use HTTP or HTTPS.");
  }
  let imageCount = value.type === "image" ? 1 : 0;
  if (value.content !== undefined && !Array.isArray(value.content)) issues.push("The post contains invalid content.");
  if (["image", "hardBreak", "text"].includes(value.type) && value.content?.length) issues.push("The post contains invalid nested content.");
  if (value.type !== "text" && value.marks?.length) issues.push("Formatting can only be applied to text.");
  for (const child of value.content ?? []) imageCount += inspectNode(child, issues, depth + 1, value.type);
  return imageCount;
}

export const blogDocumentSchema = z.custom<BlogDocument>((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const document = value as BlogDocument;
  return document.type === "doc" && (document.content === undefined || Array.isArray(document.content));
}).superRefine((document, context) => {
  const serialized = JSON.stringify(document);
  if (Buffer.byteLength(serialized, "utf8") > 200 * 1024) {
    context.addIssue({ code: "custom", message: "The post is larger than 200 KB." });
  }
  const issues: string[] = [];
  const count = inspectNode(document, issues);
  if (count > 20) issues.push("A post can contain up to 20 images.");
  for (const message of [...new Set(issues)]) context.addIssue({ code: "custom", message });
});

export function documentText(document: BlogDocument) {
  const blocks: string[] = [];
  const textWithin = (node: BlogNode): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return " ";
    return (node.content ?? []).map(textWithin).join("");
  };
  const visit = (node: BlogNode) => {
    if (["paragraph", "heading"].includes(node.type)) {
      const text = textWithin(node).replace(/\s+/gu, " ").trim();
      if (text) blocks.push(text);
      return;
    }
    node.content?.forEach(visit);
  };
  visit(document);
  return blocks.reduce((result, block) => {
    if (!result) return block;
    return `${result}${/[.!?…:;]$/u.test(result) ? "" : "."} ${block}`;
  }, "");
}

export function imageUrls(document: BlogDocument) {
  const urls: string[] = [];
  const visit = (node: BlogNode) => {
    if (node.type === "image" && typeof node.attrs?.src === "string") urls.push(node.attrs.src);
    node.content?.forEach(visit);
  };
  visit(document);
  return urls;
}

export function normalizeDocument(document: BlogDocument): BlogDocument {
  const visit = (node: BlogNode): BlogNode => ({
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.attrs ? { attrs: node.type === "link" ? node.attrs : { ...node.attrs } } : {}),
    ...(node.marks?.length ? { marks: node.marks.map((mark) => mark.type === "link" ? {
      type: "link",
      attrs: { href: mark.attrs?.href, target: "_blank", rel: "noopener noreferrer nofollow ugc" },
    } : { type: mark.type }) } : {}),
    ...(node.content ? { content: node.content.map(visit) } : {}),
  });
  return visit(document) as BlogDocument;
}

export function plainTextDocument(body: string): BlogDocument {
  const paragraphs = body
    .split(/\r?\n\s*\r?\n/u)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }));
  return { type: "doc", content: paragraphs.length ? paragraphs : [{ type: "paragraph" }] };
}
