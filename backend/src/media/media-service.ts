import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { z } from "zod";
import "temporal-polyfill/global";
import { db } from "../prisma/db";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const r2EnvironmentSchema = z.object({
  R2_ACCOUNT_ID: z.string().trim().min(1),
  R2_ACCESS_KEY_ID: z.string().trim().min(1),
  R2_SECRET_ACCESS_KEY: z.string().trim().min(1),
  R2_BUCKET: z.string().trim().min(1),
  R2_PUBLIC_BASE_URL: z.url().refine((value) => value.startsWith("https://")),
});

export type MediaAsset = {
  bytes: number;
  createdAt: string;
  height: number;
  id: string;
  kind: "profile_photo" | "blog_image";
  url: string;
  width: number;
};

type StoredMediaAsset = Omit<MediaAsset, "createdAt" | "url"> & {
  createdAt: { toString(): string };
  ownerAstrologerId: string;
  storageKey: string;
};

export interface ObjectStore {
  delete(storageKey: string): Promise<void>;
  put(storageKey: string, body: Uint8Array, contentType: string): Promise<void>;
}

export interface MediaRepository {
  create(input: Omit<StoredMediaAsset, "createdAt">): Promise<StoredMediaAsset>;
  delete(id: string): Promise<void>;
  find(id: string): Promise<StoredMediaAsset | null>;
  findProfile(astrologerId: string): Promise<StoredMediaAsset | null>;
  listOlderThan(cutoff: Temporal.Instant): Promise<StoredMediaAsset[]>;
  isReferenced(id: string, url: string): Promise<boolean>;
  replaceProfile(astrologerId: string, mediaId: string): Promise<StoredMediaAsset | null>;
  removeProfile(astrologerId: string): Promise<StoredMediaAsset | null>;
}

