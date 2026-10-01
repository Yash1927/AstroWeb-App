import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const first = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const query = { first, create };
  const select = vi.fn(() => query);
  const where = vi.fn(() => ({ update }));
  return { create, first, query, select, update, where };
});

vi.mock("../prisma/db", () => ({
  db: {
    orm: {
      public: {
        User: { select: mocks.select, where: mocks.where },
      },
    },
  },
}));

import { DatabaseUserService } from "./user-service";

describe("DatabaseUserService Google identity matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds an existing user by googleSub, refreshes email and preserves details", async () => {
    mocks.first.mockResolvedValue({ id: "user-id", email: "old@example.com" });
    const service = new DatabaseUserService();

    const result = await service.findOrCreateGoogleUser({
      sub: "google-subject",
      email: "new@example.com",
      name: "New Google Name",
    });

    expect(mocks.first).toHaveBeenCalledWith({ googleSub: "google-subject" });
    expect(mocks.where).toHaveBeenCalledWith({ id: "user-id" });
    expect(mocks.update).toHaveBeenCalledWith({ email: "new@example.com" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "user-id" });
  });

  it("creates a first-time user with the Google subject, email and name", async () => {
    mocks.first.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "new-user-id" });
    const service = new DatabaseUserService();

    const result = await service.findOrCreateGoogleUser({
      sub: "new-google-subject",
      email: "maya@example.com",
      name: " Maya Shah ",
    });

    expect(mocks.create).toHaveBeenCalledWith({
      id: expect.any(String),
      googleSub: "new-google-subject",
      email: "maya@example.com",
      name: "Maya Shah",
    });
    expect(result).toEqual({ id: "new-user-id" });
  });
});
