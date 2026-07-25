"use client";

import { useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import styles from "./prototype.module.css";

type Screen = "home" | "create" | "share" | "join" | "invite";
type Rgb = readonly [number, number, number];
type VibeDrag = {
  pointerId: number;
  startY: number;
  startPosition: number;
  currentPosition: number;
};

const friends = ["Alex", "Maya", "Jordan"];

const groupVibes = [
  {
    name: "Golden hour",
    gradient: "linear-gradient(135deg, #f7df71 0%, #ef8f62 100%)",
    colors: [
      [255, 239, 167],
      [239, 143, 98],
      [247, 197, 101],
    ] as const,
    ink: "#342014",
    accent: [74, 38, 26] as const,
    accentInk: "#fffbea",
  },
  {
    name: "Poolside",
    gradient: "linear-gradient(135deg, #a8efe0 0%, #6d9ff2 100%)",
    colors: [
      [190, 248, 232],
      [109, 159, 242],
      [126, 218, 224],
    ] as const,
    ink: "#102b35",
    accent: [16, 43, 53] as const,
    accentInk: "#fffbea",
  },
  {
    name: "After dark",
    gradient: "linear-gradient(135deg, #9b83f6 0%, #30265d 100%)",
    colors: [
      [172, 144, 255],
      [48, 38, 93],
      [101, 72, 174],
    ] as const,
    ink: "#fffbea",
    accent: [243, 230, 140] as const,
    accentInk: "#30265d",
  },
  {
    name: "Garden party",
    gradient: "linear-gradient(135deg, #d8ef74 0%, #65ad73 100%)",
    colors: [
      [229, 247, 141],
      [101, 173, 115],
      [176, 218, 111],
    ] as const,
    ink: "#18331d",
    accent: [24, 51, 29] as const,
    accentInk: "#fffbea",
  },
] as const;

function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  ) as unknown as Rgb;
}

function rgb(color: Rgb) {
  return `rgb(${color.join(" ")})`;
}

function getLiveVibe(position: number) {
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const amount = position - lowerIndex;
  const lower = groupVibes[lowerIndex];
  const upper = groupVibes[upperIndex];
  const colors = lower.colors.map((color, index) =>
    mixRgb(color, upper.colors[index], amount),
  );
  const accent = mixRgb(lower.accent, upper.accent, amount);
  const nearest = groupVibes[Math.round(position)];

  return {
    background: [
      `radial-gradient(circle at 18% 12%, ${rgb(colors[0])} 0%, transparent 48%)`,
      `radial-gradient(circle at 84% 76%, ${rgb(colors[1])} 0%, transparent 54%)`,
      `linear-gradient(135deg, ${rgb(colors[2])}, ${rgb(colors[0])})`,
    ].join(", "),
    ink: nearest.ink,
    accent: rgb(accent),
    accentInk: nearest.accentInk,
    name: nearest.name,
  };
}

