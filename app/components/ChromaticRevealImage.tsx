"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import ChromaticCanvas from "./ChromaticCanvas";
import NycMap from "./NycMap";

const IS_DEV = process.env.NODE_ENV === "development";

const DEFAULT_BLOB = {
  points: 12,
  morphSpeed: 0.0008,
  baseRadius: 110,
  variation: 10,
  tension: 0.2,
};

const CURSOR_LERP = 0.05; // Smoothing: mask/chromatic chase cursor with slight delay

export default function ChromaticRevealImage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const revealLayerRef = useRef<HTMLDivElement>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const blobParamsRef = useRef({ ...DEFAULT_BLOB });
  const [blobPoints, setBlobPoints] = useState(DEFAULT_BLOB.points);
  const [blobMorphSpeed, setBlobMorphSpeed] = useState(DEFAULT_BLOB.morphSpeed);
  const [blobBaseRadius, setBlobBaseRadius] = useState(DEFAULT_BLOB.baseRadius);
  const [blobVariation, setBlobVariation] = useState(DEFAULT_BLOB.variation);
  const [blobTension, setBlobTension] = useState(DEFAULT_BLOB.tension);

  // Target = raw cursor (from mousemove). Smoothed = lerped each frame for blob + chromatic
  const targetPosPxRef = useRef({ x: 200, y: 200 });
  const smoothedPosPxRef = useRef({ x: 200, y: 200 });
  const mousePosRef = useRef<{ x: number; y: number } | null>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    blobParamsRef.current = {
      points: blobPoints,
      morphSpeed: blobMorphSpeed,
      baseRadius: blobBaseRadius,
      variation: blobVariation,
      tension: blobTension,
    };
  }, [blobPoints, blobMorphSpeed, blobBaseRadius, blobVariation, blobTension]);

  // Global cursor tracking: convert page coords to container-relative, clamp to circle (googly eye)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateTargetFromClientCoords = (clientX: number, clientY: number) => {
      const rect = el!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = Math.min(rect.width, rect.height) / 2;

      const dx = clientX - cx;
      const dy = clientY - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      let px: number;
      let py: number;
      if (d <= r || d === 0) {
        px = clientX - rect.left;
        py = clientY - rect.top;
      } else {
        const scale = r / d;
        px = rect.width / 2 + dx * scale;
        py = rect.height / 2 + dy * scale;
      }
      targetPosPxRef.current = { x: px, y: py };
    };

    const resetTargetToCenter = () => {
      const rect = el!.getBoundingClientRect();
      targetPosPxRef.current = { x: rect.width / 2, y: rect.height / 2 };
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      updateTargetFromClientCoords(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateTargetFromClientCoords(touch.clientX, touch.clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateTargetFromClientCoords(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      resetTargetToCenter();
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const buildBlobPath = useCallback(
    (cx: number, cy: number, t: number, _w: number, _h: number) => {
      const { points: n, morphSpeed, baseRadius, variation, tension } = blobParamsRef.current;
      const points: { x: number; y: number }[] = [];
      const mt = t * morphSpeed;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const f1 = 0.3 + i * 0.08 + (i % 5) * 0.15;
        const f2 = 0.8 + i * 0.18 + (i % 7) * 0.12;
        const f3 = 1.2 + (i % 3) * 0.4;
        const v =
          variation *
          (Math.sin(f1 * mt) * 0.4 + Math.sin(f2 * mt + 2.3) * 0.4 + Math.sin(f3 * mt * 0.7 + 1.1) * 0.2);
        const r = baseRadius + v;
        points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < n; i++) {
        const pPrev = points[(i - 1 + n) % n];
        const pCur = points[i];
        const pNext = points[(i + 1) % n];
        const pNext2 = points[(i + 2) % n];
        d += ` C ${pCur.x + (pNext.x - pPrev.x) * tension} ${pCur.y + (pNext.y - pPrev.y) * tension} ${pNext.x - (pNext2.x - pCur.x) * tension} ${pNext.y - (pNext2.y - pCur.y) * tension} ${pNext.x} ${pNext.y}`;
      }
      return d + " Z";
    },
    []
  );

  // The photo layer sits ABOVE the map and is clipped to the blob each frame
  // via clip-path: path(...). (An SVG url(#mask) reference here breaks on iOS
  // WebKit, which is why the reveal previously vanished on mobile.)
  useLayoutEffect(() => {
    const layerEl = revealLayerRef.current;
    const container = containerRef.current;
    if (!layerEl || !container) return;

    const start = performance.now();
    let rafId = 0;

    const tick = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      const target = targetPosPxRef.current;
      const smoothed = smoothedPosPxRef.current;

      // Lerp smoothed position towards cursor for organic following
      smoothed.x += (target.x - smoothed.x) * CURSOR_LERP;
      smoothed.y += (target.y - smoothed.y) * CURSOR_LERP;

      // ChromaticCanvas uses normalized 0-1 coords (y flipped for UV)
      mousePosRef.current = { x: smoothed.x / w, y: 1 - smoothed.y / h };

      const t = performance.now() - start;
      const clip = `path("${buildBlobPath(smoothed.x, smoothed.y, t, w, h)}")`;
      layerEl.style.clipPath = clip;
      (layerEl.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = clip;
    };

    tick();
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      tick();
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [buildBlobPath]);

  const initialPath =
    "M 290 200 C 290 152 252 110 200 110 C 148 110 110 152 110 200 C 110 248 148 290 200 290 C 252 290 290 248 290 200 Z";

  return (
    <>
      {IS_DEV && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: debugOpen ? 16 : 8,
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 12,
            minWidth: 220,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <button
            type="button"
            onClick={() => setDebugOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              width: "100%",
              textAlign: "left",
            }}
          >
            {debugOpen ? "▼ Blob Debug" : "▶ Blob Debug"}
          </button>
          {debugOpen && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <label>
                Points: {blobPoints}
                <input
                  type="range"
                  min={8}
                  max={50}
                  value={blobPoints}
                  onChange={(e) => setBlobPoints(Number(e.target.value))}
                  style={{ display: "block", width: "100%" }}
                />
              </label>
              <label>
                Morph speed: {blobMorphSpeed.toFixed(4)}
                <input
                  type="range"
                  min={0.0001}
                  max={0.001}
                  step={0.0001}
                  value={blobMorphSpeed}
                  onChange={(e) => setBlobMorphSpeed(Number(e.target.value))}
                  style={{ display: "block", width: "100%" }}
                />
              </label>
              <label>
                Base radius: {blobBaseRadius}
                <input
                  type="range"
                  min={70}
                  max={110}
                  value={blobBaseRadius}
                  onChange={(e) => setBlobBaseRadius(Number(e.target.value))}
                  style={{ display: "block", width: "100%" }}
                />
              </label>
              <label>
                Variation: {blobVariation}
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={blobVariation}
                  onChange={(e) => setBlobVariation(Number(e.target.value))}
                  style={{ display: "block", width: "100%" }}
                />
              </label>
              <label>
                Tension: {blobTension.toFixed(2)}
                <input
                  type="range"
                  min={0.01}
                  max={0.3}
                  step={0.01}
                  value={blobTension}
                  onChange={(e) => setBlobTension(Number(e.target.value))}
                  style={{ display: "block", width: "100%" }}
                />
              </label>
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} className="relative w-full h-full rounded-full overflow-hidden" style={{ width: "100%", height: "100%", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
          }}
        >
          <NycMap />
        </div>

        <div
          ref={revealLayerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            pointerEvents: "none",
            clipPath: `path("${initialPath}")`,
            WebkitClipPath: `path("${initialPath}")`,
          } as React.CSSProperties}
        >
          <ChromaticCanvas imageSrc="/hero-image-bottom.jpg" externalMouseRef={mousePosRef} />
        </div>
      </div>
    </>
  );
}
