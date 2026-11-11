import type { Art, ArtImage } from "./types";
import { resolve } from "node:path";
import { fixdata } from "./scripts/artcli/commands/fix-data";
import { regenpalette } from "./scripts/artcli/commands/regenpalette";
import { regenthumb } from "./scripts/artcli/commands/regenthumb";
import { getAllArts } from "./scripts/artcli/utils/art";
import { regenIPA } from "./scripts/artcli/commands/regenipa";
import type { ImageEntry, SitemapUrlInput } from "@nuxtjs/sitemap";
import { Logger } from "./scripts/logger";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-06-15",
  css: ["~/assets/styles/main.scss"],
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: "monokai",
            light: "catppuccin-latte",
          },
          langs: ["javascript", "html", "css", "bash", "json", "vue"],
        },
      },
    },
  },
  site: { url: "https://echolotl.lol", name: "echolotl" },
  sitemap: {
    xsl: false,
    zeroRuntime: true,
    discoverImages: false,
    urls: () => {
      const allArt: Art[] = getAllArts();
      const urls: SitemapUrlInput[] = [];
      for (const art of allArt) {
        if (art.nsfw) continue;
        urls.push({
          loc: `/art/${art.slug}`,
          priority: art.pinned ? 0.8 : 0.5,
          changefreq: "never",
          lastmod: art.modified_at,
          images: (() => {
            const allImages: ImageEntry[] = [];

            for (const artImage of art.images) {
              const artCaption = artImage.alt ? artImage.alt : art.description;
              allImages.push({
                loc: `https://echolotl.lol${artImage.image_url}`,
                caption: artCaption,
                title: art.title + (artImage.title ? ` (${artImage.title})` : ""),
                license: "CC BY-NC-SA 4.0 International"
              });

              if (artImage.variants && artImage.variants.length && artImage.variants.length > 0) {
                for (const variant of artImage.variants) {
                  allImages.push({
                    loc: `https://echolotl.lol${variant.image_url}`,
                    caption: variant.alt ? variant.alt : artCaption,
                    title: variant.label ? `${art.title} (${variant.label})` : art.title
                  })
                }
              }
            }

            return allImages;
          }
        )(),
        })
      }
      Logger.noLogBypass(() => Logger.success('Sitemap art entries have been generated! ' + Logger.fmtDim(`(${urls.length} pages)`)))
      return urls;
    }
  },
  devtools: { enabled: true },
  modules: [
    "@nuxtjs/sitemap",
    "@nuxtjs/robots",
    "@nuxt/content",
    "@nuxtjs/mdc",
  ],
  components: {
    global: true,
    dirs: ["~/components", "~/components/content"],
  },
  app: {
    head: {
      title: "echolotl",
      htmlAttrs: {
        lang: "en",
      },
      link: [
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/images/favicon-light.ico",
        },
      ],
    },
    pageTransition: { name: "page", mode: "out-in" },
  },
  future: {
    compatibilityVersion: 4,
  },
  experimental: {
    viewTransition: true,
  },
  runtimeConfig: {
    public: {
      underConstruction: true,
      backendUrl: process.env.BACKEND_URL || "",
      backendEnabled:
        process.env.BACKEND_ENABLED === "true" ||
        (process.env.BACKEND_ENABLED !== "false" &&
          Boolean(process.env.BACKEND_URL)),
    },
  },
  hooks: {
    "build:before": async () => {
      try {
        await fixdata();
        await Promise.all([regenpalette([]), regenIPA([]), regenthumb([])]);
      } catch (error) {
        console.error("Error during art build hooks:", error);
      }
    },
  },
  alias: {
    "@art": resolve(__dirname, "app/components/art"),
    "@characters": resolve(__dirname, "app/components/characters"),
  },
});
