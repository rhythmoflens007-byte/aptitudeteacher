import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aptitude Teacher",
    short_name: "Aptitude",
    description: "Adaptive aptitude practice with an AI tutor.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#5b5bf5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
