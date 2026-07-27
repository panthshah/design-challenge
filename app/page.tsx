"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type GsapTimeline = {
  to: (
    target: Element,
    vars: Record<string, unknown>,
    position?: string,
  ) => GsapTimeline;
  kill: () => void;
};

type GsapRuntime = {
  registerPlugin: (plugin: unknown) => void;
  timeline: (options?: Record<string, unknown>) => GsapTimeline;
};

type GsapWindow = Window & {
  gsap?: GsapRuntime;
  ScrambleTextPlugin?: unknown;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (value: number) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

type StorySlide = {
  id: string;
  title: string;
  description: ReactNode;
  intro?: boolean;
};

const STORY_SLIDES: StorySlide[] = [
  {
    id: "intro",
    intro: true,
    title: "hey, i’m panth.",
    description: (
      <>
        <p>product designer at samsung by day.</p>
        <p>i build things at 1am by choice.</p>
        <p>
          this is how five fintech ideas became one working product.
        </p>
      </>
    ),
  },
  {
    id: "quorum",
    title: "so, what are we building today?",
    description: (
      <>
        <p>
          i built <strong>quorum</strong>, a private room for group money
          decisions.
        </p>
        <p>
          the prototype starts with six friends planning a san diego trip. they
          find a stay for $1,860.
        </p>
        <p>quorum asks the more useful question: does $310 each work?</p>
      </>
    ),
  },
  {
    id: "problem",
    title: "the awkward part isn’t the math.",
    description: (
      <>
        <p>
          someone drops an airbnb in the group chat. everyone loves the pool.
          then $310 each lands, and one person quietly starts doing the math
          against rent.
        </p>
        <p>
          experian surveyed more than 700 people who had travelled with friends.
          only 1 in 4 groups set a budget upfront. more than half of gen z and
          millennial travellers had argued about money on a trip.{" "}
          <a
            href="https://www.experian.com/blogs/ask-experian/survey-financial-stress-of-traveling-with-friends/"
            target="_blank"
            rel="noreferrer"
          >
            read the survey
          </a>
          .
        </p>
        <p>
          <a
            href="https://www.reddit.com/r/Chennai/comments/w2nlqy"
            target="_blank"
            rel="noreferrer"
          >
            one reddit user
          </a>{" "}
          covered an ₹8,000 dinner, then worried that asking for it back would
          make them look cheap. a{" "}
          <a
            href="https://www.nytimes.com/2025/11/12/podcasts/bankaccountdating.html"
            target="_blank"
            rel="noreferrer"
          >
            new york times modern love story
          </a>{" "}
          opened with the same tension: splitting the bill felt awkward, but
          paying it alone was getting expensive.
        </p>
        <p>the missing piece wasn’t a calculator. it was a safer way to say no.</p>
      </>
    ),
  },
  {
    id: "opportunities",
    title: "five ideas. four honest no’s.",
    description: (
      <>
        <p>
          <strong>quorum.</strong> the discomfort was specific, and i could
          picture the exact moment the product needed to help.
        </p>
        <p>
          <strong>rent almost anything.</strong> i could not get past one boring
          question: would i hand my camera to a stranger? honestly, no.
        </p>
        <p>
          <strong>a personal finance guide.</strong> real problem, crowded
          category, and no sharp enough reason to exist.
        </p>
        <p>
          <strong>finance as a game.</strong> i loved the 3d character more than
          the underlying problem. that felt like a warning.
        </p>
        <p>
          <strong>money for international students.</strong> wiring about
          $9,000 from ahmedabad to boston was personal pain, but the idea kept
          turning into a housing product.
        </p>
      </>
    ),
  },
  {
    id: "decisions",
    title: "once i chose the problem, the interface got quieter.",
    description: (
      <>
        <p>
          <strong>characters and nicknames</strong> make one honest answer feel
          less like a public rejection.
        </p>
        <p>
          <strong>two budget answers</strong>, works for me or too much, remove
          the vague negotiation hiding inside “a stretch.”
        </p>
        <p>
          <strong>url-first options</strong> start with the link people already
          have. the price stays editable because dates, guests, taxes and fees
          change the real cost.
        </p>
        <p>
          <strong>the personal share</strong> turns $1,860 into the number
          someone can answer: $310 each for six people.
        </p>
        <p>
          <strong>separate approval</strong> means choosing a favorite never
          gives quorum permission to charge someone.
        </p>
      </>
    ),
  },
  {
    id: "stack",
    title: "how i actually worked.",
    description: (
      <>
        <p>
          have an idea. get suspicious of it. build the smallest version. use
          it. notice what feels confusing. rewrite it. break something. fix it.
          repeat.
        </p>
        <p>
          figma held the structure. mobbin helped me study invitations, groups
          and shared decisions. chatgpt and claude challenged assumptions and
          copy. codex agents helped build, test and debug the shared state,
          invite flow and deployment.
        </p>
        <p>
          the product runs on next.js, react, typescript, vercel, cloudflare d1
          and gsap.
        </p>
        <p>
          ai made the loop faster. it did not decide which problem mattered or
          when the writing sounded fake.
        </p>
      </>
    ),
  },
  {
    id: "next",
    title: "what i’d do next.",
    description: (
      <>
        <p>
          i’d put quorum in front of three real groups planning real trips. not
          usability-test trips. trips with dates, uneven salaries and one friend
          who always finds the expensive airbnb.
        </p>
        <p>
          i’d watch for two things: does privacy make people more honest? and
          does a binary answer feel freeing, or simply too blunt?
        </p>
        <p>
          if those hold, i’d work next on changed prices, partial participation
          and the moment no option works for everyone.
        </p>
      </>
    ),
  },
];

export default function Home() {
  const [gsapCoreReady, setGsapCoreReady] = useState(false);
  const [scrambleReady, setScrambleReady] = useState(false);
  const sequenceRef = useRef<HTMLElement>(null);
  const macRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLElement>(null);
  const storySequenceRef = useRef<HTMLElement>(null);
  const storyTrackRef = useRef<HTMLDivElement>(null);
  const storyIntroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sequence = sequenceRef.current;
    const mac = macRef.current;
    const prompt = promptRef.current;
    const hero = heroRef.current;
    const challenge = challengeRef.current;

    if (!sequence || !mac || !prompt || !hero || !challenge) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let frame = 0;
    let measureFrame = 0;
    let start = 0;
    let distance = 1;
    let latestScrollY = window.scrollY;

    const render = () => {
      frame = 0;

      const progress = clamp((latestScrollY - start) / distance);
      const accelerated = progress ** 2.2;
      const reveal = smoothstep((progress - 0.58) / 0.34);
      const textFade = 1 - smoothstep((progress - 0.56) / 0.14);

      const currentScale = reducedMotion.matches ? 1 : 1 + accelerated * 7;

      mac.style.transform = `scale(${currentScale})`;
      prompt.style.opacity = String(textFade);
      hero.style.opacity = String(1 - reveal);
      challenge.style.opacity = String(reveal);
    };

    const requestRender = () => {
      latestScrollY = window.scrollY;

      if (!frame) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const measure = () => {
      measureFrame = 0;

      mac.style.transform = "none";

      window.requestAnimationFrame(() => {
        const sequenceRect = sequence.getBoundingClientRect();
        const macRect = mac.getBoundingClientRect();
        const screenRect = prompt.getBoundingClientRect();

        start = sequenceRect.top + window.scrollY;
        distance = Math.max(sequence.offsetHeight - window.innerHeight, 1);

        const originX =
          screenRect.left + screenRect.width / 2 - macRect.left;
        const originY =
          screenRect.top + screenRect.height / 2 - macRect.top;

        mac.style.transformOrigin = `${originX}px ${originY}px`;

        requestRender();
      });
    };

    const requestMeasure = () => {
      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }

      measureFrame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestMeasure);
    reducedMotion.addEventListener("change", requestMeasure);

    requestMeasure();

    return () => {
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestMeasure);
      reducedMotion.removeEventListener("change", requestMeasure);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }
    };
  }, []);

  useEffect(() => {
    const storySequence = storySequenceRef.current;
    const storyTrack = storyTrackRef.current;
    const storyIntro = storyIntroRef.current;

    if (!storySequence || !storyTrack || !storyIntro) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let frame = 0;
    let measureFrame = 0;
    let latestScrollY = window.scrollY;
    let storyStart = 0;
    let storyDistance = 1;
    let storyTravel = 0;
    let storyEnabled = false;
    let viewportHeight = window.innerHeight;

    const render = () => {
      frame = 0;

      if (!storyEnabled) {
        return;
      }

      const storyProgress = clamp(
        (latestScrollY - storyStart) / storyDistance,
      );
      const introProgress = smoothstep(
        (latestScrollY - (storyStart - viewportHeight * 0.62)) /
          (viewportHeight * 0.5),
      );

      storyTrack.style.transform = `translate3d(${
        -storyTravel * storyProgress
      }px, 0, 0)`;
      storyIntro.style.opacity = String(introProgress);
      storyIntro.style.transform = `translate3d(0, ${
        24 * (1 - introProgress)
      }px, 0)`;
    };

    const requestRender = () => {
      latestScrollY = window.scrollY;

      if (!frame) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const measure = () => {
      measureFrame = 0;
      storyTrack.style.transform = "none";
      storySequence.style.height = "";

      window.requestAnimationFrame(() => {
        const storySequenceRect = storySequence.getBoundingClientRect();

        storyStart = storySequenceRect.top + window.scrollY;
        viewportHeight = window.innerHeight;
        storyTravel = Math.max(
          storyTrack.scrollWidth - window.innerWidth,
          0,
        );
        storyEnabled =
          window.innerWidth > 900 &&
          !reducedMotion.matches &&
          storyTravel > 0;
        storyDistance = Math.max(storyTravel, 1);

        if (storyEnabled) {
          storySequence.style.height = `${
            window.innerHeight + storyTravel
          }px`;
          storyTrack.style.willChange = "transform";
          storyIntro.style.willChange = "transform, opacity";
          storyIntro.style.opacity = "0";
          storyIntro.style.transform = "translate3d(0, 24px, 0)";
        } else {
          storyTrack.style.transform = "";
          storyTrack.style.willChange = "";
          storyIntro.style.opacity = "";
          storyIntro.style.transform = "";
          storyIntro.style.willChange = "";
        }

        requestRender();
      });
    };

    const requestMeasure = () => {
      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }

      measureFrame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestMeasure);
    reducedMotion.addEventListener("change", requestMeasure);

    requestMeasure();

    return () => {
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestMeasure);
      reducedMotion.removeEventListener("change", requestMeasure);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }
    };
  }, []);

  useEffect(() => {
    const prompt = promptRef.current;
    const runtime = window as GsapWindow;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (
      !scrambleReady ||
      !prompt ||
      !runtime.gsap ||
      !runtime.ScrambleTextPlugin ||
      reducedMotion.matches
    ) {
      return;
    }

    const lines = prompt.querySelectorAll<HTMLElement>("[data-scramble]");

    if (lines.length !== 2) {
      return;
    }

    runtime.gsap.registerPlugin(runtime.ScrambleTextPlugin);

    const timeline = runtime.gsap.timeline({ delay: 0.18 });
    const scrambleSettings = {
      chars: "01X/<>",
      speed: 0.42,
      revealDelay: 0.08,
      tweenLength: false,
    };

    timeline
      .to(lines[0], {
        duration: 0.9,
        scrambleText: {
          ...scrambleSettings,
          text: "SCROLL DOWN TO ENTER",
        },
        ease: "none",
      })
      .to(
        lines[1],
        {
          duration: 0.85,
          scrambleText: {
            ...scrambleSettings,
            text: "THE DESIGN CHALLENGE",
          },
          ease: "none",
        },
        "-=0.38",
      );

    return () => timeline.kill();
  }, [scrambleReady]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"
        strategy="afterInteractive"
        onReady={() => setGsapCoreReady(true)}
      />

      {gsapCoreReady ? (
        <Script
          src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/ScrambleTextPlugin.min.js"
          strategy="afterInteractive"
          onReady={() => setScrambleReady(true)}
        />
      ) : null}

      <main className="experience">
        <section className="zoom-sequence" ref={sequenceRef}>
          <div className="zoom-stage">
            <section
              className="challenge-reveal"
              id="challenge"
              ref={challengeRef}
              aria-labelledby="challenge-title"
            >
              <h1 className="visually-hidden" id="challenge-title">
                Design challenge
              </h1>
            </section>

            <div className="computer-intro" ref={heroRef}>
              <div className="computer-wrap" ref={macRef}>
                {/* The Vinext image proxy does not serve local assets in preview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="computer-image"
                  src="/retro-computer.png"
                  alt=""
                />

                <p className="screen-prompt" ref={promptRef}>
                  <span data-scramble>Scroll down to enter</span>
                  <span data-scramble>the design challenge</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="story-sequence"
          ref={storySequenceRef}
          aria-labelledby="story-heading"
        >
          <div className="story-stage">
            <div className="story-intro-position">
              <div className="story-intro" ref={storyIntroRef}>
                <div className="story-title-card">
                  <h2 id="story-heading">What are we building today?</h2>
                </div>
                <p className="story-description">
                  Quorum is a private decision room for shared financial
                  choices. It helps groups reach a clear answer without turning
                  money into a referendum on their relationships.
                </p>
              </div>
            </div>

            <div className="story-viewport">
              <div className="story-track" ref={storyTrackRef}>
                {STORY_SLIDES.map((slide) => (
                  <article
                    className={`story-slide ${
                      slide.intro ? "story-slide-intro" : ""
                    }`}
                    key={slide.id}
                  >
                    <div className="slide-copy">
                      <h2>{slide.title}</h2>
                      <div className="slide-description">
                        {slide.description}
                      </div>
                    </div>

                    {slide.intro ? (
                      <div
                        className="intro-photo-stack"
                        aria-label="A few photographs of Panth"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="intro-photo intro-photo-primary"
                          src="/panth-new-york.png"
                          alt="Panth in front of the Manhattan skyline"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="intro-photo"
                          src="/panth-sunset.png"
                          alt="Panth smiling in warm evening light"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="intro-photo"
                          src="/panth-hike.png"
                          alt="Panth standing on a green hillside"
                        />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>

            <Link className="prototype-mode-link" href="/prototype">
              <span>Enter prototype mode</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className="story-outro" aria-hidden="true" />
      </main>
    </>
  );
}
