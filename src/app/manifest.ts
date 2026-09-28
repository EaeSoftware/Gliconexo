import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GlicoNexo",
    short_name: "GlicoNexo",
    description:
      "Registro, organização e visualização de medições de glicemia capilar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#14294b",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
