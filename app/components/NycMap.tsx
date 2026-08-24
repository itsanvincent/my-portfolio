"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const ACCESS_TOKEN =
  "pk.eyJ1IjoiZnJhbWVkYWRkeSIsImEiOiJjbTdmYnZvY2Mwbnc1Mm5vY2dzdWcxeHZqIn0.l8fqFLpIXtZCUY81UD1NiQ";

const DAY_STYLE = "mapbox://styles/framedaddy/cms88c7yo00bc01qo8089egvk";
const NIGHT_STYLE = "mapbox://styles/framedaddy/cms989i7c000d01s97rp104w0";

// Dot-matrix screen: the map shows through a dense grid of distinct round
// dots; the fill between the dots is light in day mode, dark at night. The
// night map is brightness-boosted so it stays legible through the screen.
const DOT_CELL_PX = 4;
// SVG tile mask: tiny radial-gradients rasterize as squares, a real
// <circle> antialiases round.
const DOT_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${DOT_CELL_PX}' height='${DOT_CELL_PX}'%3E%3Ccircle cx='${DOT_CELL_PX / 2}' cy='${DOT_CELL_PX / 2}' r='1.4' fill='black'/%3E%3C/svg%3E")`;

const DAY_BACKING = "#f4f3ef";
const NIGHT_BACKING = "#0b0d16";

// Daytime in NYC: 6am–7pm
function isNycDaytime(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  return hour >= 6 && hour < 19;
}

export default function NycMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isDay, setIsDay] = useState(() => isNycDaytime());
  const isDayRef = useRef(isDay);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = ACCESS_TOKEN;
    isDayRef.current = isNycDaytime();
    setIsDay(isDayRef.current);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDayRef.current ? DAY_STYLE : NIGHT_STYLE,
      center: [-73.985, 40.735],
      zoom: 11,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Hide city/place labels for this site only, without touching the shared
    // Studio styles. Runs on every style.load so it re-applies after the
    // day/night style swap.
    const hidePlaceLabels = () => {
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type !== "symbol") continue;
        if (/settlement|place|neighborhood|state-label|country-label|marine/i.test(layer.id)) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
    };
    map.on("style.load", hidePlaceLabels);

    // Swap day/night style when NYC crosses the boundary
    const intervalId = setInterval(() => {
      const day = isNycDaytime();
      if (day !== isDayRef.current) {
        isDayRef.current = day;
        setIsDay(day);
        mapRef.current?.setStyle(day ? DAY_STYLE : NIGHT_STYLE);
      }
    }, 60000);

    return () => {
      clearInterval(intervalId);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      className="absolute inset-0 h-full w-full"
      style={{ backgroundColor: isDay ? DAY_BACKING : NIGHT_BACKING }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        style={{
          WebkitMaskImage: DOT_MASK,
          maskImage: DOT_MASK,
          WebkitMaskSize: `${DOT_CELL_PX}px ${DOT_CELL_PX}px`,
          maskSize: `${DOT_CELL_PX}px ${DOT_CELL_PX}px`,
          WebkitMaskRepeat: "repeat",
          maskRepeat: "repeat",
          filter: isDay
            ? "contrast(1.35) saturate(1.15)"
            : "brightness(2) contrast(1.15) saturate(1.2)",
        }}
      />
    </div>
  );
}
