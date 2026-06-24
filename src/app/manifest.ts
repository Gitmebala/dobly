import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dobly",
    short_name: "Dobly",
    description: "AI operators and automations that launch with less setup friction.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#ed5a24",
    orientation: "portrait",
    categories: ["productivity", "business", "utilities"],
  };
}
