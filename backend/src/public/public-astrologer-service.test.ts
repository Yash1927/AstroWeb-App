import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query: {
    all: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
  } = {
    all: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
  };
  const asc = vi.fn(() => "display-name-ascending");
  const select = vi.fn(() => query);
  query.where.mockImplementation(() => query);
  query.orderBy.mockImplementation((order) => {
    order({ displayName: { asc } });
    return query;
  });

  return { asc, query, select };
});

vi.mock("../prisma/db", () => ({
  db: {
    orm: {
      public: {
        Astrologer: { select: mocks.select },
        MediaAsset: { select: vi.fn() },
      },
    },
  },
}));

import { DatabasePublicAstrologerService } from "./public-astrologer-service";

describe("DatabasePublicAstrologerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.where.mockImplementation(() => mocks.query);
    mocks.query.orderBy.mockImplementation((order) => {
      order({ displayName: { asc: mocks.asc } });
      return mocks.query;
    });
  });

  it("selects only card fields and requires every Home eligibility flag", async () => {
    mocks.query.all.mockResolvedValue([
      {
        id: "anika",
        displayName: "Anika Rao",
        expertise: ["Vedic"],
        languages: ["Hindi"],
        experienceYears: 8,
      },
    ]);
    const isNotNull = vi.fn(() => "profile-saved");
    const service = new DatabasePublicAstrologerService();

    const result = await service.listEligibleAstrologers();

    expect(mocks.select).toHaveBeenCalledWith(
      "id",
      "displayName",
      "expertise",
      "languages",
      "experienceYears",
      "profileMediaId",
    );
    expect(mocks.query.where).toHaveBeenNthCalledWith(1, {
      isActive: true,
      isListed: true,
    });

    const savedProfileFilter = mocks.query.where.mock.calls[1]?.[0];
    expect(savedProfileFilter({ profileSavedAt: { isNotNull } })).toBe("profile-saved");
    expect(isNotNull).toHaveBeenCalledOnce();
    expect(mocks.asc).toHaveBeenCalledOnce();
    expect(result).toEqual([
      {
        id: "anika",
        displayName: "Anika Rao",
        expertise: ["Vedic"],
        languages: ["Hindi"],
        experienceYears: 8,
        photoUrl: null,
      },
    ]);
  });
});
