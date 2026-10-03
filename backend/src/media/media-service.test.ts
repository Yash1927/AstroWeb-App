import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { MediaService, MediaUploadError, type MediaRepository, type ObjectStore } from "./media-service";

const environment = { R2_PUBLIC_BASE_URL: "https://media.example.test" } as NodeJS.ProcessEnv;

function repository(): MediaRepository {
  const rows = new Map<string, any>();
  let profileId: string | null = null;
  return {
    create: vi.fn(async (input) => {
      const row = { ...input, createdAt: { toString: () => "2026-10-03T00:00:00Z" } };
      rows.set(row.id, row);
      return row;
    }),
    delete: vi.fn(async (id) => { rows.delete(id); }),
    find: vi.fn(async (id) => rows.get(id) ?? null),
    findProfile: vi.fn(async () => profileId ? rows.get(profileId) ?? null : null),
    listOlderThan: vi.fn(async () => []),
    isReferenced: vi.fn(async () => false),
    replaceProfile: vi.fn(async (_astrologerId, id) => {
      const previous = profileId ? rows.get(profileId) ?? null : null;
      profileId = id;
      return previous;
    }),
    removeProfile: vi.fn(async () => {
      const previous = profileId ? rows.get(profileId) ?? null : null;
      profileId = null;
      return previous;
    }),
  };
}

function store(): ObjectStore & { delete: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> } {
  return { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
}

describe("MediaService", () => {
  it("detects bytes, re-encodes a square profile WebP, and uploads through mocked R2", async () => {
    const source = await sharp({ create: { width: 900, height: 600, channels: 3, background: "gold" } }).png().toBuffer();
    const mockedR2 = store();
    const service = new MediaService(repository(), mockedR2, environment);

    const result = await service.uploadProfile("astrologer-1", source);

    expect(result).toMatchObject({ kind: "profile_photo", width: 512, height: 512 });
    expect(result.url).toMatch(/^https:\/\/media\.example\.test\/astrologers\/astrologer-1\/photo-.+\.webp$/u);
    expect(mockedR2.put).toHaveBeenCalledOnce();
    const [, uploaded, contentType] = mockedR2.put.mock.calls[0];
    expect(contentType).toBe("image/webp");
    expect((await sharp(uploaded).metadata()).format).toBe("webp");
  });

  it("rejects a renamed non-image from its bytes", async () => {
    const service = new MediaService(repository(), store(), environment);
    await expect(service.uploadBlogImage("astrologer-1", Buffer.from("not really a jpeg")))
      .rejects.toEqual(expect.objectContaining<Partial<MediaUploadError>>({ status: 400 }));
  });

  it("rejects uploads larger than 5 MB before calling mocked R2", async () => {
    const mockedR2 = store();
    const service = new MediaService(repository(), mockedR2, environment);
    await expect(service.uploadBlogImage("astrologer-1", Buffer.alloc(5 * 1024 * 1024 + 1)))
      .rejects.toEqual(expect.objectContaining<Partial<MediaUploadError>>({ status: 413 }));
    expect(mockedR2.put).not.toHaveBeenCalled();
  });

  it("removes the previous R2 object and row when a profile photo is replaced", async () => {
    const source = await sharp({ create: { width: 32, height: 32, channels: 3, background: "gold" } }).png().toBuffer();
    const mockedR2 = store();
    const repo = repository();
    const service = new MediaService(repo, mockedR2, environment);
    await service.uploadProfile("astrologer-1", source);
    await service.uploadProfile("astrologer-1", source);
    expect(mockedR2.delete).toHaveBeenCalledOnce();
    expect(repo.delete).toHaveBeenCalledOnce();
  });
});
