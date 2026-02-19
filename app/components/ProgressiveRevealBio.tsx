"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

const CHAR_MS = 18;
const INITIAL_DELAY_MS = 100;
const WHEEL_THROTTLE_MS = 800;

function useTypewriter(
  fullLength: number,
  isActive: boolean,
  startDelayMs: number
): number {
  const [visible, setVisible] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setVisible(0);
      return;
    }
    setVisible(0);
    const timeoutId = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setVisible((prev) => {
          if (prev + 1 >= fullLength) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            return fullLength;
          }
          return prev + 1;
        });
      }, CHAR_MS);
    }, startDelayMs);
    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isActive, fullLength, startDelayMs]);

  return visible;
}

type BodySegment =
  | { type: "text"; text: string }
  | { type: "link"; href: string; text: string; external?: boolean }
  | { type: "span"; className: string; text: string };

function renderBodyUpTo(segments: BodySegment[], visibleCount: number): React.ReactNode {
  let remaining = visibleCount;
  const out: React.ReactNode[] = [];
  for (const seg of segments) {
    if (remaining <= 0) break;
    const len = seg.text.length;
    const take = Math.min(len, remaining);
    const show = seg.text.slice(0, take);
    remaining -= take;
    if (seg.type === "text") {
      out.push(show);
    } else if (seg.type === "link") {
      out.push(
        <Link
          key={out.length}
          href={seg.href}
          target={seg.external ? "_blank" : undefined}
          rel={seg.external ? "noopener noreferrer" : undefined}
          className="bio-link"
        >
          {show}
        </Link>
      );
    } else {
      out.push(
        <span key={out.length} className={seg.className}>
          {show}
        </span>
      );
    }
  }
  return <>{out}</>;
}

