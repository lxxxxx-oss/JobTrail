import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "投程 JobTrail",
    short_name: "投程",
    description: "投递有迹，前程可见",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1e8",
    theme_color: "#10231c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
