import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dobly",
    short_name: "Dobly",
    description: "AI operators and automations that launch with less setup friction.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#050b14",
    theme_color: "#4D7AFF",
    orientation: "portrait",
    categories: ["productivity", "business", "utilities"],
  };
}
