import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://starmultlogin.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/auth/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
