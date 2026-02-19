"use client";

import { useRef, useState, useEffect } from "react";

const CURSOR_LERP = 0.15;
const CURSOR_SIZE = 24;
const HOVER_SCALE = 36 / 24; // 1.5x when over clickables

export default function SiteCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [overExcluded, setOverExcluded] = useState(false);
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const pos = posRef.current;
    const target = targetRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      setVisible(true);

      // Temporarily hide our cursor div so elementFromPoint hits the real element
      const dot = dotRef.current;
      if (dot) dot.style.visibility = "hidden";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (dot) dot.style.visibility = "";

      setOverExcluded(el?.closest(".hide-custom-cursor") != null);
      setIsHoveringClickable(
        el?.closest("a, button, [role='button'], [href]") != null
      );
    };

    const handleMouseLeave = () => setVisible(false);

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      pos.x += (target.x - pos.x) * CURSOR_LERP;
      pos.y += (target.y - pos.y) * CURSOR_LERP;
      const dot = dotRef.current;
      if (dot) {
        dot.style.left = `${pos.x}px`;
        dot.style.top = `${pos.y}px`;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    tick();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const show = visible && !overExcluded;
  const scale = isHoveringClickable ? HOVER_SCALE : 1;

  return (
    <div
      ref={dotRef}
      className="site-cursor hide-cursor-on-touch"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: CURSOR_SIZE,
        height: CURSOR_SIZE,
        borderRadius: "50%",
        background: "#FFF",
        mixBlendMode: "difference",
        pointerEvents: "none",
        transform: `translate(-50%, -50%) scale(${scale})`,
        transition: "transform 0.2s ease",
        zIndex: 99999,
        visibility: show ? "visible" : "hidden",
      }}
    />
  );
}
