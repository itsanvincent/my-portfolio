"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// Exact clone of chroma.houmahani.com — Three.js + GLSL chromatic aberration
const vertexShader = `
  varying vec2 vUv;
  uniform vec2 u_uvScale;
  uniform vec2 u_uvOffset;
  void main() {
    vUv = uv * u_uvScale + u_uvOffset;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform vec2 u_mouse;
  uniform vec2 u_resolution;
  uniform float u_chroma;
  uniform float u_distortion;
  uniform float u_noise;
  uniform float u_fullEffect;
  uniform float u_time;

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

    float radius = 0.15 + u_distortion * 0.25;
    float falloff = 1.0 - smoothstep(radius * 0.5, radius * 1.5, dist);
    float offsetAmount = u_chroma * 0.04 * falloff * (0.5 + dist * 2.0);

    vec2 uvR = uv - dir * offsetAmount;
    vec2 uvB = uv + dir * offsetAmount;

    float r = texture2D(u_texture, uvR).r;
    float g = texture2D(u_texture, uv).g;
    float b = texture2D(u_texture, uvB).b;

    vec3 color = vec3(r, g, b);

    if (u_fullEffect > 0.5 && u_noise > 0.0) {
      float n = noise(uv * 6.0 + u_mouse * 3.0 + u_time * 0.5) * u_noise * 0.08 * falloff;
      color += vec3(n, n * 0.7, n * 1.2);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function ChromaticCanvas({
  imageSrc,
  externalMouseRef,
}: {
  imageSrc: string;
  /** When provided, use this ref for mouse position instead of container events. Enables shared cursor across multiple instances. */
  externalMouseRef?: React.MutableRefObject<{ x: number; y: number } | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  const paramsRef = useRef({
    chroma: 0.85,
    distortion: 0.55,
    noise: 0.45,
    fullEffect: true,
  });

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

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    targetMouseRef.current.x = (touch.clientX - rect.left) / rect.width;
    targetMouseRef.current.y = 1.0 - (touch.clientY - rect.top) / rect.height;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    targetMouseRef.current.x = (touch.clientX - rect.left) / rect.width;
    targetMouseRef.current.y = 1.0 - (touch.clientY - rect.top) / rect.height;
  }, []);

  const handleTouchEnd = useCallback(() => {
    targetMouseRef.current.x = 0.5;
    targetMouseRef.current.y = 0.5;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    let time = 0;
    let cleanup: (() => void) | null = null;
    let mounted = true;

    const updateSize = () => {
      if (!container || !mounted) return { w: 0, h: 0 };
      const rect = container.getBoundingClientRect();
      return {
        w: Math.max(Math.floor(rect.width), 1),
        h: Math.max(Math.floor(rect.height), 1),
      };
    };

    const init = () => {
      const size = updateSize();
      const w = size.w || 1;
      const h = size.h || 1;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      const loader = new THREE.TextureLoader();
      loader.load(
        imageSrc,
        (texture) => {
          if (!mounted) {
            texture.dispose();
            return;
          }
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;

          const img = texture.image;
          const imgAspect = img ? img.width / img.height : 700 / 467;
          const viewAspect = w / h;
          let uvScale: [number, number];
          let uvOffset: [number, number];
          if (viewAspect > imgAspect) {
            uvScale = [imgAspect / viewAspect, 1];
            uvOffset = [(1 - imgAspect / viewAspect) * 0.5, 0];
          } else {
            uvScale = [1, viewAspect / imgAspect];
            uvOffset = [0, (1 - viewAspect / imgAspect) * 0.5];
          }

          const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
              u_texture: { value: texture },
              u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
              u_resolution: { value: new THREE.Vector2(w, h) },
              u_uvScale: { value: new THREE.Vector2(uvScale[0], uvScale[1]) },
              u_uvOffset: { value: new THREE.Vector2(uvOffset[0], uvOffset[1]) },
              u_chroma: { value: paramsRef.current.chroma },
              u_distortion: { value: paramsRef.current.distortion },
              u_noise: { value: paramsRef.current.noise },
              u_fullEffect: { value: paramsRef.current.fullEffect ? 1 : 0 },
              u_time: { value: 0 },
            },
          });
          materialRef.current = material;

          const geometry = new THREE.PlaneGeometry(2, 2);
          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);

          function tick() {
            rafId = requestAnimationFrame(tick);
            if (!mounted) return;
            time += 0.016;

            // Use external mouse ref when provided (e.g. for layered reveal)
            if (externalMouseRef?.current) {
              targetMouseRef.current.x = externalMouseRef.current.x;
              targetMouseRef.current.y = externalMouseRef.current.y;
            }

            mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.12;
            mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.12;

            material.uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
            material.uniforms.u_time.value = time;
            const p = paramsRef.current;
            material.uniforms.u_chroma.value = p.chroma;
            material.uniforms.u_distortion.value = p.distortion;
            material.uniforms.u_noise.value = p.noise;
            material.uniforms.u_fullEffect.value = p.fullEffect ? 1 : 0;

            renderer.render(scene, camera);
          }
          tick();

          const updateAspect = (nw: number, nh: number) => {
            const nImgAspect = img ? img.width / img.height : 700 / 467;
            const nViewAspect = nw / nh;
            if (nViewAspect > nImgAspect) {
              material.uniforms.u_uvScale.value.set(nImgAspect / nViewAspect, 1);
              material.uniforms.u_uvOffset.value.set(
                (1 - nImgAspect / nViewAspect) * 0.5,
                0
              );
            } else {
              material.uniforms.u_uvScale.value.set(1, nViewAspect / nImgAspect);
              material.uniforms.u_uvOffset.value.set(
                0,
                (1 - nViewAspect / nImgAspect) * 0.5
              );
            }
          };

          const resizeObserver = new ResizeObserver(() => {
            const s = updateSize();
            if (s && s.w > 0 && s.h > 0) {
              renderer.setSize(s.w, s.h);
              material.uniforms.u_resolution.value.set(s.w, s.h);
              updateAspect(s.w, s.h);
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
            fallback.src = imageSrc;
            fallback.alt = "";
            fallback.style.width = "100%";
            fallback.style.height = "100%";
            fallback.style.objectFit = "cover";
            if (container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement);
            }
            container.appendChild(fallback);
          }
        }
      );

      // Only add container listeners when not using external mouse
      if (!externalMouseRef) {
        const moveHandler = handleMouseMove as EventListener;
        container.addEventListener("mousemove", moveHandler);
        container.addEventListener("mouseleave", handleMouseLeave);
        container.addEventListener("touchmove", handleTouchMove as EventListener, { passive: true });
        container.addEventListener("touchstart", handleTouchStart as EventListener, { passive: true });
        container.addEventListener("touchend", handleTouchEnd);
        container.addEventListener("touchcancel", handleTouchEnd);
      }
    };

    const layoutRaf = requestAnimationFrame(() => {
      requestAnimationFrame(init);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(layoutRaf);
      if (!externalMouseRef) {
        container.removeEventListener("mousemove", handleMouseMove as EventListener);
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("touchmove", handleTouchMove as EventListener);
        container.removeEventListener("touchstart", handleTouchStart as EventListener);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchcancel", handleTouchEnd);
      }
      cleanup?.();
    };
  }, [imageSrc, handleMouseMove, handleMouseLeave, handleTouchMove, handleTouchStart, handleTouchEnd, externalMouseRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}
