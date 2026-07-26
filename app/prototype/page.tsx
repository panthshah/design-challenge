"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { MeshGradient } from "@paper-design/shaders-react";
import {
  AirplaneTilt,
  ArrowsClockwise,
  Bird,
  Butterfly,
  CalendarBlank,
  Cat,
  Check,
  CheckCircle,
  Copy,
  Dog,
  HouseLine,
  Link,
  LockSimple,
  PencilSimple,
  Plus,
  Sparkle,
  FishSimple,
  Rabbit,
  Trash,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import styles from "./prototype.module.css";

type Screen =
  | "home"
  | "create"
  | "join"
  | "identity"
  | "group"
  | "add-option"
  | "confirm-option"
  | "comfort";
type EntryPath = "create" | "join";
type OptionCategory = "stay" | "travel" | "activity";
type GroupPhase =
  | "collecting"
  | "affordability"
  | "favorite"
  | "authorizing"
  | "booked"
  | "needs_options";
type ComfortValue =
  | "works"
  | "too-much"
  | "in"
  | "maybe"
  | "skip";
type UnfurlStatus = "idle" | "loading" | "success" | "fallback";
type GroupClaim = {
  characterId: CharacterId;
  nickname: string;
};
type SharedOption = {
  id: string;
  groupId: string;
  contributorNickname: string;
  sourceUrl: string;
  provider: string;
  sourceType: string;
  title: string;
  imageUrl: string | null;
  description: string | null;
  officialEmbedHtml: string | null;
  sourceGuestCount: number | null;
  category: OptionCategory;
  dates: string;
  allInTotal: number;
  participantCount: number;
  basePrice: number | null;
  fees: number | null;
  taxes: number | null;
  checkedAt: string;
  version: number;
  preferredBy: string[];
};
type ComfortResponse = {
  groupId: string;
  optionId: string;
  memberNickname: string;
  value: ComfortValue;
  optionVersion: number;
  updatedAt: string;
};
type GroupRecord = {
  id: string;
  name: string;
  vibeIndex: number | null;
  phase: GroupPhase;
  claims: GroupClaim[];
  members?: Array<
    GroupClaim & { id: string; isCreator: boolean }
  >;
  memberCount: number;
  creatorMemberId?: string | null;
  currentRoundId?: string | null;
  selectedOptionId?: string | null;
  confirmationNumber?: string | null;
  options: SharedOption[];
};

type SharedGroupSnapshot = {
  joined: boolean;
  group: GroupRecord;
  currentMember?: {
    id: string;
    nickname: string;
    characterId: CharacterId;
    isCreator: boolean;
  };
  privateState?: {
    myComfort: Record<string, "works" | "too-much">;
    myFavorite: string | null;
    myPaymentStatus: "pending" | "approved";
    myShareCents: number | null;
  };
  progress?: {
    affordabilityFinished: number;
    affordabilityTotal: number;
    favoriteSubmitted: number;
    favoriteTotal: number;
    favoriteAligned: boolean;
    paymentApproved: number;
    paymentTotal: number;
  };
};

type ImportedOption = {
  provider: string;
  sourceType: string;
  title: string;
  imageUrl: string | null;
  sourceUrl: string;
  description: string | null;
  officialEmbedHtml: string | null;
  sourceGuestCount: number | null;
};

type OptionDraft = ImportedOption & {
  category: OptionCategory;
  dates: string;
  allInTotal: string;
  participantCount: string;
  basePrice: string;
  fees: string;
  taxes: string;
};

type UnfurlResponse = {
  ok: boolean;
  metadata?: {
    title: string | null;
    image: string | null;
    description: string | null;
    price: number | null;
    siteName: string | null;
    sourceLabel: string;
    dates: string | null;
    guestCount: number | null;
    officialEmbedHtml: string | null;
    fallback: boolean;
  };
};

const characterOptions = [
  { id: "cat", name: "Cat", Icon: Cat, surface: "#f6d66f" },
  { id: "dog", name: "Dog", Icon: Dog, surface: "#9edccb" },
  { id: "bird", name: "Bird", Icon: Bird, surface: "#ef9b83" },
  { id: "rabbit", name: "Rabbit", Icon: Rabbit, surface: "#c5b1ef" },
  { id: "fish", name: "Fish", Icon: FishSimple, surface: "#8dbce9" },
  {
    id: "butterfly",
    name: "Butterfly",
    Icon: Butterfly,
    surface: "#d5eb84",
  },
] as const;

type CharacterId = (typeof characterOptions)[number]["id"];

const generatedAliases = [
  "Window Seat",
  "Snack Captain",
  "Late Checkout",
  "Lucky Socks",
  "Side Quest",
  "Tiny Detour",
];

const defaultVibe = {
  name: "Quorum classic",
  gradient: "linear-gradient(135deg, #fffbea 0%, #f2ecdc 100%)",
  shaderColors: ["#fffbea", "#f2ecdc", "#d5eb84", "#fffbea"],
  ink: "#161511",
  accent: "#d5eb84",
  accentInk: "#161511",
};

const groupVibes = [
  {
    name: "Golden hour",
    gradient: "linear-gradient(135deg, #f7df71 0%, #ef8f62 100%)",
    shaderColors: ["#fff0a8", "#f7c565", "#ef8f62", "#ffdd75"],
    ink: "#342014",
    accent: "#4a261a",
    accentInk: "#fffbea",
    distortion: 0.56,
    swirl: 0.34,
  },
  {
    name: "Poolside",
    gradient: "linear-gradient(135deg, #a8efe0 0%, #6d9ff2 100%)",
    shaderColors: ["#bef8e8", "#7edadd", "#6d9ff2", "#d8fff2"],
    ink: "#102b35",
    accent: "#102b35",
    accentInk: "#fffbea",
    distortion: 0.48,
    swirl: 0.66,
  },
  {
    name: "After dark",
    gradient: "linear-gradient(135deg, #9b83f6 0%, #30265d 100%)",
    shaderColors: ["#ac90ff", "#6548ae", "#30265d", "#f3e68c"],
    ink: "#fffbea",
    accent: "#f3e68c",
    accentInk: "#30265d",
    distortion: 0.74,
    swirl: 0.42,
  },
  {
    name: "Garden party",
    gradient: "linear-gradient(135deg, #d8ef74 0%, #65ad73 100%)",
    shaderColors: ["#e5f78d", "#b0da6f", "#65ad73", "#f1f0a1"],
    ink: "#18331d",
    accent: "#18331d",
    accentInk: "#fffbea",
    distortion: 0.6,
    swirl: 0.78,
  },
] as const;

type GroupVibe = (typeof groupVibes)[number];

const maxActiveOptions = 6;

const providerImports = [
  {
    match: "airbnb.",
    provider: "Airbnb",
    sourceType: "AIRBNB",
    title: "Airbnb listing",
  },
  {
    match: "booking.",
    provider: "Booking.com",
    sourceType: "HOTEL",
    title: "Hotel option",
  },
  {
    match: "vrbo.",
    provider: "Vrbo",
    sourceType: "HOTEL",
    title: "Vacation rental",
  },
  {
    match: "expedia.",
    provider: "Expedia",
    sourceType: "HOTEL",
    title: "Travel option",
  },
] as const;

const emptyDraft: OptionDraft = {
  provider: "",
  sourceType: "WEBSITE",
  title: "",
  imageUrl: null,
  sourceUrl: "",
  description: null,
  officialEmbedHtml: null,
  sourceGuestCount: null,
  category: "stay",
  dates: "",
  allInTotal: "",
  participantCount: "1",
  basePrice: "",
  fees: "",
  taxes: "",
};

const mandatoryComfortOptions = [
  {
    value: "works",
    label: "Works for me",
    helper: "I’d feel good saying yes.",
  },
  {
    value: "too-much",
    label: "Too much",
    helper: "I’d rather choose a lower-cost option.",
  },
] as const;

function parseInviteGroupId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed, window.location.origin);
    const queryId = url.searchParams.get("invite");
    if (queryId) return queryId;

    const pathParts = url.pathname.split("/").filter(Boolean);
    return pathParts.at(-1) ?? null;
  } catch {
    return trimmed.replace(/^#/, "") || null;
  }
}

function getGroupVibe(vibeIndex: number | null | undefined) {
  return typeof vibeIndex === "number" ? groupVibes[vibeIndex] : null;
}

function titleFromUrl(url: URL) {
  const ignored = new Set([
    "rooms",
    "hotel",
    "hotels",
    "listing",
    "property",
    "stays",
  ]);
  const candidate = url.pathname
    .split("/")
    .filter(Boolean)
    .reverse()
    .find(
      (segment) =>
        !ignored.has(segment.toLowerCase()) &&
        !/^\d+$/.test(segment) &&
        segment.length > 2,
    );

  if (!candidate) return null;

  try {
    return decodeURIComponent(candidate)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_+]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  } catch {
    return null;
  }
}

