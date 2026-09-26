"use client";

import { useEffect, useRef } from "react";

const ICONS = [
  "bluesky",
  "devto",
  "discord",
  "dribbble",
  "facebook",
  "gmb",
  "hashnode",
  "instagram-standalone",
  "instagram",
  "kick",
  "lemmy",
  "linkedin-page",
  "linkedin",
  "listmonk",
  "mastodon-custom",
  "mastodon",
  "medium",
  "mewe",
  "moltbook",
  "nostr",
  "pinterest",
  "reddit",
  "skool",
  "slack",
  "telegram",
  "threads",
  "tiktok-business",
  "tiktok",
  "tumblr",
  "twitch",
  "vk",
  "whop",
  "wordpress",
  "wrapcast",
  "x",
  "youtube",
];

type Point = { x: number; y: number; z: number };

/** Evenly distribute N points on a unit sphere (fibonacci spiral). */
function fibonacciSphere(count: number): Point[] {
  const points: Point[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push({
      x: Math.cos(theta) * radiusAtY,
      y,
      z: Math.sin(theta) * radiusAtY,
    });
  }
  return points;
}

/**
 * A rotating "earth" made of platform icons.
 * Idles in a slow spin; moving the cursor over it works like a trackball —
 * the sphere follows your movement, then eases back to the idle spin.
 */
export function IconGlobe({
  size = 560,
  iconSize = 56,
}: {
  size?: number;
  iconSize?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const base = useRef(fibonacciSphere(ICONS.length));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Rotation state (radians) and velocity.
    let rotX = -0.25;
    let rotY = 0;
    let velX = 0;
    let velY = reduced ? 0 : 0.0035; // idle spin
    const IDLE_Y = reduced ? 0 : 0.0035;

    let pointerInside = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (inside && pointerInside) {
        // Trackball: cursor delta drives angular velocity.
        velY = (e.clientX - lastX) * 0.0016;
        velX = (e.clientY - lastY) * -0.0016;
      }
      pointerInside = inside;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const radius = size / 2 - iconSize * 0.75;
    let raf = 0;

    const frame = () => {
      // Ease velocity back toward the idle spin.
      velY += (IDLE_Y - velY) * 0.03;
      velX += (0 - velX) * 0.03;
      rotY += velY;
      rotX += velX;
      // Keep the tilt in a pleasant range.
      rotX = Math.max(-1.2, Math.min(1.2, rotX));

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      for (let i = 0; i < base.current.length; i++) {
        const tile = tileRefs.current[i];
        if (!tile) continue;
        const p = base.current[i];

        // Rotate around Y, then X.
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Project: z in [-1, 1] → scale, opacity, depth order.
        const depth = (z2 + 1) / 2; // 0 back, 1 front
        // Keep the front icons near native resolution (base is already ~native
        // size) so they stay crisp — gentle depth scaling only.
        const scale = 0.5 + depth * 0.6;
        const opacity = 0.16 + depth * 0.84;

        tile.style.transform = `translate3d(${x1 * radius}px, ${y1 * radius}px, 0) scale(${scale})`;
        tile.style.opacity = String(opacity);
        tile.style.zIndex = String(Math.round(depth * 100));
        tile.style.filter =
          depth < 0.4
            ? "blur(1.5px) saturate(0.7)"
            : depth > 0.85
              ? `drop-shadow(0 0 ${Math.round((depth - 0.85) * 80)}px rgba(255,176,32,0.5)) saturate(1.15)`
              : "saturate(1.05)";
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [size, iconSize]);

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Core glow — the "planet" */}
      <div className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-2/15 blur-2xl" />

      {ICONS.map((slug, i) => (
        <div
          key={slug}
          ref={(el) => {
            tileRefs.current[i] = el;
          }}
          className="absolute left-1/2 top-1/2 will-change-transform"
          style={{
            width: iconSize,
            height: iconSize,
            marginLeft: -iconSize / 2,
            marginTop: -iconSize / 2,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/icons/platforms/${slug}.png`}
            alt=""
            className="size-full rounded-xl object-contain"
            draggable={false}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
