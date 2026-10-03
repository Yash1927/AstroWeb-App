import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { DatabaseAstrologerService } from "../astrologer/astrologer-service";
import { DatabaseAvailabilityService } from "../availability/availability-service";
import { DatabaseBookingRepository } from "../booking/booking-service";
import { DatabaseOwnerService } from "../owner/owner-service";
import { db } from "../prisma/db";
import { DatabaseBlogService } from "./blog-service";

const runOnNeonBranch = process.env["RUN_NEON_BRANCH_TESTS"] === "1"
  && /^pending-fixes-7-8-/u.test(process.env["NEON_BRANCH_NAME"] ?? "");
const astrologerId = randomUUID();
const blogId = randomUUID();
const userIds = [randomUUID(), randomUUID()];
const bookingIds = [randomUUID(), randomUUID()];

async function deleteFixtures() {
  await db.transaction(async (transaction) => {
    const deleteSessions = transaction.sql.public.Session.delete()
      .where((session, functions) => functions.eq(session.subjectId, astrologerId))
      .build();
    const deleteBookings = transaction.sql.public.Booking.delete()
      .where((booking, functions) => functions.in(booking.id, bookingIds))
      .build();
    const deleteRules = transaction.sql.public.AvailabilityRule.delete()
      .where((rule, functions) => functions.eq(rule.astrologerId, astrologerId))
      .build();
    const deleteExceptions = transaction.sql.public.AvailabilityException.delete()
      .where((exception, functions) => functions.eq(exception.astrologerId, astrologerId))
      .build();
    const deleteLikes = transaction.sql.public.BlogLike.delete()
      .where((like, functions) => functions.eq(like.blogId, blogId))
      .build();
    const deleteComments = transaction.sql.public.BlogComment.delete()
      .where((comment, functions) => functions.eq(comment.blogId, blogId))
      .build();
    const deleteBlog = transaction.sql.public.Blog.delete()
      .where((blog, functions) => functions.eq(blog.id, blogId))
      .build();
    const deleteUsers = transaction.sql.public.User.delete()
      .where((user, functions) => functions.in(user.id, userIds))
      .build();
    const deleteAstrologer = transaction.sql.public.Astrologer.delete()
      .where((astrologer, functions) => functions.eq(astrologer.id, astrologerId))
      .build();
    await transaction.execute(deleteSessions);
    await transaction.execute(deleteBookings);
    await transaction.execute(deleteRules);
    await transaction.execute(deleteExceptions);
    await transaction.execute(deleteLikes);
    await transaction.execute(deleteComments);
    await transaction.execute(deleteBlog);
    await transaction.execute(deleteUsers);
    await transaction.execute(deleteAstrologer);
  });
}

