"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

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

const STORY_SLIDES = [
  {
    number: "01",
    label: "The tension",
    title: "Money decisions rarely stay about money.",
    body: "A shared purchase can quietly become a test of taste, status, or loyalty. The decision gets harder as the room gets more personal.",
  },
  {
    number: "02",
    label: "The gap",
    title: "Most tools show numbers. They don’t protect the conversation.",
    body: "Spreadsheets optimize for calculation. Group chats optimize for reaction. Neither creates the privacy people need to answer honestly.",
  },
  {
    number: "03",
    label: "The idea",
    title: "Separate the vote from the voice.",
    body: "Quorum lets everyone weigh in privately, then reveals the group’s shared signal—not who pushed for what.",
  },
  {
    number: "04",
    label: "The outcome",
    title: "A clear decision without making it personal.",
    body: "The group leaves with a direction, the reasoning behind it, and the relationships intact.",
  },
] as const;

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
                  <article className="story-slide" key={slide.number}>
                    <div className="slide-meta">
                      <span>{slide.number}</span>
                      <span>{slide.label}</span>
                    </div>

                    <h3>{slide.title}</h3>
                    <p>{slide.body}</p>

                    <footer>Quorum / Design challenge</footer>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="story-outro" aria-hidden="true" />
      </main>
    </>
  );
}
