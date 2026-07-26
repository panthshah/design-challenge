import { getD1 } from "@/db";

export type GroupPhase =
  | "collecting"
  | "affordability"
  | "favorite"
  | "authorizing"
  | "booked"
  | "needs_options";

type GroupRow = {
  id: string;
  invite_code: string;
  name: string;
  vibe_index: number | null;
  phase: GroupPhase;
  creator_member_id: string | null;
  current_round_id: string | null;
  selected_option_id: string | null;
  confirmation_number: string | null;
};

type MemberRow = {
  id: string;
  group_id: string;
  session_id: string;
  character_id: string;
  nickname: string;
  is_creator: number;
  joined_at: string;
};

type OptionRow = {
  id: string;
  group_id: string;
  contributor_member_id: string;
  source_url: string;
  provider: string;
  source_type: string;
  title: string;
  image_url: string | null;
  description: string | null;
  official_embed_html: string | null;
  source_guest_count: number | null;
  category: string;
  dates: string;
  all_in_total_cents: number;
  participant_count: number;
  base_price_cents: number | null;
  fees_cents: number | null;
  taxes_cents: number | null;
  checked_at: string;
  version: number;
  archived: number;
  created_at: string;
};

type ComfortRow = {
  option_id: string;
  member_id: string;
  value: "works" | "too-much";
  option_version: number;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS quorum_groups (
    id TEXT PRIMARY KEY,
    invite_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    vibe_index INTEGER,
    phase TEXT NOT NULL DEFAULT 'collecting',
    creator_member_id TEXT,
    current_round_id TEXT,
    selected_option_id TEXT,
    confirmation_number TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS quorum_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    is_creator INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, group_id),
    UNIQUE(group_id, character_id),
    UNIQUE(group_id, nickname)
  )`,
  `CREATE TABLE IF NOT EXISTS quorum_options (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    contributor_member_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    provider TEXT NOT NULL,
    source_type TEXT NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    official_embed_html TEXT,
    source_guest_count INTEGER,
    category TEXT NOT NULL,
    dates TEXT NOT NULL,
    all_in_total_cents INTEGER NOT NULL,
    participant_count INTEGER NOT NULL,
    base_price_cents INTEGER,
    fees_cents INTEGER,
    taxes_cents INTEGER,
    checked_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS quorum_review_rounds (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS quorum_comfort_responses (
    round_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    value TEXT NOT NULL,
    option_version INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(round_id, option_id, member_id)
  )`,
  `CREATE TABLE IF NOT EXISTS quorum_favorite_votes (
    round_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(round_id, member_id)
  )`,
  `CREATE TABLE IF NOT EXISTS quorum_payment_authorizations (
    group_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_at TEXT,
    PRIMARY KEY(group_id, member_id)
  )`,
  "CREATE INDEX IF NOT EXISTS quorum_members_group_idx ON quorum_members(group_id)",
  "CREATE INDEX IF NOT EXISTS quorum_options_group_idx ON quorum_options(group_id, archived)",
  "CREATE INDEX IF NOT EXISTS quorum_rounds_group_idx ON quorum_review_rounds(group_id)",
  "CREATE INDEX IF NOT EXISTS quorum_comfort_round_idx ON quorum_comfort_responses(round_id, member_id)",
  "CREATE INDEX IF NOT EXISTS quorum_favorites_round_idx ON quorum_favorite_votes(round_id)",
  "CREATE INDEX IF NOT EXISTS quorum_payments_group_idx ON quorum_payment_authorizations(group_id, status)",
];

let schemaReady = false;

export async function ensureQuorumSchema() {
  if (schemaReady) return;
  const d1 = getD1();
  await d1.batch(schemaStatements.map((statement) => d1.prepare(statement)));
  schemaReady = true;
}

export function readSession(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(/(?:^|;\s*)quorum_session=([^;]+)/);
  if (match?.[1]) {
    return { id: decodeURIComponent(match[1]), created: false };
  }
  return { id: crypto.randomUUID(), created: true };
}

export function attachSessionCookie(
  response: Response,
  request: Request,
  session: { id: string; created: boolean },
) {
  if (!session.created) return response;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `quorum_session=${encodeURIComponent(
      session.id,
    )}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
  );
  return response;
}

function cents(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed * 100)
    : null;
}

function nullableCents(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100)
    : null;
}

function validCharacter(value: unknown) {
  return ["cat", "dog", "bird", "rabbit", "fish", "butterfly"].includes(
    String(value),
  );
}

