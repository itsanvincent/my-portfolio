"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";

// Reference: chroma.houmahani.com — Chroma, Distortion, Noise, Full Effect
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform vec2 u_mouse;
  uniform float u_chroma;
  uniform float u_distortion;
  uniform float u_noise;
  uniform float u_fullEffect;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    float dist = distance(uv, u_mouse);

    vec2 delta = uv - u_mouse;
    float len = length(delta);
    vec2 dir = len > 0.0001 ? normalize(delta) : vec2(1.0, 0.0);

    float falloff = 1.0 - smoothstep(0.1, 0.2 + u_distortion * 0.4, dist);
    float offsetAmount = u_chroma * falloff * (0.3 + dist * 2.0);

    vec2 uvR = uv - dir * offsetAmount;
    vec2 uvB = uv + dir * offsetAmount;

    float r = texture2D(u_texture, uvR).r;
    float g = texture2D(u_texture, uv).g;
    float b = texture2D(u_texture, uvB).b;

    vec3 color = vec3(r, g, b);

    if (u_fullEffect > 0.5 && u_noise > 0.0) {
      float n = noise(uv * 8.0 + u_mouse * 4.0) * u_noise * falloff;
      color += vec3(n * 0.1, n * 0.05, n * 0.15);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const defaultParams = {
  chroma: 0.8,
  distortion: 0.5,
  noise: 0.3,
  fullEffect: true,
};

export default function ChromaticImage({
  src,
  alt = "",
  width,
  height,
  className = "",
}: {
  src: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  const [params, setParams] = useState(defaultParams);
  const [showControls, setShowControls] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    targetMouseRef.current.x = (e.clientX - rect.left) / rect.width;
    targetMouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
  }, []);

  const handleMouseLeave = useCallback(() => {
    targetMouseRef.current.x = 0.5;
    targetMouseRef.current.y = 0.5;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    let cleanup: (() => void) | null = null;
    let mounted = true;
    let lastMouseX = 0.5;
    let lastMouseY = 0.5;
    let idleFrames = 0;

    const updateSize = () => {
      if (!container || !mounted) return { w: 0, h: 0 };
      const rect = container.getBoundingClientRect();
      const w = Math.max(Math.floor(rect.width), 0);
      const h = Math.max(Math.floor(rect.height), 0);
      return { w, h };
    };

    const init = () => {
      const size = updateSize();
      const cw = size.w || width;
      const ch = size.h || Math.round(width * height / width);
      const w = Math.max(cw, 1);
      const h = Math.max(ch, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setSize(w, h);
    renderer.setPixelRatio(1); // Use 1 for performance
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (texture) => {
        if (!mounted) {
          texture.dispose();
          return;
        }
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            u_texture: { value: texture },
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
            u_chroma: { value: defaultParams.chroma },
            u_distortion: { value: defaultParams.distortion },
            u_noise: { value: defaultParams.noise },
            u_fullEffect: { value: defaultParams.fullEffect ? 1 : 0 },
          },
        });
        materialRef.current = material;

        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        function tick() {
          rafId = requestAnimationFrame(tick);
          if (!mounted) return;

          mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.15;
          mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.15;

          const dx = Math.abs(mouseRef.current.x - lastMouseX);
          const dy = Math.abs(mouseRef.current.y - lastMouseY);
          if (dx < 0.0001 && dy < 0.0001) {
            idleFrames++;
            if (idleFrames > 60) return; // Stop rendering when idle
          } else {
            idleFrames = 0;
          }
          lastMouseX = mouseRef.current.x;
          lastMouseY = mouseRef.current.y;

          material.uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
          renderer.render(scene, camera);
        }
        tick();

        const resizeObserver = new ResizeObserver(() => {
          const size = updateSize();
          if (size && size.w > 0 && size.h > 0) {
            renderer.setSize(size.w, size.h);
          }
        });
        resizeObserver.observe(container);

        cleanup = () => {
          cancelAnimationFrame(rafId);
          resizeObserver.disconnect();
          materialRef.current = null;
          texture.dispose();
          material.dispose();
          geometry.dispose();
          renderer.dispose();
          if (container?.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      },
      undefined,
      () => {
        if (mounted && container) {
          const fallback = document.createElement("img");
          fallback.src = src;
          fallback.alt = alt;
          fallback.style.width = "100%";
          fallback.style.height = "auto";
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
          container.appendChild(fallback);
        }
      }
    );

    };

    const moveHandler = handleMouseMove as EventListener;
    container.addEventListener("mousemove", moveHandler);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Wait for layout; container needs dimensions before we can render
    const layoutRaf = requestAnimationFrame(() => {
      requestAnimationFrame(init);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(layoutRaf);
      container.removeEventListener("mousemove", moveHandler);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cleanup?.();
    };
  }, [src, alt, width, height, handleMouseMove, handleMouseLeave]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat?.uniforms) return;
    mat.uniforms.u_chroma.value = params.chroma;
    mat.uniforms.u_distortion.value = params.distortion;
    mat.uniforms.u_noise.value = params.noise;
    mat.uniforms.u_fullEffect.value = params.fullEffect ? 1 : 0;
  }, [params]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={className}
        style={{
          width: "100%",
          maxWidth: width,
          aspectRatio: `${width} / ${height}`,
          overflow: "hidden",
          cursor: "default",
        }}
      />
      <div className="fixed bottom-6 left-6 z-50 pointer-events-none">
        <div
          className={`pointer-events-auto rounded border border-zinc-300 bg-[#f5f5f0]/95 px-4 py-3 shadow-sm transition-opacity ${
            showControls ? "opacity-100" : "opacity-70 hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={() => setShowControls(!showControls)}
            className="text-[10px] font-medium tracking-[0.2em] text-zinc-500 uppercase"
          >
            {showControls ? "Hide controls" : "Effect controls"}
          </button>
          {showControls && (
            <div className="mt-3 space-y-3 min-w-[200px]">
              <div>
                <label className="block text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                  Chroma
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.chroma}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, chroma: parseFloat(e.target.value) }))
                  }
                  className="w-full h-1.5 accent-zinc-800"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                  Distortion
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.distortion}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, distortion: parseFloat(e.target.value) }))
                  }
                  className="w-full h-1.5 accent-zinc-800"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                  Noise
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.noise}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, noise: parseFloat(e.target.value) }))
                  }
                  className="w-full h-1.5 accent-zinc-800"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.fullEffect}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, fullEffect: e.target.checked }))
                  }
                  className="rounded border-zinc-300"
                />
                <span className="text-[10px] tracking-widest text-zinc-500 uppercase">
                  Full effect
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