describe.runIf(runOnNeonBranch)("DatabaseBlogService on an isolated Neon branch", () => {
  afterAll(deleteFixtures);

  it("deletes a post with two likes and two comments", async () => {
    expect(process.env["NEON_BRANCH_NAME"]).toMatch(/^pending-fixes-7-8-/u);

    await db.orm.public.Astrologer.create({
      id: astrologerId,
      email: `pending-fix-${astrologerId}@example.invalid`,
      passwordHash: "integration-test-only",
      displayName: "Pending fix test",
    });
    for (const [index, userId] of userIds.entries()) {
      await db.orm.public.User.create({
        id: userId,
        googleSub: `pending-fix-${userId}`,
        email: `pending-fix-${userId}@example.invalid`,
        name: `Test user ${index + 1}`,
      });
    }
    await db.orm.public.Blog.create({
      id: blogId,
      astrologerId,
      title: "Pending fix integration test",
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Temporary test post." }] }] },
      excerpt: "Temporary test post.",
      status: "published",
      publishedAt: Temporal.Now.instant(),
    });
    for (const userId of userIds) {
      await db.orm.public.BlogLike.create({ blogId, userId });
      await db.orm.public.BlogComment.create({
        id: randomUUID(),
        blogId,
        userId,
        body: "Temporary test comment.",
      });
    }

    const likesBefore = await db.orm.public.BlogLike.select("blogId").where({ blogId }).all();
    const commentsBefore = await db.orm.public.BlogComment.select("id").where({ blogId }).all();
    expect(likesBefore).toHaveLength(2);
    expect(commentsBefore).toHaveLength(2);

    await new DatabaseBlogService().deleteAstrologerPost(astrologerId, blogId);

    await expect(db.orm.public.Blog.select("id").first({ id: blogId })).resolves.toBeNull();
    await expect(db.orm.public.BlogLike.select("blogId").where({ blogId }).all()).resolves.toEqual([]);
    await expect(db.orm.public.BlogComment.select("id").where({ blogId }).all()).resolves.toEqual([]);
  });

  it("revokes every astrologer session for deactivate and both password-reset paths", async () => {
    const ownerService = new DatabaseOwnerService();
    const astrologerService = new DatabaseAstrologerService();
    const expiresAt = Temporal.Now.instant().add({ hours: 1 });
    const createTwoSessions = async () => {
      await db.orm.public.Session.create({
        id: randomUUID(),
        role: "astrologer",
        subjectId: astrologerId,
        expiresAt,
      });
      await db.orm.public.Session.create({
        id: randomUUID(),
        role: "astrologer",
        subjectId: astrologerId,
        expiresAt,
      });
    };
    const sessions = () => db.orm.public.Session.select("id")
      .where({ role: "astrologer", subjectId: astrologerId }).all();

    await createTwoSessions();
    expect(await sessions()).toHaveLength(2);
    await ownerService.setAstrologerActive(astrologerId, false);
    expect(await sessions()).toHaveLength(0);

    await ownerService.setAstrologerActive(astrologerId, true);
    await createTwoSessions();
    expect(await sessions()).toHaveLength(2);
    await ownerService.resetAstrologerPassword(astrologerId, "Temporary password 123!");
    expect(await sessions()).toHaveLength(0);

    await createTwoSessions();
    expect(await sessions()).toHaveLength(2);
    await astrologerService.replaceTemporaryPassword(astrologerId, "Replacement password 123!");
    expect(await sessions()).toHaveLength(0);
  });

  it("replaces multiple availability rows in each table", async () => {
    await db.orm.public.AvailabilityRule.create({
      id: randomUUID(),
      astrologerId,
      weekday: 1,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("10:00"),
    });
    await db.orm.public.AvailabilityRule.create({
      id: randomUUID(),
      astrologerId,
      weekday: 2,
      startTime: Temporal.PlainTime.from("09:00"),
      endTime: Temporal.PlainTime.from("10:00"),
    });
    await db.orm.public.AvailabilityException.create({
      id: randomUUID(),
      astrologerId,
      date: Temporal.PlainDate.from("2030-01-01"),
      kind: "blocked",
      startTime: null,
      endTime: null,
    });
    await db.orm.public.AvailabilityException.create({
      id: randomUUID(),
      astrologerId,
      date: Temporal.PlainDate.from("2030-01-02"),
      kind: "blocked",
      startTime: null,
      endTime: null,
    });

    await new DatabaseAvailabilityService().saveAvailability(astrologerId, {
      weekly: [{ weekday: 3, startTime: "11:00", endTime: "12:00" }],
      exceptions: [{
        date: "2030-01-03",
        kind: "blocked",
        startTime: null,
        endTime: null,
      }],
    });

    const rules = await db.orm.public.AvailabilityRule.select("weekday").where({ astrologerId }).all();
    const exceptions = await db.orm.public.AvailabilityException.select("date")
      .where({ astrologerId }).all();
    expect(rules).toEqual([{ weekday: 3 }]);
    expect(exceptions.map((row) => row.date.toString())).toEqual(["2030-01-03"]);
  });

  it("expires every elapsed payment hold in one bulk update", async () => {
    const holdExpiresAt = Temporal.Instant.from("2026-01-01T00:00:00Z");
    for (const [index, bookingId] of bookingIds.entries()) {
      const startsAt = Temporal.Instant.from(`2026-01-02T0${index}:00:00Z`);
      await db.orm.public.Booking.create({
        id: bookingId,
        userId: userIds[0]!,
        astrologerId,
        callType: "urgent",
        callMode: "phone",
        startsAt,
        endsAt: startsAt.add({ minutes: 15 }),
        status: "pending_payment",
        holdExpiresAt,
        pricePaise: 30_000,
        usedCredit: false,
      });
    }

    await new DatabaseBookingRepository().transaction(async (transaction) => {
      await transaction.expireElapsedHolds(
        astrologerId,
        Temporal.Instant.from("2026-01-01T00:01:00Z"),
      );
    });

    const bookings = await db.orm.public.Booking.select("id", "status")
      .where((booking) => booking.id.in(bookingIds)).all();
    expect(bookings).toHaveLength(2);
    expect(bookings.every((booking) => booking.status === "expired")).toBe(true);
  });
});