export default function PrototypeLanding() {
  const searchParams = useSearchParams();
  const deepLinked = searchParams.get("invite") === "vegas";
  const [screen, setScreen] = useState<Screen>(deepLinked ? "invite" : "home");
  const [groupName, setGroupName] = useState("");
  const [groupVibe, setGroupVibe] = useState(groupVibes[0]);
  const [vibePosition, setVibePosition] = useState(0);
  const [vibeDragging, setVibeDragging] = useState(false);
  const vibeDrag = useRef<VibeDrag | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);

  function goBack() {
    if (screen === "share") {
      setScreen("create");
      return;
    }

    setScreen("home");
  }

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}/prototype?invite=vegas`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function toggleFriend(friend: string) {
    setSelectedFriends((current) =>
      current.includes(friend)
        ? current.filter((name) => name !== friend)
        : [...current, friend],
    );
  }

  function snapVibe(position: number) {
    const index = Math.max(
      0,
      Math.min(groupVibes.length - 1, Math.round(position)),
    );

    setVibePosition(index);
    setGroupVibe(groupVibes[index]);
  }

  function handleVibeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = Math.round(vibePosition);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextIndex = Math.min(groupVibes.length - 1, currentIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = groupVibes.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    snapVibe(nextIndex);
  }

  function handleVibePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    vibeDrag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPosition: vibePosition,
      currentPosition: vibePosition,
    };
    setVibeDragging(true);
  }

  function handleVibePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const drag = vibeDrag.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextPosition = Math.max(
      0,
      Math.min(
        groupVibes.length - 1,
        drag.startPosition + (drag.startY - event.clientY) / 56,
      ),
    );

    drag.currentPosition = nextPosition;
    setVibePosition(nextPosition);
  }

  function finishVibeDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = vibeDrag.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    vibeDrag.current = null;
    setVibeDragging(false);
    snapVibe(drag.currentPosition);
  }

  const liveVibe = getLiveVibe(vibePosition);
  const createThemeStyle =
    screen === "create"
      ? ({
          "--vibe-background": liveVibe.background,
          "--vibe-ink": liveVibe.ink,
          "--vibe-accent": liveVibe.accent,
          "--vibe-accent-ink": liveVibe.accentInk,
          "--vibe-thumb-top": `${
            100 - (vibePosition / (groupVibes.length - 1)) * 100
          }%`,
        } as CSSProperties)
      : undefined;

  return (
    <main className={styles.stage}>
      <section
        className={styles.app}
        aria-label="Quorum prototype"
        data-screen={screen}
        data-testid="prototype-screen-one"
        style={createThemeStyle}
      >
        {screen === "home" && (
          <div className={styles.screen} key="home">
            <header className={styles.header}>
              <span className={styles.wordmark}>Quorum</span>
            </header>

            <div className={styles.homeContent}>
              <div>
                <h1>
                  Make plans{" "}
                  <span>that work for everyone.</span>
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
                onClick={() => setScreen("create")}
              >
                Create a group
              </button>
              <button
                className={styles.textAction}
                type="button"
                onClick={() => setScreen("join")}
              >
                Have an invite? <span>Join a group</span>
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
                aria-label="Back to Quorum home"
              >
                Back
              </button>
              <span className={styles.stepLabel}>New group · 1 of 2</span>
            </header>

            <form
              className={styles.formScreen}
              onSubmit={(event) => {
                event.preventDefault();
                setScreen("share");
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
                <div className={styles.orbDock}>
                  <button
                    className={styles.vibePicker}
                    type="button"
                    role="slider"
                    aria-label="Change group vibe"
                    aria-valuemin={0}
                    aria-valuemax={groupVibes.length - 1}
                    aria-valuenow={Math.round(vibePosition)}
                    aria-valuetext={liveVibe.name}
                    data-dragging={vibeDragging || undefined}
                    onPointerDown={handleVibePointerDown}
                    onPointerMove={handleVibePointerMove}
                    onPointerUp={finishVibeDrag}
                    onPointerCancel={finishVibeDrag}
                    onKeyDown={handleVibeKeyDown}
                  >
                    <span className={styles.vibeSpectrum} aria-hidden="true" />
                    <span className={styles.vibeThumb} aria-hidden="true" />
                  </button>
                </div>

                <button
                  className={`${styles.greenAction} ${styles.createAction}`}
                  type="submit"
                  disabled={!groupName.trim()}
                >
                  Create group
                </button>
              </div>
            </form>
          </div>
        )}

        {screen === "share" && (
          <div className={styles.screen} key="share">
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to group details"
              >
                Back
              </button>
              <span className={styles.stepLabel}>Invite friends · 2 of 2</span>
            </header>

            <div className={styles.shareContent}>
              <div
                className={styles.createdBadge}
                style={{
                  backgroundImage: groupVibe.gradient,
                  color: groupVibe.ink,
                }}
              >
                Group ready
              </div>
              <div>
                <p className={styles.eyebrow}>{groupVibe.name}</p>
                <h1>{groupName}</h1>
                <p className={styles.formIntro}>
                  You’re the only one here. Bring in the people making this
                  decision with you.
                </p>
              </div>

              <div className={styles.memberStack} aria-label="Group members">
                <span className={styles.memberYou}>P</span>
                {selectedFriends.map((friend) => (
                  <span key={friend}>{friend.slice(0, 1)}</span>
                ))}
                {Array.from({
                  length: Math.max(0, 3 - selectedFriends.length),
                }).map((_, index) => (
                  <span className={styles.memberEmpty} key={index}>
                    +
                  </span>
                ))}
              </div>

              <div className={styles.inviteActions}>
                <button
                  className={styles.greenAction}
                  type="button"
                  onClick={copyInviteLink}
                >
                  {copied ? "Invite link copied" : "Copy invite link"}
                </button>

                <div className={styles.friendPicker}>
                  <p>Add friends directly</p>
                  {friends.map((friend) => {
                    const selected = selectedFriends.includes(friend);

                    return (
                      <button
                        key={friend}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleFriend(friend)}
                      >
                        <span className={styles.friendInitial}>
                          {friend.slice(0, 1)}
                        </span>
                        <span>{friend}</span>
                        <span>{selected ? "Added" : "Add"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className={styles.actionNote} aria-live="polite">
                {copied
                  ? "Anyone with this private link can request to join."
                  : "Friends can join without revealing their financial limits."}
              </p>
            </div>
          </div>
        )}

        {screen === "join" && (
          <div className={styles.screen} key="join">
            <header className={styles.header}>
              <button
                className={styles.backAction}
                type="button"
                onClick={goBack}
                aria-label="Back to Quorum home"
              >
                Back
              </button>
              <span className={styles.stepLabel}>Private invite</span>
            </header>

            <form
              className={styles.formScreen}
              onSubmit={(event) => {
                event.preventDefault();
                setScreen("invite");
              }}
            >
              <div>
                <p className={styles.eyebrow}>Already invited?</p>
                <h1>Join your group.</h1>
                <p className={styles.formIntro}>
                  Paste the invite link or short code a friend sent you.
                </p>
              </div>

              <label className={styles.field}>
                <span>Invite link or code</span>
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="quorum.app/join/…"
                  autoFocus
                />
              </label>

              <button
                className={styles.greenAction}
                type="submit"
                disabled={!inviteCode.trim()}
              >
                Find group
              </button>

              <p className={styles.actionNote}>
                You’ll see the group details before joining.
              </p>
            </form>
          </div>
        )}

        {screen === "invite" && (
          <div className={styles.inviteScreen} key="invite">
            <div className={styles.scrollArea}>
              <header className={styles.header}>
                {!deepLinked && (
                  <button
                    className={styles.backAction}
                    type="button"
                    onClick={() => setScreen("join")}
                    aria-label="Back to invite code"
                  >
                    Back
                  </button>
                )}
                {deepLinked && <span className={styles.wordmark}>Quorum</span>}
                <span className={styles.inviteLabel}>Private invite</span>
              </header>

              <div className={styles.cover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/vegas-weekend-cover.png"
                  alt="Las Vegas skyline glowing at dusk"
                />
                <span className={styles.tripStatus}>Planning</span>
              </div>

              <div className={styles.content}>
                <p className={styles.eyebrow}>Panth invited you</p>
                <h1 id="invite-title">
                  <span>Vegas</span>
                  <span>Weekend</span>
                </h1>
                <p className={styles.invitation}>
                  Choose the shared parts of a two-night trip with five friends.
                </p>

                <dl className={styles.details}>
                  <div>
                    <dt>When</dt>
                    <dd>Sep 12–14</dd>
                  </div>
                  <div>
                    <dt>From</dt>
                    <dd>San Francisco</dd>
                  </div>
                  <div>
                    <dt>Group</dt>
                    <dd>6 friends</dd>
                  </div>
                </dl>

                <aside className={styles.privacy}>
                  <p className={styles.privacyLabel}>Private by default</p>
                  <p>
                    Your response is private. The group only sees options that
                    work.
                  </p>
                </aside>
              </div>
            </div>

            <div className={styles.actionArea}>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={() => setAccepted(true)}
                aria-pressed={accepted}
              >
                {accepted ? "Ready to review" : "Join Vegas Weekend"}
              </button>
              <p className={styles.actionNote} aria-live="polite">
                {accepted
                  ? "You’re in. Your private review comes next."
                  : "See the plan first. Nothing is shared yet."}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