function normalizeNickname(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 32) : "";
}

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 64) : "";
}

function confirmationNumber() {
  return `QR-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

async function groupById(groupId: string) {
  return getD1()
    .prepare("SELECT * FROM quorum_groups WHERE id = ? OR invite_code = ?")
    .bind(groupId, groupId)
    .first<GroupRow>();
}

async function membersForGroup(groupId: string) {
  const result = await getD1()
    .prepare(
      "SELECT * FROM quorum_members WHERE group_id = ? ORDER BY joined_at, id",
    )
    .bind(groupId)
    .all<MemberRow>();
  return result.results;
}

async function optionsForGroup(groupId: string) {
  const result = await getD1()
    .prepare(
      "SELECT * FROM quorum_options WHERE group_id = ? AND archived = 0 ORDER BY created_at, id",
    )
    .bind(groupId)
    .all<OptionRow>();
  return result.results;
}

async function currentMember(groupId: string, sessionId: string) {
  return getD1()
    .prepare(
      "SELECT * FROM quorum_members WHERE group_id = ? AND session_id = ?",
    )
    .bind(groupId, sessionId)
    .first<MemberRow>();
}

function optionToClient(option: OptionRow, contributorNickname: string) {
  return {
    id: option.id,
    groupId: option.group_id,
    contributorNickname,
    sourceUrl: option.source_url,
    provider: option.provider,
    sourceType: option.source_type,
    title: option.title,
    imageUrl: option.image_url,
    description: option.description,
    officialEmbedHtml: option.official_embed_html,
    sourceGuestCount: option.source_guest_count,
    category: option.category,
    dates: option.dates,
    allInTotal: option.all_in_total_cents / 100,
    participantCount: option.participant_count,
    basePrice:
      option.base_price_cents === null ? null : option.base_price_cents / 100,
    fees: option.fees_cents === null ? null : option.fees_cents / 100,
    taxes: option.taxes_cents === null ? null : option.taxes_cents / 100,
    checkedAt: option.checked_at,
    version: option.version,
    preferredBy: [],
  };
}

async function comfortRows(roundId: string) {
  const result = await getD1()
    .prepare(
      "SELECT option_id, member_id, value, option_version FROM quorum_comfort_responses WHERE round_id = ?",
    )
    .bind(roundId)
    .all<ComfortRow>();
  return result.results;
}

function viableOptionIds(
  options: OptionRow[],
  members: MemberRow[],
  responses: ComfortRow[],
) {
  return options
    .filter((option) =>
      members.every((member) =>
        responses.some(
          (response) =>
            response.option_id === option.id &&
            response.member_id === member.id &&
            response.option_version === option.version &&
            response.value === "works",
        ),
      ),
    )
    .map((option) => option.id);
}

function memberShare(
  totalCents: number,
  members: MemberRow[],
  memberId: string,
) {
  const index = Math.max(
    members.findIndex((member) => member.id === memberId),
    0,
  );
  const base = Math.floor(totalCents / Math.max(members.length, 1));
  const remainder = totalCents % Math.max(members.length, 1);
  return base + (index < remainder ? 1 : 0);
}

async function seedAuthorizations(
  groupId: string,
  option: OptionRow,
  members: MemberRow[],
) {
  const d1 = getD1();
  await d1.batch(
    members.map((member) =>
      d1
        .prepare(
          `INSERT INTO quorum_payment_authorizations
           (group_id, member_id, option_id, amount_cents, status)
           VALUES (?, ?, ?, ?, 'pending')
           ON CONFLICT(group_id, member_id) DO UPDATE SET
             option_id = excluded.option_id,
             amount_cents = excluded.amount_cents,
             status = 'pending',
             approved_at = NULL`,
        )
        .bind(
          groupId,
          member.id,
          option.id,
          memberShare(option.all_in_total_cents, members, member.id),
        ),
    ),
  );
}

async function setConsensus(
  group: GroupRow,
  option: OptionRow,
  members: MemberRow[],
) {
  await seedAuthorizations(group.id, option, members);
  await getD1()
    .prepare(
      `UPDATE quorum_groups
       SET phase = 'authorizing', selected_option_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(option.id, group.id)
    .run();
}