function parseImportedOption(value: string): ImportedOption | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const importMatch = providerImports.find((provider) =>
      url.hostname.toLowerCase().includes(provider.match),
    );

    if (importMatch) {
      return {
        provider: importMatch.provider,
        sourceType: importMatch.sourceType,
        title: titleFromUrl(url) ?? importMatch.title,
        imageUrl: null,
        sourceUrl: url.toString(),
        description: null,
        officialEmbedHtml: null,
        sourceGuestCount: null,
      };
    }

    return {
      provider: url.hostname.replace(/^www\./, ""),
      sourceType: "WEBSITE",
      title: titleFromUrl(url) ?? "Trip option",
      imageUrl: null,
      sourceUrl: url.toString(),
      description: null,
      officialEmbedHtml: null,
      sourceGuestCount: null,
    };
  } catch {
    return null;
  }
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

function checkedTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getPerPerson(option: Pick<SharedOption, "allInTotal" | "participantCount">) {
  return option.allInTotal / Math.max(option.participantCount, 1);
}

function categoryLabel(category: OptionCategory) {
  if (category === "stay") return "Stay";
  if (category === "travel") return "Travel";
  return "Activity";
}

function ShaderCardBackdrop({
  vibe,
  reducedMotion,
}: {
  vibe: GroupVibe | null;
  reducedMotion: boolean;
}) {
  if (!vibe) return null;

  return (
    <MeshGradient
      className={styles.cardShader}
      colors={[...vibe.shaderColors]}
      distortion={vibe.distortion}
      swirl={vibe.swirl}
      grainMixer={0.08}
      grainOverlay={0.04}
      speed={reducedMotion ? 0 : 0.16}
      aria-hidden="true"
    />
  );
}

