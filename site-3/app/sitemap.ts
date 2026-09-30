import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://starmultlogin.com";
  const now = new Date();

  const routes = [
    {
      path: "",
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      path: "/pricing",
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      path: "/download",
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      path: "/docs",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/terms",
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      path: "/privacy",
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];

  return routes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    alternates: {
      languages: {
        pt: `${baseUrl}${r.path}?lang=pt`,
        en: `${baseUrl}${r.path}?lang=en`,
        es: `${baseUrl}${r.path}?lang=es`,
        fr: `${baseUrl}${r.path}?lang=fr`,
      },
    },
  }));
}
