"use client";

import { useState, useEffect, useRef } from "react";

const LOCATION = "LA";
const GAP = "\u00A0\u00A0";

const FLAP_CHARS = "0123456789/:amp  ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const STEP_MS = 50;
const RANDOM_CYCLES = 12; // random chars before landing (~300ms total)
const FLIP_DURATION_MS = STEP_MS * (RANDOM_CYCLES + 1);

function formatPSTDateTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const dateStr = formatter.format(now);

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const timeStr = timeFormatter.format(now).toLowerCase();

  return `${dateStr}${GAP}${timeStr}${GAP}${LOCATION}`;
}

function getRandomFlapChar(): string {
  return FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
}

function FlapChar({
  oldChar,
  targetChar,
  delayMs,
}: {
  oldChar: string;
  targetChar: string;
  delayMs: number;
}) {
  const [char, setChar] = useState(oldChar);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      let step = 0;
      intervalRef.current = setInterval(() => {
        step++;
        if (step <= RANDOM_CYCLES) {
          setChar(getRandomFlapChar());
        } else {
          setChar(targetChar);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, STEP_MS);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [targetChar, delayMs]);

  return (
    <span className="inline-block font-mono tabular-nums w-[0.6em] text-center align-middle">
      {char}
    </span>
  );
}

export default function TimezonePill() {
  const [display, setDisplay] = useState(() => formatPSTDateTime());
  const [lastChange, setLastChange] = useState<{
    prev: string;
    next: string;
  } | null>(null);
  const prevDisplayRef = useRef(display);

  useEffect(() => {
    const tick = () => {
      const next = formatPSTDateTime();
      const prev = prevDisplayRef.current;

      if (next !== prev) {
        prevDisplayRef.current = next;
        setLastChange({ prev, next });
        setDisplay(next);
      }
    };

    tick();
    const intervalId = setInterval(tick, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Clear lastChange after animations complete so we revert to static spans
  useEffect(() => {
    if (!lastChange) return;
    const { prev, next } = lastChange;
    let changedCount = 0;
    const len = Math.max(prev.length, next.length);
    for (let i = 0; i < len; i++) if (prev[i] !== next[i]) changedCount++;
    const maxDelay = Math.max(0, changedCount - 1) * 30;
    const totalMs = maxDelay + FLIP_DURATION_MS + 100;
    const id = setTimeout(() => setLastChange(null), totalMs);
    return () => clearTimeout(id);
  }, [lastChange]);

  const prev = lastChange?.prev ?? display;
  const next = display;
  const changedOrder = (() => {
    const out: number[] = [];
    const len = Math.max(prev.length, next.length);
    for (let i = 0; i < len; i++) {
      if (prev[i] !== next[i]) out.push(i);
    }
    return out.sort((a, b) => a - b);
  })();
  const changedToDelay = new Map<number, number>();
  changedOrder.forEach((idx, order) => {
    changedToDelay.set(idx, order * 30);
  });

  return (
    <div
      className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-[#d8d8d8] bg-transparent font-mono text-[12px] font-light text-black tracking-tight"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {next.split("").map((char, i) =>
        changedToDelay.has(i) ? (
          <FlapChar
            key={`${i}-${prev[i] ?? ""}-${char}`}
            oldChar={prev[i] ?? " "}
            targetChar={char}
            delayMs={changedToDelay.get(i)!}
          />
        ) : (
          <span
            key={`${i}-${char}`}
            className="inline-block font-mono tabular-nums w-[0.6em] text-center align-middle"
          >
            {char}
          </span>
        )
      )}
    </div>
  );
}
