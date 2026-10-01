import { db } from "../prisma/db";

export type PublicAstrologerCard = {
  displayName: string;
  expertise: string[];
  experienceYears: number;
  id: string;
  languages: string[];
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
    )
      .where({ isActive: true, isListed: true })
      .where((astrologer) => astrologer.profileSavedAt.isNotNull())
      .orderBy((astrologer) => astrologer.displayName.asc())
      .all();

    return astrologers.map((astrologer) => ({
      ...astrologer,
      expertise: [...astrologer.expertise],
      languages: [...astrologer.languages],
    }));
  }
}

export const publicAstrologerService = new DatabasePublicAstrologerService();