async function advanceAffordability(group: GroupRow) {
  if (!group.current_round_id) return;
  const [members, options, responses] = await Promise.all([
    membersForGroup(group.id),
    optionsForGroup(group.id),
    comfortRows(group.current_round_id),
  ]);
  const expected = members.length * options.length;
  if (expected === 0 || responses.length < expected) return;

  const viable = viableOptionIds(options, members, responses);
  if (viable.length === 0) {
    await getD1().batch([
      getD1()
        .prepare(
          "UPDATE quorum_groups SET phase = 'needs_options', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(group.id),
      getD1()
        .prepare(
          "UPDATE quorum_review_rounds SET status = 'no_match', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(group.current_round_id),
    ]);
    return;
  }

  if (viable.length === 1) {
    const selected = options.find((option) => option.id === viable[0]);
    if (selected) await setConsensus(group, selected, members);
    return;
  }

  await getD1()
    .prepare(
      "UPDATE quorum_groups SET phase = 'favorite', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(group.id)
    .run();
}

export async function createGroup(
  sessionId: string,
  payload: Record<string, unknown>,
) {
  await ensureQuorumSchema();
  const name = normalizeName(payload.name);
  const nickname = normalizeNickname(payload.nickname);
  const characterId = String(payload.characterId ?? "");
  const vibeIndex =
    typeof payload.vibeIndex === "number" &&
    payload.vibeIndex >= 0 &&
    payload.vibeIndex <= 3
      ? payload.vibeIndex
      : null;

  if (!name || !nickname || !validCharacter(characterId)) {
    throw new QuorumError("Complete the group and identity details.", 400);
  }

  const groupId = crypto.randomUUID().split("-")[0];
  const memberId = crypto.randomUUID();
  const d1 = getD1();
  await d1.batch([
    d1
      .prepare(
        `INSERT INTO quorum_groups
         (id, invite_code, name, vibe_index, phase, creator_member_id)
         VALUES (?, ?, ?, ?, 'collecting', ?)`,
      )
      .bind(groupId, groupId, name, vibeIndex, memberId),
    d1
      .prepare(
        `INSERT INTO quorum_members
         (id, group_id, session_id, character_id, nickname, is_creator)
         VALUES (?, ?, ?, ?, ?, 1)`,
      )
      .bind(memberId, groupId, sessionId, characterId, nickname),
  ]);
  return getGroupSnapshot(groupId, sessionId);
}

export async function joinGroup(
  groupId: string,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  await ensureQuorumSchema();
  const group = await groupById(groupId);
  if (!group) throw new QuorumError("Group not found.", 404);
  const existing = await currentMember(group.id, sessionId);
  if (existing) return getGroupSnapshot(group.id, sessionId);
  if (group.phase !== "collecting") {
    throw new QuorumError("This group has already started reviewing.", 409);
  }

  const nickname = normalizeNickname(payload.nickname);
  const characterId = String(payload.characterId ?? "");
  if (!nickname || !validCharacter(characterId)) {
    throw new QuorumError("Choose a character and group nickname.", 400);
  }

  try {
    await getD1()
      .prepare(
        `INSERT INTO quorum_members
         (id, group_id, session_id, character_id, nickname, is_creator)
         VALUES (?, ?, ?, ?, ?, 0)`,
      )
      .bind(
        crypto.randomUUID(),
        group.id,
        sessionId,
        characterId,
        nickname,
      )
      .run();
  } catch {
    throw new QuorumError(
      "That character or nickname was just claimed. Choose another.",
      409,
    );
  }

  return getGroupSnapshot(group.id, sessionId);
}

export async function getGroupSnapshot(groupId: string, sessionId: string) {
  await ensureQuorumSchema();
  const group = await groupById(groupId);
  if (!group) throw new QuorumError("Group not found.", 404);

  const [members, allOptions, member] = await Promise.all([
    membersForGroup(group.id),
    optionsForGroup(group.id),
    currentMember(group.id, sessionId),
  ]);
  const memberNames = new Map(
    members.map((savedMember) => [savedMember.id, savedMember.nickname]),
  );
  let visibleOptions = allOptions;
  let responses: ComfortRow[] = [];
  let viableIds: string[] = [];

  if (group.current_round_id) {
    responses = await comfortRows(group.current_round_id);
    viableIds = viableOptionIds(allOptions, members, responses);
    if (["favorite", "authorizing", "booked"].includes(group.phase)) {
      visibleOptions = allOptions.filter((option) =>
        group.selected_option_id
          ? option.id === group.selected_option_id
          : viableIds.includes(option.id),
      );
    }
  }

  if (!member) {
    return {
      joined: false,
      group: {
        id: group.id,
        name: group.name,
        vibeIndex: group.vibe_index,
        phase: group.phase,
        memberCount: members.length,
        claims: members.map((savedMember) => ({
          characterId: savedMember.character_id,
          nickname: savedMember.nickname,
        })),
        options: [],
      },
    };
  }

  const myComfort = Object.fromEntries(
    responses
      .filter((response) => response.member_id === member.id)
      .map((response) => [response.option_id, response.value]),
  );
  const affordabilityFinished = members.filter((savedMember) =>
    allOptions.every((option) =>
      responses.some(
        (response) =>
          response.member_id === savedMember.id &&
          response.option_id === option.id &&
          response.option_version === option.version,
      ),
    ),
  ).length;
  const favoriteRows = group.current_round_id
    ? (
        await getD1()
          .prepare(
            "SELECT member_id, option_id FROM quorum_favorite_votes WHERE round_id = ?",
          )
          .bind(group.current_round_id)
          .all<{ member_id: string; option_id: string }>()
      ).results
    : [];
  const myFavorite =
    favoriteRows.find((vote) => vote.member_id === member.id)?.option_id ??
    null;
  const favoriteAligned =
    favoriteRows.length === members.length &&
    new Set(favoriteRows.map((vote) => vote.option_id)).size === 1;
  const paymentRows = (
    await getD1()
      .prepare(
        "SELECT member_id, amount_cents, status FROM quorum_payment_authorizations WHERE group_id = ?",
      )
      .bind(group.id)
      .all<{ member_id: string; amount_cents: number; status: string }>()
  ).results;
  const myPayment = paymentRows.find(
    (payment) => payment.member_id === member.id,
  );

  return {
    joined: true,
    currentMember: {
      id: member.id,
      nickname: member.nickname,
      characterId: member.character_id,
      isCreator: Boolean(member.is_creator),
    },
    group: {
      id: group.id,
      name: group.name,
      vibeIndex: group.vibe_index,
      phase: group.phase,
      memberCount: members.length,
      creatorMemberId: group.creator_member_id,
      currentRoundId: group.current_round_id,
      selectedOptionId: group.selected_option_id,
      confirmationNumber: group.confirmation_number,
      claims: members.map((savedMember) => ({
        characterId: savedMember.character_id,
        nickname: savedMember.nickname,
      })),
      members: members.map((savedMember) => ({
        id: savedMember.id,
        characterId: savedMember.character_id,
        nickname: savedMember.nickname,
        isCreator: Boolean(savedMember.is_creator),
      })),
      options: visibleOptions.map((option) =>
        ({
          ...optionToClient(
            option,
            memberNames.get(option.contributor_member_id) ?? "Group member",
          ),
          participantCount:
            group.phase === "collecting"
              ? Math.max(members.length, 1)
              : option.participant_count,
        }),
      ),
    },
    privateState: {
      myComfort,
      myFavorite,
      myPaymentStatus: myPayment?.status ?? "pending",
      myShareCents: myPayment?.amount_cents ?? null,
    },
    progress: {
      affordabilityFinished,
      affordabilityTotal: members.length,
      favoriteSubmitted: favoriteRows.length,
      favoriteTotal: members.length,
      favoriteAligned,
      paymentApproved: paymentRows.filter(
        (payment) => payment.status === "approved",
      ).length,
      paymentTotal: members.length,
    },
  };
}

export async function performGroupAction(
  groupId: string,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  await ensureQuorumSchema();
  const group = await groupById(groupId);
  if (!group) throw new QuorumError("Group not found.", 404);
  const member = await currentMember(group.id, sessionId);
  if (!member) throw new QuorumError("Join this group first.", 403);
  const action = String(payload.action ?? "");
  const d1 = getD1();

  if (action === "add-option" || action === "update-option") {
    if (group.phase !== "collecting") {
      throw new QuorumError(
        "Reopen option collection before changing details.",
        409,
      );
    }
    const totalCents = cents(payload.allInTotal);
    const title = normalizeName(payload.title);
    const dates = normalizeName(payload.dates);
    if (!title || !dates || !totalCents) {
      throw new QuorumError("Confirm the title, dates, and total.", 400);
    }
    const optionId =
      action === "update-option" ? String(payload.optionId ?? "") : "";
    const existing = optionId
      ? await d1
          .prepare("SELECT * FROM quorum_options WHERE id = ? AND group_id = ?")
          .bind(optionId, group.id)
          .first<OptionRow>()
      : null;
    if (
      existing &&
      existing.contributor_member_id !== member.id &&
      !member.is_creator
    ) {
      throw new QuorumError("Only the contributor can edit this option.", 403);
    }

    const memberCount = (await membersForGroup(group.id)).length;
    const values = {
      id: existing?.id ?? crypto.randomUUID(),
      sourceUrl: String(payload.sourceUrl ?? "").slice(0, 2048),
      provider: normalizeName(payload.provider) || "Website",
      sourceType: normalizeName(payload.sourceType) || "WEBSITE",
      title,
      imageUrl:
        typeof payload.imageUrl === "string" ? payload.imageUrl.slice(0, 2048) : null,
      description:
        typeof payload.description === "string"
          ? payload.description.slice(0, 1000)
          : null,
      officialEmbedHtml:
        typeof payload.officialEmbedHtml === "string"
          ? payload.officialEmbedHtml.slice(0, 12_000)
          : null,
      sourceGuestCount:
        typeof payload.sourceGuestCount === "number"
          ? payload.sourceGuestCount
          : null,
      category: ["stay", "travel", "activity"].includes(String(payload.category))
        ? String(payload.category)
        : "stay",
      dates,
      totalCents,
      basePriceCents: nullableCents(payload.basePrice),
      feesCents: nullableCents(payload.fees),
      taxesCents: nullableCents(payload.taxes),
    };

    if (existing) {
      await d1
        .prepare(
          `UPDATE quorum_options SET
             source_url = ?, provider = ?, source_type = ?, title = ?,
             image_url = ?, description = ?, official_embed_html = ?,
             source_guest_count = ?, category = ?, dates = ?,
             all_in_total_cents = ?, participant_count = ?,
             base_price_cents = ?, fees_cents = ?, taxes_cents = ?,
             checked_at = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND group_id = ?`,
        )
        .bind(
          values.sourceUrl,
          values.provider,
          values.sourceType,
          values.title,
          values.imageUrl,
          values.description,
          values.officialEmbedHtml,
          values.sourceGuestCount,
          values.category,
          values.dates,
          values.totalCents,
          Math.max(memberCount, 1),
          values.basePriceCents,
          values.feesCents,
          values.taxesCents,
          new Date().toISOString(),
          values.id,
          group.id,
        )
        .run();
    } else {
      await d1
        .prepare(
          `INSERT INTO quorum_options (
             id, group_id, contributor_member_id, source_url, provider,
             source_type, title, image_url, description, official_embed_html,
             source_guest_count, category, dates, all_in_total_cents,
             participant_count, base_price_cents, fees_cents, taxes_cents,
             checked_at, version
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        )
        .bind(
          values.id,
          group.id,
          member.id,
          values.sourceUrl,
          values.provider,
          values.sourceType,
          values.title,
          values.imageUrl,
          values.description,
          values.officialEmbedHtml,
          values.sourceGuestCount,
          values.category,
          values.dates,
          values.totalCents,
          Math.max(memberCount, 1),
          values.basePriceCents,
          values.feesCents,
          values.taxesCents,
          new Date().toISOString(),
        )
        .run();
    }
  } else if (action === "archive-option") {
    if (group.phase !== "collecting") {
      throw new QuorumError("Options are frozen during review.", 409);
    }
    const optionId = String(payload.optionId ?? "");
    const option = await d1
      .prepare("SELECT * FROM quorum_options WHERE id = ? AND group_id = ?")
      .bind(optionId, group.id)
      .first<OptionRow>();
    if (
      !option ||
      (option.contributor_member_id !== member.id && !member.is_creator)
    ) {
      throw new QuorumError("You cannot archive this option.", 403);
    }
    await d1
      .prepare(
        "UPDATE quorum_options SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(option.id)
      .run();
  } else if (action === "start-review") {
    if (!member.is_creator) {
      throw new QuorumError("Only the creator can start private review.", 403);
    }
    if (group.phase !== "collecting") {
      throw new QuorumError("Private review has already started.", 409);
    }
    const [members, options] = await Promise.all([
      membersForGroup(group.id),
      optionsForGroup(group.id),
    ]);
    if (options.length === 0) {
      throw new QuorumError("Add at least one option first.", 400);
    }
    const roundId = crypto.randomUUID();
    await d1.batch([
      d1
        .prepare(
          "INSERT INTO quorum_review_rounds (id, group_id, status) VALUES (?, ?, 'active')",
        )
        .bind(roundId, group.id),
      d1
        .prepare(
          `UPDATE quorum_groups SET
             phase = 'affordability', current_round_id = ?,
             selected_option_id = NULL, confirmation_number = NULL,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(roundId, group.id),
      d1
        .prepare(
          "UPDATE quorum_options SET participant_count = ?, updated_at = CURRENT_TIMESTAMP WHERE group_id = ? AND archived = 0",
        )
        .bind(Math.max(members.length, 1), group.id),
    ]);
  } else if (action === "submit-comfort") {
    if (group.phase !== "affordability" || !group.current_round_id) {
      throw new QuorumError("Private affordability review is not open.", 409);
    }
    const optionId = String(payload.optionId ?? "");
    const value = String(payload.value ?? "");
    if (!["works", "too-much"].includes(value)) {
      throw new QuorumError("Choose how this price feels.", 400);
    }
    const option = await d1
      .prepare(
        "SELECT * FROM quorum_options WHERE id = ? AND group_id = ? AND archived = 0",
      )
      .bind(optionId, group.id)
      .first<OptionRow>();
    if (!option) throw new QuorumError("Option not found.", 404);
    await d1
      .prepare(
        `INSERT INTO quorum_comfort_responses
         (round_id, group_id, option_id, member_id, value, option_version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(round_id, option_id, member_id) DO UPDATE SET
           value = excluded.value,
           option_version = excluded.option_version,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        group.current_round_id,
        group.id,
        option.id,
        member.id,
        value,
        option.version,
      )
      .run();
    await advanceAffordability(group);
  } else if (action === "submit-favorite") {
    if (group.phase !== "favorite" || !group.current_round_id) {
      throw new QuorumError("The final preference round is not open.", 409);
    }
    const optionId = String(payload.optionId ?? "");
    const [members, options, responses] = await Promise.all([
      membersForGroup(group.id),
      optionsForGroup(group.id),
      comfortRows(group.current_round_id),
    ]);
    const viable = viableOptionIds(options, members, responses);
    if (!viable.includes(optionId)) {
      throw new QuorumError("Choose one of the viable options.", 400);
    }
    await d1
      .prepare(
        `INSERT INTO quorum_favorite_votes
         (round_id, group_id, member_id, option_id, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(round_id, member_id) DO UPDATE SET
           option_id = excluded.option_id,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(group.current_round_id, group.id, member.id, optionId)
      .run();

    const votes = (
      await d1
        .prepare(
          "SELECT member_id, option_id FROM quorum_favorite_votes WHERE round_id = ?",
        )
        .bind(group.current_round_id)
        .all<{ member_id: string; option_id: string }>()
    ).results;
    if (
      votes.length === members.length &&
      new Set(votes.map((vote) => vote.option_id)).size === 1
    ) {
      const selected = options.find(
        (option) => option.id === votes[0].option_id,
      );
      if (selected) await setConsensus(group, selected, members);
    }
  } else if (action === "approve-share") {
    if (group.phase !== "authorizing" || !group.selected_option_id) {
      throw new QuorumError("Payment approval is not ready.", 409);
    }
    await d1.batch([
      d1
        .prepare(
          `UPDATE quorum_payment_authorizations
           SET status = 'approved', approved_at = CURRENT_TIMESTAMP
           WHERE group_id = ? AND member_id = ? AND option_id = ?`,
        )
        .bind(group.id, member.id, group.selected_option_id),
      d1
        .prepare(
          `UPDATE quorum_groups
           SET phase = 'booked', confirmation_number = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND phase = 'authorizing'
             AND NOT EXISTS (
               SELECT 1 FROM quorum_payment_authorizations
               WHERE group_id = ? AND status != 'approved'
             )`,
        )
        .bind(confirmationNumber(), group.id, group.id),
      ...(group.current_round_id
        ? [
            d1
              .prepare(
                `UPDATE quorum_review_rounds
                 SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND EXISTS (
                   SELECT 1 FROM quorum_groups
                   WHERE id = ? AND phase = 'booked'
                 )`,
              )
              .bind(group.current_round_id, group.id),
          ]
        : []),
    ]);
  } else if (action === "reopen-collection") {
    if (!member.is_creator) {
      throw new QuorumError("Only the creator can reopen options.", 403);
    }
    if (!["needs_options", "affordability", "favorite"].includes(group.phase)) {
      throw new QuorumError("This group cannot be reopened now.", 409);
    }
    await d1
      .prepare(
        `UPDATE quorum_groups SET
           phase = 'collecting', current_round_id = NULL,
           selected_option_id = NULL, confirmation_number = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(group.id)
      .run();
  } else {
    throw new QuorumError("Unsupported group action.", 400);
  }

  return getGroupSnapshot(group.id, sessionId);
}

export class QuorumError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
