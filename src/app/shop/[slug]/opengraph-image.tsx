import { ImageResponse } from "next/og";
import { getPublicShopBySlug } from "@/lib/public-store";

export const alt = "Premium jewellery collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getPublicShopBySlug(slug);
  const name = shop?.name || "LuxeStore Jewellers";
  const description = shop?.shortDescription || "A premium jewellery collection, curated for you.";
  const location = [shop?.city, shop?.state].filter(Boolean).join(", ");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("") || "L";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #09090b 0%, #1c1917 52%, #451a03 100%)",
          color: "white",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {shop?.coverUrl ? (
          <img
            src={shop.coverUrl}
            alt=""
            width="1200"
            height="630"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.26,
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.83) 55%, rgba(9,9,11,0.25) 100%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", position: "relative", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  border: "2px solid #fbbf24",
                  background: "rgba(28,25,23,0.92)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  fontWeight: 800,
                }}
              >
                {initials}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#fbbf24", fontSize: 20, fontWeight: 800, letterSpacing: "0.16em" }}>PREMIUM JEWELLERY</div>
                <div style={{ color: "#d6d3d1", fontSize: 18, marginTop: 5 }}>{location || "Digital showroom"}</div>
              </div>
            </div>
            <div style={{ display: "flex", border: "1px solid rgba(251,191,36,0.5)", borderRadius: 999, padding: "12px 22px", color: "#fde68a", fontSize: 17 }}>
              Curated collection
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 58, maxWidth: 850 }}>
            <div style={{ display: "flex", fontSize: name.length > 28 ? 56 : 68, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.035em" }}>
              {name}
            </div>
            <div style={{ display: "flex", marginTop: 22, color: "#e7e5e4", fontSize: 27, lineHeight: 1.35, maxWidth: 790 }}>
              {description.slice(0, 120)}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" }}>
            <div style={{ display: "flex", gap: 14 }}>
              {shop?.goldRate22K ? (
                <div style={{ display: "flex", borderRadius: 14, background: "rgba(255,255,255,0.1)", padding: "12px 18px", fontSize: 17, color: "#fef3c7" }}>
                  22K ₹{shop.goldRate22K.toLocaleString("en-IN")}/g
                </div>
              ) : null}
              {shop?.goldRate24K ? (
                <div style={{ display: "flex", borderRadius: 14, background: "rgba(255,255,255,0.1)", padding: "12px 18px", fontSize: 17, color: "#fef3c7" }}>
                  24K ₹{shop.goldRate24K.toLocaleString("en-IN")}/g
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", borderRadius: 999, background: "#f59e0b", color: "#1c1917", padding: "16px 28px", fontSize: 21, fontWeight: 800 }}>
              Explore collection →
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