const SECTIONS = [
  {
    header: "Vincent An",
    bodySegments: [
      { type: "text" as const, text: "0→1 founder building frontier consumer experiences." },
    ],
  },
  {
    header: "Currently",
    bodySegments: [
      { type: "text" as const, text: "I'm the cofounder and CEO of " },
      { type: "link" as const, href: "https://www.stylar.com", text: "Stylar", external: true },
      { type: "text" as const, text: ", an AI-native fashion discovery app." },
    ],
  },
  {
    header: "In the past",
    bodySegments: [
      { type: "text" as const, text: "I've built an augmented fashion studio called " },
      { type: "span" as const, className: "underline underline-offset-2", text: "Sphene" },
      { type: "text" as const, text: "; led design at " },
      { type: "link" as const, href: "https://techcrunch.com/2020/07/23/augmented-reality-startup-mira-announces-10m-more-in-funding-from-sequoia-and-others/", text: "Mira", external: true },
      { type: "text" as const, text: " (" },
      { type: "link" as const, href: "https://www.theverge.com/2023/6/6/23751350/apple-mira-ar-headset-startup", text: "acquired by Apple", external: true },
      { type: "text" as const, text: "); was a venture analyst at " },
      { type: "link" as const, href: "https://www.westlygroup.com", text: "Westly Group", external: true },
      { type: "text" as const, text: "; and graduated from the inaugural class at " },
      { type: "link" as const, href: "https://en.wikipedia.org/wiki/USC_Jimmy_Iovine_and_Andre_Young_Academy", text: "USC's Jimmy Iovine & Dr. Dre Academy", external: true },
      { type: "text" as const, text: "." },
    ],
  },
  {
    header: "Reach out",
    bodySegments: [
      { type: "text" as const, text: "Open to " },
      { type: "link" as const, href: "mailto:vince@stylar.com", text: "connect", external: false },
      { type: "text" as const, text: " on whatever's caught your imagination." },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  { href: "https://instagram.com/itsanvincent", icon: "/icons/instagram.svg", label: "Instagram" },
  { href: "https://x.com/itsanvincent", icon: "/icons/x.svg", label: "X" },
  { href: "https://linkedin.com/in/itsanvincent", icon: "/icons/linkedin.svg", label: "LinkedIn" },
  { href: "https://youtube.com/@vincentan8085", icon: "/icons/youtube.svg", label: "YouTube" },
] as const;

function bodyLength(segments: readonly BodySegment[]): number {
  return segments.reduce((n, s) => n + s.text.length, 0);
}

const CARET_COLOR = "#000";

function CaretDown({
  isVisible,
  onClick,
}: {
  isVisible: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bio-caret-wrapper bio-caret-down flex justify-center md:justify-start self-start mt-6${isVisible ? " bio-caret-visible" : ""}`}
      style={{
        margin: "-12px",
        marginTop: "40px",
        cursor: "pointer",
        padding: "12px",
        ...(isVisible ? undefined : { opacity: 0 }),
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "Scroll to next section" : undefined}
      aria-hidden={onClick ? undefined : true}
    >
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--foreground)]" style={{ color: CARET_COLOR }}>
        <path d="M2 2l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const scrollContainerStyle: React.CSSProperties = {
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "scroll",
  scrollSnapType: "y mandatory",
};

const sectionStyle: React.CSSProperties = {
  minHeight: "100svh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export default function ProgressiveRevealBio({ mobileHero }: { mobileHero?: React.ReactNode } = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastWheelTimeRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const lastIndex = SECTIONS.length - 1;

  const step = (delta: number) => {
    const current = activeIndexRef.current;
    const next = Math.max(0, Math.min(current + delta, lastIndex));
    if (next === current) return;
    setActiveIndex(next);
    activeIndexRef.current = next;
    sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const stepDown = () => step(1);
  const stepUp = () => step(-1);

  // Desktop only: wheel handler for section stepping. On mobile the scroll container is hidden (display:none) so it won't receive events.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelTimeRef.current < WHEEL_THROTTLE_MS) {
        e.preventDefault();
        return;
      }
      lastWheelTimeRef.current = now;
      const current = activeIndexRef.current;
      if (e.deltaY > 0) {
        const next = Math.min(current + 1, lastIndex);
        if (next !== current) {
          setActiveIndex(next);
          activeIndexRef.current = next;
          sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (e.deltaY < 0) {
        const next = Math.max(current - 1, 0);
        if (next !== current) {
          setActiveIndex(next);
          activeIndexRef.current = next;
          sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [lastIndex]);

  useEffect(() => {
    const onResize = () => {
      sectionRefs.current[activeIndexRef.current]?.scrollIntoView({ behavior: "auto", block: "center" });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const len0 = bodyLength(SECTIONS[0].bodySegments);
  const len1 = bodyLength(SECTIONS[1].bodySegments);
  const len2 = bodyLength(SECTIONS[2].bodySegments);
  const len3 = bodyLength(SECTIONS[3].bodySegments);
  const bodyVisible0 = useTypewriter(len0, activeIndex === 0, INITIAL_DELAY_MS);
  const bodyVisible1 = useTypewriter(len1, activeIndex === 1, INITIAL_DELAY_MS);
  const bodyVisible2 = useTypewriter(len2, activeIndex === 2, INITIAL_DELAY_MS);
  const bodyVisible3 = useTypewriter(len3, activeIndex === 3, INITIAL_DELAY_MS);
  const bodyVisible = [bodyVisible0, bodyVisible1, bodyVisible2, bodyVisible3];
  const bodyLengths = [len0, len1, len2, len3];
  const typewriterDone = [bodyVisible0 >= len0, bodyVisible1 >= len1, bodyVisible2 >= len2, bodyVisible3 >= len3];

  return (
    <>
      {/* Mobile: plain scroll — globe + pill + 4 sections, no snap/wheel/carets/typewriter */}
      {mobileHero && (
        <div className="md:hidden flex flex-col pb-12">
          <div
            className="flex flex-col items-center justify-center pt-6 pb-8 gap-4 shrink-0"
            style={{ position: "fixed", top: 0, left: 0, right: 0, height: "88vw", zIndex: 10, background: "white" }}
          >
            {mobileHero}
          </div>
          <div
            className="mobile-sections flex flex-col gap-24"
            style={{ marginTop: "88vw", paddingLeft: "0px", paddingRight: "0px" }}
          >
            {SECTIONS.map((s, i) => (
              <div
                key={i}
                style={{
                  ...(i === 0 ? { paddingTop: "80px" } : {}),
                  ...(i === SECTIONS.length - 1 ? { paddingBottom: "80px" } : {}),
                }}
              >
                <h2 className="mobile-section-label mb-2">{s.header}</h2>
                <p className="mobile-section-body">{renderBodyUpTo([...s.bodySegments], bodyLength(s.bodySegments))}</p>
                {i === SECTIONS.length - 1 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {SOCIAL_LINKS.map(({ href, icon, label }) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                      >
                        <img src={icon} alt="" width={20} height={20} style={{ display: "block" }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Desktop: unchanged */}
      <div
        ref={scrollRef}
        className="bio-scroll-container hidden md:flex w-full max-w-[400px] md:w-[400px] md:min-w-0 text-left md:flex-1 md:flex-none md:min-h-0 md:shrink-0 md:relative md:overflow-x-hidden"
        style={scrollContainerStyle}
      >
        <div className="hidden md:block" style={{ height: "50svh", flexShrink: 0, scrollSnapAlign: "none" }} aria-hidden />
        {SECTIONS.map((section, i) => (
          <div
            key={i}
            ref={(el) => { sectionRefs.current[i] = el; }}
            data-section-index={i}
            className={`bio-section ${activeIndex === i ? "active" : "inactive"} flex flex-col justify-center items-start md:items-center snap-start md:snap-center h-full md:h-[100svh] shrink-0 pt-6 pb-12 md:py-12 md:pt-12`}
            style={sectionStyle}
          >
            <div className="section-content w-full max-w-[400px] md:max-w-[400px] flex flex-col items-start px-6 md:px-0">
              {i === 0 ? (
                <h1 className="section-header mb-2 hidden md:block" style={{ color: "#000", lineHeight: "120%" }}>
                  {section.header}
                </h1>
              ) : (
                <h2 className="section-header mb-2" style={{ color: "#000", lineHeight: "120%" }}>
                  {section.header}
                </h2>
              )}
              <div style={{ position: "relative" }} className="w-full">
                <p
                  className="section-body-spacer"
                  aria-hidden
                  style={{
                    opacity: 0,
                    userSelect: "none",
                    pointerEvents: "none",
                    margin: "0px 0px 0px 0px",
                    color: "#000",
                    lineHeight: i === 0 ? "120%" : "140%",
                    fontSize: 20,
                    whiteSpace: "pre-line",
                  }}
                >
                  {renderBodyUpTo([...section.bodySegments], bodyLengths[i])}
                </p>
                <p
                  className="section-body"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    color: "#000",
                    lineHeight: i === 0 ? "120%" : "140%",
                  }}
                >
                  {renderBodyUpTo([...section.bodySegments], bodyVisible[i])}
                </p>
              </div>
              {i < lastIndex && (
                <CaretDown isVisible={typewriterDone[i]} onClick={stepDown} />
              )}
              {i === SECTIONS.length - 1 && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {SOCIAL_LINKS.map(({ href, icon, label }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <img src={icon} alt="" width={20} height={20} style={{ display: "block" }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="hidden md:block" style={{ height: "50svh", flexShrink: 0, scrollSnapAlign: "none" }} aria-hidden />
      </div>
    </>
  );
}