export default function PrototypeLanding() {
  const searchParams = useSearchParams();
  const deepLinkedGroupId = searchParams.get("invite");
  const deepLinked = Boolean(deepLinkedGroupId);
  const [screen, setScreen] = useState<Screen>(deepLinked ? "join" : "home");
  const [entryPath, setEntryPath] = useState<EntryPath>(
    deepLinked ? "join" : "create",
  );
  const [groupName, setGroupName] = useState("");
  const [selectedVibeIndex, setSelectedVibeIndex] = useState<number | null>(
    null,
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inviteCode, setInviteCode] = useState(
    deepLinkedGroupId
      ? `quorum.app/join/${deepLinkedGroupId}`
      : "",
  );
  const [joinPreviewVisible, setJoinPreviewVisible] = useState(deepLinked);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(
    deepLinkedGroupId,
  );
  const [activeGroup, setActiveGroup] = useState<GroupRecord | null>(
    null,
  );
  const [sharedSnapshot, setSharedSnapshot] =
    useState<SharedGroupSnapshot | null>(null);
  const [sharedBusy, setSharedBusy] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [favoriteChoice, setFavoriteChoice] = useState<string | null>(null);
  const [bookingProcessing, setBookingProcessing] = useState(false);
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterId>("cat");
  const [aliasIndex, setAliasIndex] = useState(0);
  const [identityNickname, setIdentityNickname] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [optionUrl, setOptionUrl] = useState("");
  const [optionImportError, setOptionImportError] = useState<string | null>(
    null,
  );
  const [optionDraft, setOptionDraft] = useState<OptionDraft>(emptyDraft);
  const [unfurlStatus, setUnfurlStatus] =
    useState<UnfurlStatus>("idle");
  const [unfurlSourceUrl, setUnfurlSourceUrl] = useState("");
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [comfortChoice, setComfortChoice] =
    useState<ComfortValue | null>(null);
  const [responses, setResponses] = useState<ComfortResponse[]>([]);
  const [costDetailsOpen, setCostDetailsOpen] = useState(false);
  const [archivePendingId, setArchivePendingId] = useState<string | null>(null);
  const unfurlRequestId = useRef(0);

  const applySharedSnapshot = useCallback((snapshot: SharedGroupSnapshot) => {
    setSharedSnapshot(snapshot);
    setActiveGroup(snapshot.group);
    setCurrentGroupId(snapshot.group.id);
    setFavoriteChoice(snapshot.privateState?.myFavorite ?? null);

    if (snapshot.currentMember) {
      setIdentityNickname(snapshot.currentMember.nickname);
      setSelectedCharacter(snapshot.currentMember.characterId);
      const roundId = snapshot.group.currentRoundId ?? "";
      setResponses(
        Object.entries(snapshot.privateState?.myComfort ?? {}).map(
          ([optionId, value]) => ({
            groupId: snapshot.group.id,
            optionId,
            memberNickname: snapshot.currentMember?.nickname ?? "",
            value,
            optionVersion:
              snapshot.group.options.find((option) => option.id === optionId)
                ?.version ?? 1,
            updatedAt: roundId,
          }),
        ),
      );
    } else {
      setResponses([]);
    }
  }, []);

  const loadSharedGroup = useCallback(
    async (groupId: string, quiet = false) => {
      if (!quiet) setSharedBusy(true);
      try {
        const response = await fetch(
          `/api/groups/${encodeURIComponent(groupId)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as
          | SharedGroupSnapshot
          | { error?: string };
        if (!response.ok || !("group" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Quorum could not load this group.",
          );
        }
        applySharedSnapshot(data);
        setSharedError(null);
        return data;
      } catch (error) {
        if (!quiet) {
          setSharedError(
            error instanceof Error
              ? error.message
              : "Quorum could not load this group.",
          );
        }
        return null;
      } finally {
        if (!quiet) setSharedBusy(false);
      }
    },
    [applySharedSnapshot],
  );

  const postSharedAction = useCallback(
    async (groupId: string, payload: Record<string, unknown>) => {
      setSharedBusy(true);
      try {
        const response = await fetch(
          `/api/groups/${encodeURIComponent(groupId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = (await response.json()) as
          | SharedGroupSnapshot
          | { error?: string };
        if (!response.ok || !("group" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Quorum could not update the group.",
          );
        }
        applySharedSnapshot(data);
        setSharedError(null);
        return data;
      } catch (error) {
        setSharedError(
          error instanceof Error
            ? error.message
            : "Quorum could not update the group.",
        );
        return null;
      } finally {
        setSharedBusy(false);
      }
    },
    [applySharedSnapshot],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!deepLinkedGroupId) return;
    const timeout = window.setTimeout(() => {
      void loadSharedGroup(deepLinkedGroupId).then((snapshot) => {
        if (!snapshot) return;
        if (snapshot.joined) {
          setScreen("group");
        } else {
          setJoinPreviewVisible(true);
          setScreen("join");
        }
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [deepLinkedGroupId, loadSharedGroup]);

  useEffect(() => {
    if (!currentGroupId || !sharedSnapshot?.joined) return;

    const poll = () => {
      if (document.visibilityState === "visible") {
        void loadSharedGroup(currentGroupId, true);
      }
    };
    const interval = window.setInterval(poll, 2_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [currentGroupId, loadSharedGroup, sharedSnapshot?.joined]);

  useEffect(() => {
    if (!previewSheetOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewSheetOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewSheetOpen]);

  const claimedNicknames = new Set(
    activeGroup?.claims.map((claim) => claim.nickname.toLowerCase()) ?? [],
  );
  const claimedCharacters = new Set(
    activeGroup?.claims.map((claim) => claim.characterId) ?? [],
  );
  const availableAliases = generatedAliases.filter(
    (nickname) => !claimedNicknames.has(nickname.toLowerCase()),
  );
  const groupAlias =
    availableAliases.length > 0
      ? availableAliases[aliasIndex % availableAliases.length]
      : "";
  const selectedVibe =
    selectedVibeIndex === null ? null : groupVibes[selectedVibeIndex];
  const savedGroupVibe = getGroupVibe(activeGroup?.vibeIndex);
  const activeVibe = savedGroupVibe ?? selectedVibe ?? defaultVibe;
  const activeGroupName = activeGroup?.name ?? groupName.trim();
  const selectedCharacterOption =
    characterOptions.find((option) => option.id === selectedCharacter) ??
    characterOptions[0];
  const SelectedCharacterIcon = selectedCharacterOption.Icon;
  const displayedNickname = identityNickname ?? groupAlias;
  const groupOptions = activeGroup?.options ?? [];
  const activeOption =
    groupOptions.find((option) => option.id === activeOptionId) ?? null;
  const currentMemberNickname = displayedNickname || "Window Seat";
  const draftTotal = Number(optionDraft.allInTotal);
  const draftParticipants = Math.max(activeGroup?.memberCount ?? 1, 1);
  const draftShare =
    Number.isFinite(draftTotal) &&
    draftTotal > 0 &&
    Number.isInteger(draftParticipants) &&
    draftParticipants > 0
      ? draftTotal / draftParticipants
      : 0;
  const optionDraftValid =
    Boolean(optionDraft.title.trim()) &&
    Boolean(optionDraft.dates.trim()) &&
    draftShare > 0 &&
    unfurlStatus !== "loading";
  const appThemeStyle = {
    "--group-gradient": activeVibe.gradient,
    "--group-ink": activeVibe.ink,
    ...(screen === "create"
      ? {
          "--vibe-background": selectedVibe?.gradient ?? "#fffbea",
          "--vibe-ink": selectedVibe?.ink ?? "#161511",
          "--vibe-accent": selectedVibe?.accent ?? "#d5eb84",
          "--vibe-accent-ink": selectedVibe?.accentInk ?? "#161511",
        }
      : {}),
  } as CSSProperties;

  function startPath(path: EntryPath) {
    setEntryPath(path);
    setCopied(false);
    setIdentityNickname(null);

    if (path === "create") {
      setSelectedVibeIndex(null);
      setCurrentGroupId(null);
      setActiveGroup(null);
      setIdentityError(null);
      setScreen("create");
      return;
    }

    setJoinPreviewVisible(false);
    setInviteCode("");
    setCurrentGroupId(null);
    setActiveGroup(null);
    setIdentityError(null);
    setScreen("join");
  }

  function beginIdentity(path: EntryPath) {
    let group = activeGroup;

    if (path === "create") {
      group = {
        id: "draft",
        name: groupName.trim(),
        vibeIndex: selectedVibeIndex,
        phase: "collecting",
        claims: [],
        memberCount: 0,
        options: [],
      };
      setCurrentGroupId(null);
      setActiveGroup(group);
    }

    if (!group) return;

    const takenCharacters = new Set(
      group.claims.map((claim) => claim.characterId),
    );
    const firstAvailableCharacter =
      characterOptions.find((option) => !takenCharacters.has(option.id))?.id ??
      "cat";

    setEntryPath(path);
    setAliasIndex(0);
    setIdentityNickname(null);
    setSelectedCharacter(firstAvailableCharacter);
    setIdentityError(null);
    setScreen("identity");
  }

  function goBack() {
    if (screen === "identity") {
      setScreen(entryPath);
      return;
    }

    if (screen === "group") {
      setScreen("home");
      return;
    }

    if (screen === "add-option") {
      setScreen("group");
      return;
    }

    if (screen === "confirm-option") {
      if (editingOptionId) {
        setEditingOptionId(null);
        setScreen("group");
      } else {
        setScreen("add-option");
      }
      return;
    }

    if (screen === "comfort") {
      setComfortChoice(null);
      setScreen("group");
      return;
    }

    setScreen("home");
  }

  async function copyInviteLink() {
    if (!currentGroupId) return;

    const inviteUrl = `${window.location.origin}/prototype?invite=${encodeURIComponent(
      currentGroupId,
    )}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function shuffleAlias() {
    setIdentityError(null);
    if (availableAliases.length < 2) return;
    setAliasIndex((current) => (current + 1) % availableAliases.length);
  }

  async function showJoinPreview() {
    const groupId = parseInviteGroupId(inviteCode);
    if (!groupId) return;

    const snapshot = await loadSharedGroup(groupId);
    if (!snapshot) return;
    if (snapshot.joined) {
      setScreen("group");
      return;
    }
    setJoinPreviewVisible(true);
  }

  async function completeIdentity() {
    if (!groupAlias) {
      setIdentityError("No nicknames are available for this group.");
      return;
    }
    setIdentityError(null);

    let snapshot: SharedGroupSnapshot | null = null;
    if (entryPath === "create") {
      setSharedBusy(true);
      try {
        const response = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: groupName.trim(),
            vibeIndex: selectedVibeIndex,
            nickname: groupAlias,
            characterId: selectedCharacter,
          }),
        });
        const data = (await response.json()) as
          | SharedGroupSnapshot
          | { error?: string };
        if (!response.ok || !("group" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Quorum could not create this group.",
          );
        }
        snapshot = data;
        applySharedSnapshot(data);
      } catch (error) {
        setIdentityError(
          error instanceof Error
            ? error.message
            : "Quorum could not create this group.",
        );
      } finally {
        setSharedBusy(false);
      }
    } else if (currentGroupId) {
      snapshot = await postSharedAction(currentGroupId, {
        action: "join",
        nickname: groupAlias,
        characterId: selectedCharacter,
      });
      if (!snapshot) {
        setIdentityError(
          sharedError ??
            "That character or nickname may have just been claimed. Try another.",
        );
      }
    }

    if (snapshot) {
      setIdentityNickname(groupAlias);
      setIdentityError(null);
      setScreen("group");
    }
  }

  async function requestUnfurl(value: string) {
    const fallback = parseImportedOption(value);
    if (!fallback) return;

    const requestId = ++unfurlRequestId.current;
    setUnfurlSourceUrl(fallback.sourceUrl);
    setUnfurlStatus("loading");
    setOptionImportError(null);
    setPreviewImageFailed(false);
    setOptionDraft((current) => ({
      ...current,
      ...fallback,
      participantCount: String(Math.max(activeGroup?.memberCount ?? 1, 1)),
    }));

    try {
      const response = await fetch(
        `/api/unfurl?url=${encodeURIComponent(fallback.sourceUrl)}`,
      );
      const data = (await response.json()) as UnfurlResponse;
      if (requestId !== unfurlRequestId.current) return;

      if (!response.ok || !data.ok || !data.metadata) {
        setUnfurlStatus("fallback");
        return;
      }

      const metadata = data.metadata;
      setOptionDraft((current) => {
        const canReplaceTitle =
          !current.title ||
          current.title === fallback.title ||
          current.sourceUrl !== fallback.sourceUrl;

        return {
          ...current,
          provider: metadata.siteName ?? fallback.provider,
          sourceType: metadata.sourceLabel || fallback.sourceType,
          title:
            canReplaceTitle && metadata.title
              ? metadata.title
              : current.title || fallback.title,
          imageUrl: metadata.image,
          sourceUrl: fallback.sourceUrl,
          description: metadata.description,
          officialEmbedHtml: metadata.officialEmbedHtml,
          sourceGuestCount: metadata.guestCount,
          dates: metadata.dates ?? current.dates,
          allInTotal:
            current.allInTotal ||
            (metadata.price ? String(Math.round(metadata.price)) : ""),
          participantCount: String(
            Math.max(activeGroup?.memberCount ?? 1, 1),
          ),
        };
      });
      setUnfurlStatus(metadata.fallback ? "fallback" : "success");
    } catch {
      if (requestId === unfurlRequestId.current) {
        setUnfurlStatus("fallback");
      }
    }
  }

  function startAddingOption() {
    if (!activeGroup || activeGroup.options.length >= maxActiveOptions) return;

    unfurlRequestId.current += 1;
    setOptionUrl("");
    setOptionImportError(null);
    setOptionDraft({
      ...emptyDraft,
      participantCount: String(Math.max(activeGroup.memberCount, 1)),
    });
    setUnfurlStatus("idle");
    setUnfurlSourceUrl("");
    setPreviewImageFailed(false);
    setPreviewSheetOpen(false);
    setEditingOptionId(null);
    setCostDetailsOpen(false);
    setScreen("add-option");
  }

  function importOption() {
    const imported = parseImportedOption(optionUrl);
    if (!imported) {
      setOptionImportError(
        "Paste a complete link beginning with https:// so Quorum can build the preview.",
      );
      return;
    }

    setOptionImportError(null);
    setOptionDraft((current) =>
      current.sourceUrl === imported.sourceUrl
        ? current
        : {
            ...emptyDraft,
            ...imported,
            participantCount: String(
              Math.max(activeGroup?.memberCount ?? 1, 1),
            ),
          },
    );
    setCostDetailsOpen(false);
    setScreen("confirm-option");

    if (
      unfurlSourceUrl !== imported.sourceUrl ||
      unfurlStatus === "idle"
    ) {
      void requestUnfurl(imported.sourceUrl);
    }
  }

  function editOption(option: SharedOption) {
    unfurlRequestId.current += 1;
    setEditingOptionId(option.id);
    setOptionUrl(option.sourceUrl);
    setOptionDraft({
      provider: option.provider,
      sourceType: option.sourceType,
      title: option.title,
      imageUrl: option.imageUrl,
      sourceUrl: option.sourceUrl,
      description: option.description,
      officialEmbedHtml: option.officialEmbedHtml,
      sourceGuestCount: option.sourceGuestCount,
      category: option.category,
      dates: option.dates,
      allInTotal: String(option.allInTotal),
      participantCount: String(option.participantCount),
      basePrice:
        option.basePrice === null ? "" : String(option.basePrice),
      fees: option.fees === null ? "" : String(option.fees),
      taxes: option.taxes === null ? "" : String(option.taxes),
    });
    setUnfurlStatus("success");
    setUnfurlSourceUrl(option.sourceUrl);
    setPreviewImageFailed(false);
    setPreviewSheetOpen(false);
    setCostDetailsOpen(false);
    setScreen("confirm-option");
  }

  function previewSavedOption(option: SharedOption) {
    setOptionDraft({
      provider: option.provider,
      sourceType: option.sourceType,
      title: option.title,
      imageUrl: option.imageUrl,
      sourceUrl: option.sourceUrl,
      description: option.description,
      officialEmbedHtml: option.officialEmbedHtml,
      sourceGuestCount: option.sourceGuestCount,
      category: option.category,
      dates: option.dates,
      allInTotal: String(option.allInTotal),
      participantCount: String(option.participantCount),
      basePrice: option.basePrice === null ? "" : String(option.basePrice),
      fees: option.fees === null ? "" : String(option.fees),
      taxes: option.taxes === null ? "" : String(option.taxes),
    });
    setPreviewImageFailed(false);
    setPreviewSheetOpen(true);
  }

  async function saveOptionForReview() {
    if (!activeGroup || !currentGroupId) return;

    const allInTotal = Number(optionDraft.allInTotal);
    const participantCount = Math.max(activeGroup.memberCount, 1);
    if (
      !optionDraft.title.trim() ||
      !optionDraft.dates.trim() ||
      !Number.isFinite(allInTotal) ||
      allInTotal <= 0 ||
      !Number.isInteger(participantCount)
    ) {
      return;
    }

    const snapshot = await postSharedAction(currentGroupId, {
      action: editingOptionId ? "update-option" : "add-option",
      optionId: editingOptionId,
      ...optionDraft,
      allInTotal,
      participantCount,
      basePrice: optionDraft.basePrice
        ? Number(optionDraft.basePrice)
        : null,
      fees: optionDraft.fees ? Number(optionDraft.fees) : null,
      taxes: optionDraft.taxes ? Number(optionDraft.taxes) : null,
    });
    if (!snapshot) return;
    setEditingOptionId(null);
    setActiveOptionId(null);
    setComfortChoice(null);
    setScreen("group");
  }

  function beginComfortCheck(option: SharedOption) {
    const priorResponse = responses.find(
      (response) =>
        response.optionId === option.id &&
        response.memberNickname === currentMemberNickname &&
        response.optionVersion === option.version,
    );

    setActiveOptionId(option.id);
    setComfortChoice(priorResponse?.value ?? null);
    setScreen("comfort");
  }

  async function saveComfortResponse() {
    if (
      !activeOption ||
      !comfortChoice ||
      !currentGroupId ||
      !activeGroup
    ) {
      return;
    }

    const snapshot = await postSharedAction(currentGroupId, {
      action: "submit-comfort",
      optionId: activeOption.id,
      value: comfortChoice,
    });
    if (!snapshot) return;
    const nextOption = snapshot.group.options.find(
      (option) => !snapshot.privateState?.myComfort[option.id],
    );
    if (snapshot.group.phase === "affordability" && nextOption) {
      setActiveOptionId(nextOption.id);
      setComfortChoice(null);
      return;
    }
    setActiveOptionId(null);
    setComfortChoice(null);
    setScreen("group");
  }

  async function archiveOption(optionId: string) {
    if (!activeGroup || !currentGroupId || !sharedSnapshot?.currentMember) return;

    if (archivePendingId !== optionId) {
      setArchivePendingId(optionId);
      return;
    }

    await postSharedAction(currentGroupId, {
      action: "archive-option",
      optionId,
    });
    setArchivePendingId(null);
  }

  async function startPrivateReview() {
    if (!currentGroupId) return;
    const snapshot = await postSharedAction(currentGroupId, {
      action: "start-review",
    });
    if (!snapshot) return;
    const firstOption = snapshot.group.options[0];
    if (firstOption) {
      setActiveOptionId(firstOption.id);
      setComfortChoice(null);
      setScreen("comfort");
    }
  }

  function continuePrivateReview() {
    const nextOption = groupOptions.find(
      (option) => !sharedSnapshot?.privateState?.myComfort[option.id],
    );
    if (!nextOption) return;
    beginComfortCheck(nextOption);
  }

  async function chooseFavorite() {
    if (!currentGroupId || !favoriteChoice) return;
    await postSharedAction(currentGroupId, {
      action: "submit-favorite",
      optionId: favoriteChoice,
    });
  }

  async function approveShare() {
    if (!currentGroupId) return;
    const snapshot = await postSharedAction(currentGroupId, {
      action: "approve-share",
    });
    if (snapshot?.group.phase !== "booked") return;
    setBookingProcessing(true);
    window.setTimeout(() => setBookingProcessing(false), 1_100);
  }

  async function reopenCollection() {
    if (!currentGroupId) return;
    await postSharedAction(currentGroupId, {
      action: "reopen-collection",
    });
  }

  const phaseSteps = [
    { id: "collecting", label: "Options" },
    { id: "affordability", label: "Budget" },
    { id: "favorite", label: "Favorite" },
    { id: "authorizing", label: "Approve" },
    { id: "booked", label: "Booked" },
  ] as const;
  const phaseOrder: Record<GroupPhase, number> = {
    collecting: 0,
    affordability: 1,
    needs_options: 1,
    favorite: 2,
    authorizing: 3,
    booked: 4,
  };
  const currentPhaseIndex = phaseOrder[activeGroup?.phase ?? "collecting"];
  const isCreator = Boolean(sharedSnapshot?.currentMember?.isCreator);
  const selectedConsensusOption =
    groupOptions.find((option) => option.id === activeGroup?.selectedOptionId) ??
    groupOptions[0] ??
    null;
  const myShare = sharedSnapshot?.privateState?.myShareCents ?? null;
  const hasApproved =
    sharedSnapshot?.privateState?.myPaymentStatus === "approved";
  const myUnreviewedCount = groupOptions.filter(
    (option) => !sharedSnapshot?.privateState?.myComfort[option.id],
  ).length;

  return (
    <main className={styles.stage}>
      <div className={styles.devicePreview}>
        <div className={styles.deviceFrame}>
          <span
            className={`${styles.deviceButton} ${styles.deviceSilentButton}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.deviceButton} ${styles.deviceVolumeUp}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.deviceButton} ${styles.deviceVolumeDown}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.deviceButton} ${styles.devicePowerButton}`}
            aria-hidden="true"
          />
          <span className={styles.deviceIsland} aria-hidden="true" />

          <section
            className={styles.app}
            aria-label="Quorum prototype"
            data-screen={screen}
            data-testid="prototype-screen-one"
            style={appThemeStyle}
          >
        {screen === "create" && selectedVibe && (
          <div
            className={styles.activeShaderLayer}
            style={{ background: selectedVibe.gradient }}
            aria-hidden="true"
          >
            <MeshGradient
              className={styles.activeShader}
              colors={[...selectedVibe.shaderColors]}
              distortion={selectedVibe.distortion}
              swirl={selectedVibe.swirl}
              grainMixer={0.1}
              grainOverlay={0.06}
              speed={reducedMotion ? 0 : 0.22}
            />
          </div>
        )}

        {screen === "home" && (
          <div className={styles.screen} key="home">
            <header className={styles.header}>
              <span className={styles.wordmark}>Quorum</span>
            </header>

            <div className={styles.homeContent}>
              <div>
                <h1>
                  Make plans <span>that work for everyone.</span>
                </h1>
                <p className={styles.lede}>
                  Find common ground without asking friends to share what they
                  can afford.
                </p>
              </div>
            </div>

            <div className={styles.entryActions}>
              <button
                className={styles.greenAction}
                type="button"
                onClick={() => startPath("create")}
              >
                Create a group
              </button>
              <button
                className={styles.textAction}
                type="button"
                onClick={() => startPath("join")}
              >
                Join with an invite
              </button>
            </div>
          </div>
        )}

        {screen === "create" && (
          <div className={styles.screen} key="create">
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to Quorum entry"
              >
                Back
              </button>
              <span className={styles.stepLabel}>New group · 1 of 2</span>
            </header>

            <form
              className={styles.formScreen}
              onSubmit={(event) => {
                event.preventDefault();
                beginIdentity("create");
              }}
            >
              <div>
                <h1>What are you planning?</h1>
                <p className={styles.formIntro}>
                  Give the group enough context to recognize the plan.
                </p>
              </div>

              <label className={styles.inlineName}>
                <span className={styles.srOnly}>Group name</span>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Type group name"
                  maxLength={32}
                  autoFocus
                />
              </label>

              <div className={styles.createFooter}>
                <fieldset className={styles.shaderPicker}>
                  <legend className={styles.srOnly}>Choose a background</legend>
                  {groupVibes.map((vibe, index) => (
                    <button
                      key={vibe.name}
                      type="button"
                      className={styles.shaderSwatch}
                      aria-label={`Use ${vibe.name} background`}
                      aria-pressed={selectedVibeIndex === index}
                      onClick={() => setSelectedVibeIndex(index)}
                      style={{ background: vibe.gradient }}
                    >
                      <MeshGradient
                        className={styles.swatchShader}
                        colors={[...vibe.shaderColors]}
                        distortion={vibe.distortion}
                        swirl={vibe.swirl}
                        grainMixer={0.08}
                        grainOverlay={0.04}
                        speed={reducedMotion ? 0 : 0.18 + index * 0.025}
                      />
                    </button>
                  ))}
                </fieldset>

                <button
                  className={`${styles.greenAction} ${styles.createAction}`}
                  type="submit"
                  disabled={!groupName.trim()}
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        )}

        {screen === "join" && (
          <div className={styles.screen} key="join">
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to Quorum entry"
              >
                Back
              </button>
              <span className={styles.stepLabel}>Join group · 1 of 2</span>
            </header>

            <form
              className={styles.formScreen}
              onSubmit={(event) => {
                event.preventDefault();

                if (!joinPreviewVisible) {
                  showJoinPreview();
                  return;
                }

                beginIdentity("join");
              }}
            >
              <div>
                <p className={styles.eyebrow}>Private invite</p>
                <h1>Join your group.</h1>
                <p className={styles.formIntro}>
                  Paste the invite link or short code a friend sent you.
                </p>
              </div>

              <label className={styles.field}>
                <span>Invite link or code</span>
                <input
                  value={inviteCode}
                  onChange={(event) => {
                    setInviteCode(event.target.value);
                    setJoinPreviewVisible(false);
                    setCurrentGroupId(null);
                    setActiveGroup(null);
                  }}
                  placeholder="quorum.app/join/…"
                  aria-describedby="join-helper"
                  autoFocus={!deepLinked}
                />
              </label>

              {joinPreviewVisible && (
                <section
                  className={styles.groupPreview}
                  aria-label={`${activeGroupName} group preview`}
                  style={{
                    background: savedGroupVibe?.gradient ?? "#f2ecdc",
                    color: savedGroupVibe?.ink ?? "#161511",
                  }}
                >
                  <ShaderCardBackdrop
                    vibe={savedGroupVibe}
                    reducedMotion={reducedMotion}
                  />
                  <div className={styles.cardContent}>
                    <div>
                      <span>Group found</span>
                      <span>{activeGroup?.memberCount ?? 0} members</span>
                    </div>
                    <h2>{activeGroupName}</h2>
                    <p>
                      {savedGroupVibe?.name ?? defaultVibe.name} · planning now
                    </p>
                  </div>
                </section>
              )}

              <button
                className={styles.greenAction}
                type="submit"
                disabled={!inviteCode.trim()}
              >
                {joinPreviewVisible ? "Choose your identity" : "Preview group"}
              </button>

              <p className={styles.actionNote} id="join-helper">
                You’ll choose a private group identity before joining.
              </p>
            </form>
          </div>
        )}

        {screen === "identity" && (
          <div className={styles.screen} key={`identity-${entryPath}`}>
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label={`Back to ${
                  entryPath === "create" ? "group details" : "invite preview"
                }`}
              >
                Back
              </button>
              <span className={styles.stepLabel}>
                {entryPath === "create" ? "New group" : "Join group"} · 2 of 2
              </span>
            </header>

            <form
              className={styles.identityScreen}
              onSubmit={(event) => {
                event.preventDefault();
                completeIdentity();
              }}
            >
              <div>
                <p className={styles.eyebrow}>Only for this group</p>
                <h1>Choose your character.</h1>
                <p className={styles.formIntro}>
                  This is how friends will know you in this group. It stays
                  separate from your private answers.
                </p>
              </div>

              <fieldset className={styles.characterField}>
                <legend>Pick one</legend>
                <div className={styles.characterGrid}>
                  {characterOptions.map((option) => {
                    const CharacterIcon = option.Icon;
                    const taken = claimedCharacters.has(option.id);
                    const selected = selectedCharacter === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.characterOption}
                        aria-pressed={selected}
                        disabled={taken}
                        onClick={() => {
                          setSelectedCharacter(option.id);
                          setIdentityError(null);
                        }}
                      >
                        <span style={{ background: option.surface }}>
                          <CharacterIcon
                            size={27}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </span>
                        <span>
                          {taken ? `${option.name} · Taken` : option.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <section
                className={styles.aliasCard}
                aria-label="Your group nickname"
                aria-describedby={identityError ? "identity-error" : undefined}
                style={{
                  background: savedGroupVibe?.gradient ?? "#f2ecdc",
                  color: savedGroupVibe?.ink ?? "#161511",
                }}
              >
                <ShaderCardBackdrop
                  vibe={savedGroupVibe}
                  reducedMotion={reducedMotion}
                />
                <div className={styles.aliasCardContent}>
                  <div>
                    <span>Your nickname</span>
                    <strong aria-live="polite">
                      {groupAlias || "No nicknames left"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className={styles.shuffleAlias}
                    onClick={shuffleAlias}
                    aria-label="Generate another group nickname"
                    disabled={availableAliases.length < 2}
                  >
                    <ArrowsClockwise
                      size={18}
                      weight="bold"
                      aria-hidden="true"
                    />
                    Try another
                  </button>
                </div>
              </section>

              {identityError && (
                <p
                  className={styles.identityError}
                  id="identity-error"
                  role="alert"
                >
                  {identityError}
                </p>
              )}

              <button
                className={styles.greenAction}
                type="submit"
                disabled={!groupAlias}
                aria-describedby={identityError ? "identity-error" : undefined}
              >
                {entryPath === "create" ? "Create & invite" : "Join group"}
              </button>
            </form>
          </div>
        )}

        {screen === "group" && (
          <div className={styles.screen} key={`group-${activeGroup?.id}`}>
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to Quorum entry"
              >
                Groups
              </button>
              <span className={styles.stepLabel}>
                {activeGroup?.phase === "booked" ? "Trip confirmed" : "Shared group"}
              </span>
            </header>

            <div className={styles.groupRoom}>
              <section
                className={styles.groupHero}
                style={{
                  background: savedGroupVibe?.gradient ?? "#f2ecdc",
                  color: savedGroupVibe?.ink ?? "#161511",
                }}
              >
                <ShaderCardBackdrop
                  vibe={savedGroupVibe}
                  reducedMotion={reducedMotion}
                />
                <div className={styles.groupHeroContent}>
                  <div className={styles.identityChip}>
                    <span
                      style={{ background: selectedCharacterOption.surface }}
                    >
                      <SelectedCharacterIcon
                        size={20}
                        weight="bold"
                        aria-hidden="true"
                      />
                    </span>
                    <span>{displayedNickname}</span>
                  </div>
                  <div>
                    <p>
                      {activeGroup?.phase === "booked"
                        ? "Consensus complete"
                        : savedGroupVibe?.name ?? "Quorum group"}
                    </p>
                    <h1>{activeGroupName}</h1>
                    <p>
                      {activeGroup?.memberCount ?? 0}{" "}
                      {(activeGroup?.memberCount ?? 0) === 1 ? "member" : "members"}
                      {activeGroup?.phase === "collecting"
                        ? ` · ${groupOptions.length} ${groupOptions.length === 1 ? "option" : "options"}`
                        : " · planning together"}
                    </p>
                  </div>
                </div>
              </section>

              <ol className={styles.phaseTracker} aria-label="Group progress">
                {phaseSteps.map((step, index) => (
                  <li
                    key={step.id}
                    className={
                      index < currentPhaseIndex
                        ? styles.phaseComplete
                        : index === currentPhaseIndex
                          ? styles.phaseCurrent
                          : ""
                    }
                    aria-current={index === currentPhaseIndex ? "step" : undefined}
                  >
                    <span>{index < currentPhaseIndex ? "✓" : index + 1}</span>
                    <small>{step.label}</small>
                  </li>
                ))}
              </ol>

              {activeGroup?.members && (
                <section className={styles.rosterStrip} aria-label="Group members">
                  <div>
                    <p className={styles.eyebrow}>The group</p>
                    <strong>{activeGroup.memberCount} joined</strong>
                  </div>
                  <div className={styles.rosterFaces}>
                    {activeGroup.members.map((member) => {
                      const character =
                        characterOptions.find(
                          (option) => option.id === member.characterId,
                        ) ?? characterOptions[0];
                      const MemberIcon = character.Icon;
                      return (
                        <span
                          key={member.id}
                          title={`${member.nickname}${member.isCreator ? " · creator" : ""}`}
                          style={{ background: character.surface }}
                        >
                          <MemberIcon size={18} weight="bold" aria-hidden="true" />
                        </span>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeGroup?.phase === "collecting" && (
                <section className={styles.planSection}>
                  <div className={styles.planHeading}>
                    <div>
                      <p className={styles.eyebrow}>Collect options</p>
                      <h2>
                        {groupOptions.length > 0
                          ? "Build the shortlist."
                          : "Start with a real option."}
                      </h2>
                    </div>
                    <span>
                      {groupOptions.length}/{maxActiveOptions}
                    </span>
                  </div>

                  {groupOptions.length === 0 ? (
                    <div className={styles.emptyPlan}>
                      <Link size={24} weight="bold" aria-hidden="true" />
                      <div>
                        <strong>Paste any travel link</strong>
                        <p>
                          Add the real total now. Private affordability begins
                          only when everyone is here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.optionList}>
                      {groupOptions.map((option) => {
                      const ownsOption =
                        option.contributorNickname === currentMemberNickname;

                      return (
                        <article className={styles.optionRow} key={option.id}>
                          <button
                            type="button"
                            className={styles.optionRowMain}
                            onClick={() => previewSavedOption(option)}
                            aria-label={`View ${option.title}`}
                          >
                            <span className={styles.optionThumbnail}>
                              {option.imageUrl ? (
                                <img src={option.imageUrl} alt="" />
                              ) : (
                                <Link
                                  size={20}
                                  weight="bold"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                            <span className={styles.optionRowCopy}>
                              <span>
                                {categoryLabel(option.category)} ·{" "}
                                {option.provider}
                              </span>
                              <strong>{option.title}</strong>
                              <span>
                                {currency(getPerPerson(option))} each ·{" "}
                                added by {option.contributorNickname}
                              </span>
                            </span>
                          </button>
                          {(ownsOption || isCreator) && (
                            <span className={styles.optionControls}>
                              {ownsOption && (
                                <button
                                  type="button"
                                  className={styles.iconAction}
                                  onClick={() => editOption(option)}
                                  aria-label={`Edit ${option.title}`}
                                >
                                  <PencilSimple
                                    size={17}
                                    weight="bold"
                                    aria-hidden="true"
                                  />
                                </button>
                              )}
                              {isCreator && (
                                <button
                                  type="button"
                                  className={`${styles.iconAction} ${
                                    archivePendingId === option.id
                                      ? styles.archiveConfirm
                                      : ""
                                  }`}
                                  onClick={() => archiveOption(option.id)}
                                  aria-label={
                                    archivePendingId === option.id
                                      ? `Confirm archive ${option.title}`
                                      : `Archive ${option.title}`
                                  }
                                >
                                  <Trash
                                    size={17}
                                    weight="bold"
                                    aria-hidden="true"
                                  />
                                </button>
                              )}
                            </span>
                          )}
                        </article>
                      );
                      })}
                    </div>
                  )}

                  <button
                    className={styles.greenAction}
                    type="button"
                    onClick={startAddingOption}
                    disabled={groupOptions.length >= maxActiveOptions || sharedBusy}
                  >
                    <Plus size={20} weight="bold" aria-hidden="true" />
                    {groupOptions.length >= maxActiveOptions
                      ? "Option limit reached"
                      : "Add an option"}
                  </button>

                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={copyInviteLink}
                  >
                    {copied ? (
                      <Check size={18} weight="bold" aria-hidden="true" />
                    ) : (
                      <Copy size={18} weight="bold" aria-hidden="true" />
                    )}
                    {copied ? "Invite link copied" : "Copy invite link"}
                  </button>

                  {isCreator && (
                    <div className={styles.phaseActionCard}>
                      <div>
                        <p className={styles.eyebrow}>Ready for the next step?</p>
                        <h3>Lock the room and check affordability.</h3>
                        <p>
                          This freezes members, dates, and prices. Everyone answers
                          privately before any favorite is chosen.
                        </p>
                      </div>
                      <button
                        className={styles.darkAction}
                        type="button"
                        onClick={startPrivateReview}
                        disabled={groupOptions.length === 0 || sharedBusy}
                      >
                        Everyone’s here — start private review
                      </button>
                    </div>
                  )}

                  <p className={styles.actionNote} aria-live="polite">
                    {copied
                      ? "Invite copied. Open it on another device to join this live group."
                      : isCreator
                        ? "Only you can start review. After that, the roster and option details lock."
                        : "Anyone can add an option until the creator starts private review."}
                  </p>
                </section>
              )}

              {activeGroup?.phase === "affordability" && (
                <section className={styles.phasePanel}>
                  <div className={styles.phasePanelIcon}>
                    <LockSimple size={24} weight="fill" aria-hidden="true" />
                  </div>
                  <p className={styles.eyebrow}>Private affordability</p>
                  <h2>
                    {myUnreviewedCount > 0
                      ? `${myUnreviewedCount} ${myUnreviewedCount === 1 ? "option" : "options"} left for you.`
                      : "Your answers are in."}
                  </h2>
                  <p>
                    Nobody sees individual answers. When everyone finishes,
                    options that work for the whole group move forward.
                  </p>
                  <div className={styles.anonymousProgress}>
                    <span
                      style={{
                        width: `${((sharedSnapshot?.progress?.affordabilityFinished ?? 0) / Math.max(sharedSnapshot?.progress?.affordabilityTotal ?? 1, 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {sharedSnapshot?.progress?.affordabilityFinished ?? 0} of{" "}
                    {sharedSnapshot?.progress?.affordabilityTotal ?? activeGroup.memberCount}{" "}
                    finished
                  </strong>
                  {myUnreviewedCount > 0 && (
                    <button
                      className={styles.greenAction}
                      type="button"
                      onClick={continuePrivateReview}
                    >
                      Continue my private review
                    </button>
                  )}
                </section>
              )}

              {activeGroup?.phase === "needs_options" && (
                <section className={styles.phasePanel}>
                  <div className={styles.phasePanelIcon}>
                    <Link size={24} weight="bold" aria-hidden="true" />
                  </div>
                  <p className={styles.eyebrow}>No match yet</p>
                  <h2>None of these options worked for everyone.</h2>
                  <p>
                    No answers or blockers are revealed. Add lower-cost options
                    and try another private round.
                  </p>
                  {isCreator && (
                    <button
                      className={styles.greenAction}
                      type="button"
                      onClick={reopenCollection}
                      disabled={sharedBusy}
                    >
                      Reopen option collection
                    </button>
                  )}
                </section>
              )}

              {activeGroup?.phase === "favorite" && (
                <section className={styles.phasePanel}>
                  <div className={styles.phasePanelIcon}>
                    <Sparkle size={24} weight="fill" aria-hidden="true" />
                  </div>
                  <p className={styles.eyebrow}>Private favorite</p>
                  <h2>Which viable option would you choose?</h2>
                  <p>
                    Everyone can reconsider. Quorum moves on only when the whole
                    group independently lands on the same option.
                  </p>
                  <div className={styles.favoriteGrid}>
                    {groupOptions.map((option) => (
                      <label key={option.id}>
                        <input
                          type="radio"
                          name="favorite"
                          value={option.id}
                          checked={favoriteChoice === option.id}
                          onChange={() => setFavoriteChoice(option.id)}
                        />
                        <span>
                          <small>{option.provider}</small>
                          <strong>{option.title}</strong>
                          <em>{currency(getPerPerson(option))} each</em>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    className={styles.greenAction}
                    type="button"
                    onClick={chooseFavorite}
                    disabled={!favoriteChoice || sharedBusy}
                  >
                    Choose as my favorite
                  </button>
                  <p className={styles.quietStatus} aria-live="polite">
                    {(sharedSnapshot?.progress?.favoriteSubmitted ?? 0) ===
                      (sharedSnapshot?.progress?.favoriteTotal ?? activeGroup.memberCount) &&
                    !sharedSnapshot?.progress?.favoriteAligned
                      ? "No single pick yet — you can reconsider your choice."
                      : `${sharedSnapshot?.progress?.favoriteSubmitted ?? 0} of ${sharedSnapshot?.progress?.favoriteTotal ?? activeGroup.memberCount} choices submitted.`}
                  </p>
                </section>
              )}

              {activeGroup?.phase === "authorizing" && selectedConsensusOption && (
                <section className={styles.phasePanel}>
                  <div className={styles.phasePanelIcon}>
                    <Check size={24} weight="bold" aria-hidden="true" />
                  </div>
                  <p className={styles.eyebrow}>Consensus reached</p>
                  <h2>Approve your exact share.</h2>
                  <p>
                    Choosing a favorite did not authorize a charge. Review the
                    locked total before approving this simulated payment.
                  </p>
                  <article className={styles.authorizationCard}>
                    <small>{selectedConsensusOption.provider}</small>
                    <h3>{selectedConsensusOption.title}</h3>
                    <p>{selectedConsensusOption.dates}</p>
                    <div>
                      <span>Your exact share</span>
                      <strong>{currency((myShare ?? 0) / 100)}</strong>
                    </div>
                    <footer>
                      <span>Checking •• 4821</span>
                      <span>{currency(selectedConsensusOption.allInTotal)} total</span>
                    </footer>
                  </article>
                  <button
                    className={styles.greenAction}
                    type="button"
                    onClick={approveShare}
                    disabled={hasApproved || sharedBusy}
                  >
                    {hasApproved ? "My share is approved" : "Approve my share"}
                  </button>
                  <p className={styles.quietStatus} aria-live="polite">
                    {sharedSnapshot?.progress?.paymentApproved ?? 0} of{" "}
                    {sharedSnapshot?.progress?.paymentTotal ?? activeGroup.memberCount}{" "}
                    shares approved.
                  </p>
                </section>
              )}

              {activeGroup?.phase === "booked" && selectedConsensusOption && (
                <section className={styles.bookingPanel}>
                  {bookingProcessing ? (
                    <div className={styles.bookingProcessing} role="status">
                      <span />
                      <p>Simulating secure booking…</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.bookingMark}>
                        <Check size={30} weight="bold" aria-hidden="true" />
                      </div>
                      <p className={styles.eyebrow}>Simulated booking complete</p>
                      <h2>Booked for everyone.</h2>
                      <p>
                        The prototype has carried one shared decision all the way
                        through explicit payment approval.
                      </p>
                      <article className={styles.receiptCard}>
                        <small>{selectedConsensusOption.provider}</small>
                        <h3>{selectedConsensusOption.title}</h3>
                        <p>{selectedConsensusOption.dates}</p>
                        <dl>
                          <div>
                            <dt>Confirmation</dt>
                            <dd>{activeGroup.confirmationNumber}</dd>
                          </div>
                          <div>
                            <dt>Total</dt>
                            <dd>{currency(selectedConsensusOption.allInTotal)}</dd>
                          </div>
                          <div>
                            <dt>Your mock charge</dt>
                            <dd>{currency((myShare ?? 0) / 100)}</dd>
                          </div>
                        </dl>
                        <a
                          href={selectedConsensusOption.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open original provider link
                        </a>
                      </article>
                      <button className={styles.secondaryAction} type="button">
                        View mock receipt
                      </button>
                    </>
                  )}
                </section>
              )}

              {sharedError && (
                <p className={styles.sharedError} role="alert">
                  {sharedError}
                </p>
              )}
            </div>
          </div>
        )}

        {screen === "add-option" && (
          <div className={styles.screen} key="add-option">
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to group"
              >
                Back
              </button>
              <span className={styles.stepLabel}>Add option · 1 of 2</span>
            </header>

            <form
              className={styles.optionScreen}
              onSubmit={(event) => {
                event.preventDefault();
                importOption();
              }}
            >
              <div>
                <p className={styles.eyebrow}>Bring the real thing</p>
                <h1>Paste the option.</h1>
                <p className={styles.formIntro}>
                  Airbnb, hotel, flight, activity—Quorum will turn the link
                  into a clean group decision.
                </p>
              </div>

              <label className={styles.linkField}>
                <span className={styles.srOnly}>Travel option link</span>
                <Link size={21} weight="bold" aria-hidden="true" />
                <input
                  type="url"
                  inputMode="url"
                  value={optionUrl}
                  onChange={(event) => {
                    setOptionUrl(event.target.value);
                    setOptionImportError(null);
                    if (event.target.value !== unfurlSourceUrl) {
                      setUnfurlStatus("idle");
                    }
                  }}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text").trim();
                    if (!parseImportedOption(pasted)) return;
                    event.preventDefault();
                    setOptionUrl(pasted);
                    void requestUnfurl(pasted);
                  }}
                  placeholder="https://airbnb.com/rooms/…"
                  autoFocus
                  aria-invalid={Boolean(optionImportError)}
                  aria-describedby={
                    optionImportError ? "option-import-error" : "source-hint"
                  }
                />
              </label>

              {optionImportError ? (
                <p
                  className={styles.identityError}
                  id="option-import-error"
                  role="alert"
                >
                  {optionImportError}
                </p>
              ) : (
                <p className={styles.sourceHint} id="source-hint">
                  Works with Airbnb, Booking.com, Vrbo, Expedia, and other
                  public links.
                </p>
              )}

              {unfurlStatus === "idle" ? (
                <div className={styles.importPromise}>
                  <Sparkle size={22} weight="fill" aria-hidden="true" />
                  <div>
                    <strong>The link identifies the option.</strong>
                    <p>
                      You’ll confirm the real total before anyone reviews it.
                    </p>
                  </div>
                </div>
              ) : unfurlStatus === "loading" ? (
                <section
                  className={`${styles.importCard} ${styles.previewMini} ${styles.previewSkeleton}`}
                  aria-label="Loading listing preview"
                  aria-busy="true"
                >
                  <span className={styles.skeletonImage} />
                  <div className={styles.skeletonCopy}>
                    <span />
                    <span />
                    <span />
                  </div>
                </section>
              ) : (
                <button
                  className={`${styles.importCard} ${styles.previewMini} ${styles.previewTrigger}`}
                  aria-label="Listing preview"
                  type="button"
                  onClick={() => setPreviewSheetOpen(true)}
                >
                  {optionDraft.imageUrl && !previewImageFailed ? (
                    <img
                      src={optionDraft.imageUrl}
                      alt=""
                      onError={() => setPreviewImageFailed(true)}
                    />
                  ) : (
                    <div className={styles.neutralPreview} aria-hidden="true">
                      <img src="/vegas-weekend-cover.png" alt="" />
                      <Link size={24} weight="bold" />
                    </div>
                  )}
                  <div className={styles.previewMiniCopy}>
                    <div>
                      <span>{optionDraft.sourceType}</span>
                      <span>Tap to preview</span>
                    </div>
                    <h2>{optionDraft.title}</h2>
                    <p>
                      {unfurlStatus === "fallback"
                        ? "Couldn’t preview this link · enter details manually"
                        : "Preview ready"}
                    </p>
                  </div>
                </button>
              )}

              <button
                className={styles.greenAction}
                type="submit"
                disabled={!optionUrl.trim()}
              >
                Build preview
              </button>
            </form>
          </div>
        )}

        {screen === "confirm-option" && (
          <div className={styles.screen} key="confirm-option">
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label={
                  editingOptionId
                    ? "Back to group"
                    : "Back to travel option link"
                }
              >
                Back
              </button>
              <span className={styles.stepLabel}>
                {editingOptionId ? "Edit option" : "Add option · 2 of 2"}
              </span>
            </header>

            <form
              className={styles.confirmScreen}
              onSubmit={(event) => {
                event.preventDefault();
                saveOptionForReview();
              }}
            >
              {unfurlStatus === "loading" ? (
                <section
                  className={`${styles.importCard} ${styles.previewSkeleton}`}
                  aria-label="Loading listing preview"
                  aria-busy="true"
                >
                  <span className={styles.skeletonImage} />
                  <div className={styles.skeletonCopy}>
                    <span />
                    <span />
                    <span />
                  </div>
                </section>
              ) : (
                <section className={styles.importCard}>
                  {optionDraft.imageUrl && !previewImageFailed ? (
                    <img
                      src={optionDraft.imageUrl}
                      alt=""
                      onError={() => setPreviewImageFailed(true)}
                    />
                  ) : (
                    <div className={styles.neutralPreview} aria-hidden="true">
                      <img src="/vegas-weekend-cover.png" alt="" />
                      <Link size={28} weight="bold" />
                    </div>
                  )}
                  <div className={styles.importCardCopy}>
                    <div>
                      <span>{optionDraft.sourceType}</span>
                      <a
                        href={optionDraft.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open link
                      </a>
                    </div>
                    <label>
                      <span className={styles.srOnly}>Option title</span>
                      <input
                        value={optionDraft.title}
                        onChange={(event) =>
                          setOptionDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Name this option"
                        maxLength={64}
                      />
                    </label>
                  </div>
                </section>
              )}

              {unfurlStatus === "fallback" && (
                <p className={styles.previewFallbackNote}>
                  Couldn’t preview this link. The title, dates, and price stay
                  editable.
                </p>
              )}

              <fieldset className={styles.categoryPicker}>
                <legend>What is it?</legend>
                {(["stay", "travel", "activity"] as const).map((category) => {
                  const CategoryIcon =
                    category === "stay"
                      ? HouseLine
                      : category === "travel"
                        ? AirplaneTilt
                        : Sparkle;

                  return (
                    <label key={category}>
                      <input
                        type="radio"
                        name="option-category"
                        value={category}
                        checked={optionDraft.category === category}
                        onChange={() =>
                          setOptionDraft((current) => ({
                            ...current,
                            category,
                          }))
                        }
                      />
                      <CategoryIcon
                        size={17}
                        weight="bold"
                        aria-hidden="true"
                      />
                      {categoryLabel(category)}
                    </label>
                  );
                })}
              </fieldset>

              <div className={styles.confirmFields}>
                <label>
                  <span>
                    <CalendarBlank size={16} weight="bold" aria-hidden="true" />
                    Dates
                  </span>
                  <input
                    value={optionDraft.dates}
                    onChange={(event) =>
                      setOptionDraft((current) => ({
                        ...current,
                        dates: event.target.value,
                      }))
                    }
                    placeholder="Oct 10–13"
                  />
                </label>

                <div className={styles.readOnlyField}>
                  <span>
                    <UsersThree size={16} weight="bold" aria-hidden="true" />
                    Sharing
                  </span>
                  <strong>
                    {draftParticipants}{" "}
                    {draftParticipants === 1 ? "person" : "people"}
                  </strong>
                </div>
              </div>

              <label className={styles.totalField}>
                <span>Total including mandatory fees</span>
                <span className={styles.moneyInput}>
                  <span aria-hidden="true">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    value={optionDraft.allInTotal}
                    onChange={(event) =>
                      setOptionDraft((current) => ({
                        ...current,
                        allInTotal: event.target.value,
                      }))
                    }
                    placeholder="1860"
                  />
                </span>
              </label>

              <section className={styles.shareCalculation} aria-live="polite">
                <div>
                  <span>Your current share</span>
                  <strong>{draftShare > 0 ? currency(draftShare) : "—"}</strong>
                </div>
                <p>
                  {draftShare > 0
                    ? `Each if ${draftParticipants} ${
                        draftParticipants === 1 ? "person is" : "people are"
                      } sharing.`
                    : "Add the total to calculate everyone’s share."}
                </p>
              </section>

              <details
                className={styles.costDetails}
                open={costDetailsOpen}
                onToggle={(event) =>
                  setCostDetailsOpen(event.currentTarget.open)
                }
              >
                <summary>Optional cost breakdown</summary>
                <div>
                  {[
                    ["Base price", "basePrice"],
                    ["Fees", "fees"],
                    ["Taxes", "taxes"],
                  ].map(([label, key]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <span className={styles.smallMoneyInput}>
                        <span aria-hidden="true">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={optionDraft[key as keyof OptionDraft] ?? ""}
                          onChange={(event) =>
                            setOptionDraft((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </details>

              <p className={styles.checkedNote}>
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                You’ll confirm this price when you add it for private review.
              </p>

              <button
                className={styles.greenAction}
                type="submit"
                disabled={!optionDraftValid}
              >
                {editingOptionId
                  ? "Save & restart private check"
                  : "Add for private review"}
              </button>
            </form>
          </div>
        )}

        {screen === "comfort" && activeOption && (
          <div className={styles.screen} key={`comfort-${activeOption.id}`}>
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to group"
              >
                Back
              </button>
              <span className={styles.stepLabel}>
                Private review ·{" "}
                {Math.max(
                  groupOptions.findIndex(
                    (option) => option.id === activeOption.id,
                  ) + 1,
                  1,
                )}{" "}
                of {groupOptions.length}
              </span>
            </header>

            <form
              className={styles.comfortScreen}
              onSubmit={(event) => {
                event.preventDefault();
                saveComfortResponse();
              }}
            >
              <div className={styles.privacyPromise}>
                <LockSimple size={18} weight="fill" aria-hidden="true" />
                <p>
                  <strong>Only you see this.</strong> The group only sees
                  options that work.
                </p>
              </div>

              <section className={styles.comfortOptionCard}>
                {activeOption.imageUrl && (
                  <img src={activeOption.imageUrl} alt="" />
                )}
                <div>
                  <span>
                    {activeOption.provider} ·{" "}
                    {categoryLabel(activeOption.category)}
                  </span>
                  <h2>{activeOption.title}</h2>
                  <p>{activeOption.dates}</p>
                  <div>
                    <strong>{currency(getPerPerson(activeOption))} each</strong>
                    <span>
                      {currency(activeOption.allInTotal)} total ·{" "}
                      {activeOption.participantCount} sharing
                    </span>
                  </div>
                  <small className={styles.priceStamp}>
                    <CheckCircle size={13} weight="fill" aria-hidden="true" />
                    Price checked {checkedTimestamp(activeOption.checkedAt)}
                  </small>
                </div>
              </section>

              <div className={styles.comfortQuestion}>
                <p className={styles.eyebrow}>Your private call</p>
                <h1>
                  How would {currency(getPerPerson(activeOption))} each feel?
                </h1>
              </div>

              <fieldset className={styles.comfortChoices}>
                <legend className={styles.srOnly}>
                  Choose how this price feels
                </legend>
                {mandatoryComfortOptions.map((choice) => (
                  <label key={choice.value}>
                    <input
                      type="radio"
                      name="comfort"
                      value={choice.value}
                      checked={comfortChoice === choice.value}
                      onChange={() => setComfortChoice(choice.value)}
                    />
                    <span>
                      <strong>{choice.label}</strong>
                      <small>{choice.helper}</small>
                    </span>
                    <Check size={18} weight="bold" aria-hidden="true" />
                  </label>
                ))}
              </fieldset>

              <button
                className={styles.greenAction}
                type="submit"
                disabled={!comfortChoice}
              >
                <LockSimple size={18} weight="fill" aria-hidden="true" />
                Save privately
              </button>
            </form>
          </div>
        )}

        {previewSheetOpen && unfurlStatus !== "loading" && (
          <div
            className={styles.previewSheetBackdrop}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setPreviewSheetOpen(false);
              }
            }}
          >
            <section
              className={styles.previewSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="listing-preview-title"
            >
              <div className={styles.previewSheetHandle} aria-hidden="true" />
              <header>
                <span>{optionDraft.sourceType}</span>
                <button
                  type="button"
                  onClick={() => setPreviewSheetOpen(false)}
                  aria-label="Close listing preview"
                  autoFocus
                >
                  <X size={19} weight="bold" aria-hidden="true" />
                </button>
              </header>

              {optionDraft.officialEmbedHtml ? (
                <iframe
                  className={styles.officialEmbed}
                  title={`${optionDraft.provider} official listing preview`}
                  srcDoc={optionDraft.officialEmbedHtml}
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                />
              ) : optionDraft.imageUrl && !previewImageFailed ? (
                <img
                  className={styles.previewSheetImage}
                  src={optionDraft.imageUrl}
                  alt=""
                  onError={() => setPreviewImageFailed(true)}
                />
              ) : (
                <div
                  className={`${styles.neutralPreview} ${styles.previewSheetImage}`}
                  aria-hidden="true"
                >
                  <img src="/vegas-weekend-cover.png" alt="" />
                  <Link size={32} weight="bold" />
                </div>
              )}

              <div className={styles.previewSheetBody}>
                <div>
                  <h2 id="listing-preview-title">{optionDraft.title}</h2>
                  <p>
                    {optionDraft.description ??
                      "The source did not provide a description. You can still confirm the details manually."}
                  </p>
                </div>

                <dl>
                  <div>
                    <dt>Dates</dt>
                    <dd>{optionDraft.dates || "Add dates"}</dd>
                  </div>
                  <div>
                    <dt>Group</dt>
                    <dd>
                      {draftParticipants}{" "}
                      {draftParticipants === 1 ? "person" : "people"}
                    </dd>
                  </div>
                  {optionDraft.sourceGuestCount && (
                    <div>
                      <dt>Listing</dt>
                      <dd>{optionDraft.sourceGuestCount} guests</dd>
                    </div>
                  )}
                </dl>

                <section className={styles.previewSheetShare}>
                  <span>Current share</span>
                  <strong>{draftShare > 0 ? currency(draftShare) : "—"}</strong>
                  <p>
                    {draftShare > 0
                      ? `Based on ${draftParticipants} current group ${
                          draftParticipants === 1 ? "member" : "members"
                        }.`
                      : "Add the human-confirmed total on the next step."}
                  </p>
                </section>

                <a
                  className={styles.previewSheetLink}
                  href={optionDraft.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original link
                </a>
              </div>
            </section>
          </div>
        )}
          </section>
        </div>
      </div>
    </main>
  );
}
