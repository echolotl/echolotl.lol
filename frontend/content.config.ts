import { defineCollection, defineContentConfig, z } from "@nuxt/content";
import { defineSitemapSchema } from "@nuxtjs/sitemap/content";

const imageVariant = z.object({
  image_url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  thumbnail_anchor: z
    .enum([
      "top-left",
      "top",
      "top-right",
      "left",
      "center",
      "right",
      "bottom-left",
      "bottom",
      "bottom-right",
    ])
    .optional(),
  label: z.string().optional(),
  alt: z.string().optional(),
});

const galleryImage = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  image_url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  thumbnail_anchor: z
    .enum([
      "top-left",
      "top",
      "top-right",
      "left",
      "center",
      "right",
      "bottom-left",
      "bottom",
      "bottom-right",
    ])
    .optional(),
  alt: z.string().optional(),
  variants: z.array(imageVariant).optional(),
});

const blogCategories = ["general", "devlog", "lore", "announcement"] as const;

export default defineContentConfig({
  collections: {
    characters: defineCollection({
      source: "characters/*.md",
      type: "page",
      schema: z.object({
        sitemap: defineSitemapSchema(),
        slug: z.string(),
        name: z.string(),
        species: z.string(),
        age: z.number().optional(),
        height: z.string(),
        created_at: z.string().datetime(),
        modified_at: z.string().datetime(),
        pronouns: z.string(),
        ipa: z.string().optional(),
        friends: z
          .array(
            z.object({
              slug: z.string(),
              name: z.string(),
            }),
          )
          .optional(),
        likes: z.array(z.string()).optional(),
        dislikes: z.array(z.string()).optional(),
        enemies: z
          .array(
            z.object({
              slug: z.string(),
              name: z.string(),
            }),
          )
          .optional(),
        category: z.string().optional(),
        short_description: z.string().optional(),
        theme_color: z.string().startsWith("#").length(7),
        theme_color_light: z.string().startsWith("#").length(7).optional(),
        color_palette: z.array(z.string().startsWith("#").length(7)).optional(),
        image: z
          .object({
            type: z.enum(["artwork", "url"]),
            url: z.string().optional(),
            slug: z.string().optional(),
          })
          .optional(),
        image_description: z.string().optional(),
      }),
    }),

    art: defineCollection({
      source: "art/**/*.{json,yml,yaml}",
      type: "data",
      schema: z.object({
        slug: z.string(),
        created_at: z.string().datetime(),
        modified_at: z.string().datetime(),
        character: z.string().optional(),
        related_characters: z.array(z.string()).optional(),
        title: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        pinned: z.boolean(),
        artist: z
          .object({
            name: z.string(),
            link: z.string().url().optional(),
          })
          .optional(),
        nsfw: z.boolean().default(false),
        images: z.array(galleryImage).min(1, "At least one image required"),
        sketch: z.boolean().optional(),
      }),
    }),

    blog: defineCollection({
      source: "blog/*.md",
      type: "page",
      schema: z.object({
        sitemap: defineSitemapSchema(),
        slug: z.string(),
        title: z.string(),
        thumbnail_url: z.string().url().optional(),
        created_at: z.string().datetime(),
        modified_at: z.string().datetime(),
        author: z.string().optional(),
        tags: z.array(z.string()).optional(),
        category: z.enum(blogCategories),
        pinned: z.boolean(),
        // Character slugs; only used by "lore" posts
        related_characters: z.array(z.string()).optional(),
      }),
    }),
  },
});
