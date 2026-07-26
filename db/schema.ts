import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const groups = sqliteTable(
  "quorum_groups",
  {
    id: text("id").primaryKey(),
    inviteCode: text("invite_code").notNull(),
    name: text("name").notNull(),
    vibeIndex: integer("vibe_index"),
    phase: text("phase").notNull().default("collecting"),
    creatorMemberId: text("creator_member_id"),
    currentRoundId: text("current_round_id"),
    selectedOptionId: text("selected_option_id"),
    confirmationNumber: text("confirmation_number"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("quorum_groups_invite_code_idx").on(table.inviteCode),
  ],
);

export const members = sqliteTable(
  "quorum_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    sessionId: text("session_id").notNull(),
    characterId: text("character_id").notNull(),
    nickname: text("nickname").notNull(),
    isCreator: integer("is_creator", { mode: "boolean" })
      .notNull()
      .default(false),
    joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("quorum_members_session_group_idx").on(
      table.sessionId,
      table.groupId,
    ),
    uniqueIndex("quorum_members_character_group_idx").on(
      table.groupId,
      table.characterId,
    ),
    uniqueIndex("quorum_members_nickname_group_idx").on(
      table.groupId,
      table.nickname,
    ),
    index("quorum_members_group_idx").on(table.groupId),
  ],
);

export const options = sqliteTable(
  "quorum_options",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    contributorMemberId: text("contributor_member_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    provider: text("provider").notNull(),
    sourceType: text("source_type").notNull(),
    title: text("title").notNull(),
    imageUrl: text("image_url"),
    description: text("description"),
    officialEmbedHtml: text("official_embed_html"),
    sourceGuestCount: integer("source_guest_count"),
    category: text("category").notNull(),
    dates: text("dates").notNull(),
    allInTotalCents: integer("all_in_total_cents").notNull(),
    participantCount: integer("participant_count").notNull(),
    basePriceCents: integer("base_price_cents"),
    feesCents: integer("fees_cents"),
    taxesCents: integer("taxes_cents"),
    checkedAt: text("checked_at").notNull(),
    version: integer("version").notNull().default(1),
    archived: integer("archived", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("quorum_options_group_idx").on(table.groupId, table.archived),
  ],
);

export const reviewRounds = sqliteTable(
  "quorum_review_rounds",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
  },
  (table) => [index("quorum_rounds_group_idx").on(table.groupId)],
);

export const comfortResponses = sqliteTable(
  "quorum_comfort_responses",
  {
    roundId: text("round_id").notNull(),
    groupId: text("group_id").notNull(),
    optionId: text("option_id").notNull(),
    memberId: text("member_id").notNull(),
    value: text("value").notNull(),
    optionVersion: integer("option_version").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      columns: [table.roundId, table.optionId, table.memberId],
    }),
    index("quorum_comfort_round_idx").on(table.roundId, table.memberId),
  ],
);

export const favoriteVotes = sqliteTable(
  "quorum_favorite_votes",
  {
    roundId: text("round_id").notNull(),
    groupId: text("group_id").notNull(),
    memberId: text("member_id").notNull(),
    optionId: text("option_id").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.roundId, table.memberId] }),
    index("quorum_favorites_round_idx").on(table.roundId),
  ],
);

export const paymentAuthorizations = sqliteTable(
  "quorum_payment_authorizations",
  {
    groupId: text("group_id").notNull(),
    memberId: text("member_id").notNull(),
    optionId: text("option_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull().default("pending"),
    approvedAt: text("approved_at"),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.memberId] }),
    index("quorum_payments_group_idx").on(table.groupId, table.status),
  ],
);
