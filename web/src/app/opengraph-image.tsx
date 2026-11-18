import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Offcut — streetwear in short runs from Bengaluru, no filler";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const dir = join(process.cwd(), "src/assets");
  const [black, bold] = await Promise.all([
    readFile(join(dir, "Archivo-CondensedBlack.ttf")),
    readFile(join(dir, "Archivo-Bold.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF", color: "#000000", fontFamily: "Archivo" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 48px", borderBottom: "4px solid #000", fontSize: 30, fontWeight: 900, textTransform: "uppercase" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="44" height="44" viewBox="0 0 64 64">
              <rect width="64" height="64" fill="#000" />
              <circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeWidth="7" />
              <polygon points="34,6 64,6 64,36" fill="#000" />
              <polygon points="38,2 66,2 66,30" fill="#D6FF3B" />
            </svg>
            Offcut
          </div>
          <div style={{ display: "flex", fontFamily: "ArchivoBold", fontSize: 22, letterSpacing: "0.04em" }}>Made in Bengaluru</div>
        </div>
        <div style={{ display: "flex", fontSize: 290, fontWeight: 900, lineHeight: 0.8, letterSpacing: "-0.045em", padding: "44px 44px 0" }}>
          OFFC<span style={{ marginLeft: 44 }}>UT</span>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "space-between", padding: "0 48px 44px" }}>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
            Cut from what&apos;s left. No filler.
          </div>
          <div style={{ display: "flex", background: "#D6FF3B", border: "4px solid #000", padding: "12px 20px", fontFamily: "ArchivoBold", fontSize: 24, textTransform: "uppercase" }}>
            In development
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: black, weight: 900, style: "normal" },
        { name: "ArchivoBold", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
