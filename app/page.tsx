"use client";

import { useEffect, useState } from "react";

type Mode = "story" | "prototype";

const modeCopy: Record<Mode, { label: string; detail: string }> = {
  story: {
    label: "Story",
    detail: "Explore the thinking",
  },
  prototype: {
    label: "Prototype",
    detail: "Experience the product",
  },
};

export default function Home() {
  const [preview, setPreview] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<Mode | null>(null);
  const activeMode = selected ?? preview;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setPreview(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const chooseMode = (mode: Mode) => {
    setPreview(mode);
    setSelected(mode);
  };

  return (
    <main
      className={`entrance${activeMode ? ` entrance--${activeMode}` : ""}${
        selected ? " entrance--open" : ""
      }`}
    >
      <div className="atmosphere" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Quorum home">
          Quorum
        </a>

        {selected && (
          <button
            className="close-button"
            type="button"
            onClick={() => {
              setSelected(null);
              setPreview(null);
            }}
          >
            Close
          </button>
        )}
      </header>

      <section className="threshold" aria-labelledby="entrance-title">
        <div className="title-block">
          <p className="eyebrow">One decision. Two ways in.</p>
          <h1 id="entrance-title">
            Make the money decision
            <br />
            without making it personal.
          </h1>
        </div>

        <div className="portal-stage" aria-hidden="true">
          <div className="portal-glow" />
          <div className="portal-frame">
            <div className="portal-space">
              <span className="destination">
                {selected ? modeCopy[selected].label : ""}
              </span>
            </div>
            <div className="door">
              <div className="door-inset" />
              <span className="door-handle" />
            </div>
          </div>
          <div className="floor-light" />
        </div>

        <nav className="mode-nav" aria-label="Choose an experience">
          {(Object.keys(modeCopy) as Mode[]).map((mode) => (
            <button
              key={mode}
              className={`mode-link${activeMode === mode ? " is-active" : ""}`}
              type="button"
              aria-pressed={selected === mode}
              onPointerEnter={() => !selected && setPreview(mode)}
              onPointerLeave={() => !selected && setPreview(null)}
              onFocus={() => !selected && setPreview(mode)}
              onBlur={() => !selected && setPreview(null)}
              onClick={() => chooseMode(mode)}
            >
              <span className="mode-label">{modeCopy[mode].label}</span>
              <span className="mode-detail">{modeCopy[mode].detail}</span>
            </button>
          ))}
        </nav>
      </section>

      <p className="hint">
        {selected ? "Press Esc to return" : "Choose a way in"}
      </p>
    </main>
  );
}
