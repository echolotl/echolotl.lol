export interface Character {
  slug: string;
  name: string;
  species: string;
  age?: number;
  height: string;
  created_at: string;
  modified_at: string;
  pronouns: string;
  ipa?: string;
  friends?: { slug: string; name: string }[];
  likes?: string[];
  dislikes?: string[];
  enemies?: { slug: string; name: string }[];
  short_description?: string;
  theme_color: string;
  theme_color_light?: string;
  color_palette?: string[];
  image?: {
    type: "artwork" | "url";
    url?: string;
    slug?: string;
  };
  image_description?: string;
  category?: string;
}

export interface Art {
  slug: string;
  created_at: string;
  modified_at: string;
  character?: string;
  related_characters?: string[]; // The character's slug
  title: string;
  description?: string;
  tags?: string[];
  pinned: boolean;
  artist?: Artist;
  images: ArtImage[]; // At least one per schema
  sketch?: boolean;
  nsfw?: boolean;
}

export interface ArtImageVariant {
  image_url: string;
  thumbnail_url?: string;
  thumbnail_anchor?: ThumbnailAnchor;
  label?: string;
  alt?: string;
}

export interface ArtImage {
  id?: string;
  title?: string;
  image_url: string;
  thumbnail_url?: string;
  thumbnail_anchor?: ThumbnailAnchor;
  alt?: string;
  variants?: ArtImageVariant[];
}

export interface Artist {
  name: string;
  link?: string;
}

export type ThumbnailAnchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";
