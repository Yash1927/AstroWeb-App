import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const mediaQuery = {
    where: vi.fn(),
    all: vi.fn(),
  };
  mediaQuery.where.mockReturnValue(mediaQuery);
  return { mediaQuery };
});

vi.mock("../prisma/db", () => ({
  db: {
    orm: {
      public: {
        MediaAsset: { select: vi.fn(() => mocks.mediaQuery) },
      },
    },
  },
}));

import { BlogMediaValidationError, DatabaseBlogService } from "./blog-service";

describe("rich blog media ownership", () => {
  beforeEach(() => {
    mocks.mediaQuery.all.mockReset().mockResolvedValue([]);
  });

  it("rejects a body image URL that is not owned by the signed-in astrologer", async () => {
    const service = new DatabaseBlogService();
    await expect(service.saveAstrologerPost(
      "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0",
      null,
      {
        title: "A guide",
        body: {
          type: "doc",
          content: [{ type: "image", attrs: { src: "https://someone-else.example/image.webp" } }],
        },
        coverMediaId: null,
        status: "draft",
      },
    )).rejects.toThrow(BlogMediaValidationError);
  });
});