export class MediaUploadError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export class R2ObjectStore implements ObjectStore {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(environment: NodeJS.ProcessEnv = process.env) {
    const parsed = r2EnvironmentSchema.safeParse(environment);
    if (!parsed.success) throw new MediaUploadError("Media storage is not configured.", 503);
    this.bucket = parsed.data.R2_BUCKET;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${parsed.data.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: parsed.data.R2_ACCESS_KEY_ID,
        secretAccessKey: parsed.data.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async put(storageKey: string, body: Uint8Array, contentType: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
  }

  async delete(storageKey: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

class DatabaseMediaRepository implements MediaRepository {
  async create(input: Omit<StoredMediaAsset, "createdAt">) {
    return await db.orm.public.MediaAsset.select(
      "id", "ownerAstrologerId", "kind", "storageKey", "width", "height", "bytes", "createdAt",
    ).create(input) as StoredMediaAsset;
  }

  async find(id: string) {
    return await db.orm.public.MediaAsset.select(
      "id", "ownerAstrologerId", "kind", "storageKey", "width", "height", "bytes", "createdAt",
    ).first({ id }) as StoredMediaAsset | null;
  }

  async findProfile(astrologerId: string) {
    const owner = await db.orm.public.Astrologer.select("profileMediaId").first({ id: astrologerId });
    return owner?.profileMediaId ? this.find(owner.profileMediaId) : null;
  }

  async replaceProfile(astrologerId: string, mediaId: string) {
    const owner = await db.orm.public.Astrologer.select("id", "profileMediaId").first({ id: astrologerId, isActive: true });
    if (!owner) throw new MediaUploadError("Astrologer not found.", 404);
    const previous = owner.profileMediaId ? await this.find(owner.profileMediaId) : null;
    await db.orm.public.Astrologer.where({ id: astrologerId }).update({ profileMediaId: mediaId });
    return previous;
  }

  async removeProfile(astrologerId: string) {
    const owner = await db.orm.public.Astrologer.select("id", "profileMediaId").first({ id: astrologerId });
    if (!owner) throw new MediaUploadError("Astrologer not found.", 404);
    const previous = owner.profileMediaId ? await this.find(owner.profileMediaId) : null;
    await db.orm.public.Astrologer.where({ id: astrologerId }).update({ profileMediaId: null });
    return previous;
  }

  async delete(id: string) {
    await db.orm.public.MediaAsset.where({ id }).delete();
  }

  async listOlderThan(cutoff: Temporal.Instant) {
    return await db.orm.public.MediaAsset.select(
      "id", "ownerAstrologerId", "kind", "storageKey", "width", "height", "bytes", "createdAt",
    ).where((asset) => asset.createdAt.lt(cutoff)).all() as StoredMediaAsset[];
  }

  async isReferenced(id: string, url: string) {
    const [profile, cover, posts] = await Promise.all([
      db.orm.public.Astrologer.select("id").first({ profileMediaId: id }),
      db.orm.public.Blog.select("id").first({ coverMediaId: id }),
      db.orm.public.Blog.select("body").all(),
    ]);
    return Boolean(profile || cover || posts.some((post) => JSON.stringify(post.body).includes(url)));
  }
}

function publicBaseUrl(environment: NodeJS.ProcessEnv) {
  const result = z.url().safeParse(environment.R2_PUBLIC_BASE_URL);
  if (!result.success || !result.data.startsWith("https://")) {
    throw new MediaUploadError("Media storage is not configured.", 503);
  }
  return result.data.replace(/\/$/u, "");
}

export function publicMediaUrl(storageKey: string, environment: NodeJS.ProcessEnv = process.env) {
  const result = z.url().safeParse(environment.R2_PUBLIC_BASE_URL);
  return result.success && result.data.startsWith("https://")
    ? `${result.data.replace(/\/$/u, "")}/${storageKey}`
    : null;
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly store: ObjectStore,
    private readonly environment: NodeJS.ProcessEnv = process.env,
  ) {}

  url(storageKey: string) {
    return `${publicBaseUrl(this.environment)}/${storageKey}`;
  }

  async uploadProfile(astrologerId: string, input: Buffer) {
    const asset = await this.upload(astrologerId, "profile_photo", input);
    const previous = await this.repository.replaceProfile(astrologerId, asset.id);
    if (previous) await this.removeStored(previous);
    return asset;
  }

  async uploadBlogImage(astrologerId: string, input: Buffer) {
    return this.upload(astrologerId, "blog_image", input);
  }

  async removeOwnProfile(astrologerId: string) {
    const previous = await this.repository.removeProfile(astrologerId);
    if (previous) await this.removeStored(previous);
  }

  async removeProfileAsOwner(astrologerId: string) {
    return this.removeOwnProfile(astrologerId);
  }

  async deleteOwnAsset(astrologerId: string, id: string) {
    const asset = await this.repository.find(id);
    if (!asset || asset.ownerAstrologerId !== astrologerId) {
      throw new MediaUploadError("Image not found.", 404);
    }
    if (await this.repository.isReferenced(asset.id, this.url(asset.storageKey))) {
      throw new MediaUploadError("Remove this image from the post before deleting it.", 409);
    }
    await this.removeStored(asset);
  }

  async deletePostAssets(astrologerId: string, ids: string[]) {
    for (const id of [...new Set(ids)]) {
      const asset = await this.repository.find(id);
      if (asset?.ownerAstrologerId === astrologerId && asset.kind === "blog_image") {
        await this.removeStored(asset);
      }
    }
  }

  async cleanupUnused(now = Temporal.Now.instant()) {
    const cutoff = now.subtract({ hours: 24 });
    const candidates = await this.repository.listOlderThan(cutoff);
    let removed = 0;
    for (const asset of candidates) {
      if (await this.repository.isReferenced(asset.id, this.url(asset.storageKey))) continue;
      await this.removeStored(asset);
      removed += 1;
    }
    return removed;
  }

  private async upload(astrologerId: string, kind: MediaAsset["kind"], input: Buffer) {
    if (input.byteLength > MAX_UPLOAD_BYTES) throw new MediaUploadError("Choose an image smaller than 5 MB.", 413);
    const detected = await fileTypeFromBuffer(input);
    if (!detected || !acceptedTypes.has(detected.mime)) {
      throw new MediaUploadError("Choose a JPG, PNG or WebP image.");
    }

    const pipeline = sharp(input, { failOn: "error" }).rotate();
    const transformed = kind === "profile_photo"
      ? await pipeline.resize(512, 512, { fit: "cover", position: "centre" }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true })
      : await pipeline.resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    const key = kind === "profile_photo"
      ? `astrologers/${astrologerId}/photo-${randomUUID()}.webp`
      : `blogs/${astrologerId}/${randomUUID()}.webp`;
    await this.store.put(key, transformed.data, "image/webp");

    try {
      const row = await this.repository.create({
        id: randomUUID(),
        ownerAstrologerId: astrologerId,
        kind,
        storageKey: key,
        width: transformed.info.width,
        height: transformed.info.height,
        bytes: transformed.data.byteLength,
      });
      return this.toPublic(row);
    } catch (error) {
      await this.store.delete(key).catch(() => undefined);
      throw error;
    }
  }

  private async removeStored(asset: StoredMediaAsset) {
    await this.store.delete(asset.storageKey);
    await this.repository.delete(asset.id);
  }

  private toPublic(asset: StoredMediaAsset): MediaAsset {
    return {
      id: asset.id,
      kind: asset.kind,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      createdAt: asset.createdAt.toString(),
      url: this.url(asset.storageKey),
    };
  }
}

let singleton: MediaService | undefined;
export function getMediaService() {
  singleton ??= new MediaService(new DatabaseMediaRepository(), new R2ObjectStore());
  return singleton;
}
