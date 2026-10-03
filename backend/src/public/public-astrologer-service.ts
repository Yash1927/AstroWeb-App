import { db } from "../prisma/db";
import { publicMediaUrl } from "../media/media-service";

export type PublicAstrologerCard = {
  displayName: string;
  expertise: string[];
  experienceYears: number;
  id: string;
  languages: string[];
  photoUrl?: string | null;
};

export interface PublicAstrologerService {
  listEligibleAstrologers(): Promise<PublicAstrologerCard[]>;
}

export class DatabasePublicAstrologerService implements PublicAstrologerService {
  async listEligibleAstrologers() {
    const astrologers = await db.orm.public.Astrologer.select(
      "id",
      "displayName",
      "expertise",
      "languages",
      "experienceYears",
      "profileMediaId",
    )
      .where({ isActive: true, isListed: true })
      .where((astrologer) => astrologer.profileSavedAt.isNotNull())
      .orderBy((astrologer) => astrologer.displayName.asc())
      .all();

    const mediaIds = astrologers.flatMap((item) => item.profileMediaId ? [item.profileMediaId] : []);
    const assets = mediaIds.length
      ? await db.orm.public.MediaAsset.select("id", "storageKey").where((asset) => asset.id.in(mediaIds)).all()
      : [];
    const media = new Map(assets.map((asset) => [asset.id, asset.storageKey]));
    return astrologers.map(({ profileMediaId, ...astrologer }) => ({
      ...astrologer,
      photoUrl: profileMediaId && media.has(profileMediaId) ? publicMediaUrl(media.get(profileMediaId)!) : null,
      expertise: [...astrologer.expertise],
      languages: [...astrologer.languages],
    }));
  }
}

export const publicAstrologerService = new DatabasePublicAstrologerService();
