import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "postN — Plan, generate, schedule & review from one IST calendar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #14101f 0%, #221c33 55%, #1a1430 100%)",
          color: "#fff6e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#ffb020",
              color: "#1a1204",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
            post<span style={{ color: "#ffb020" }}>N</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Plan, generate,
            <br />
            schedule & review.
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,246,232,0.72)", maxWidth: 820, lineHeight: 1.35 }}>
            India-first social scheduler. One draft → LinkedIn, X, Telegram, Slack, Discord and Dev.to. IST native.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "rgba(255,246,232,0.55)" }}>
          <span>6 channels live · 30+ on the way</span>
          <span>Built for Indian founders</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
