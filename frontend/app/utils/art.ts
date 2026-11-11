import type { Art } from "~~/types";

/**
 * Get all artworks
 */
export async function getAllArtworks(): Promise<Art[]> {
  return await queryCollection("art").order("created_at", "DESC").all();
}

/**
 * Get artworks
 * @param limit - Number of artworks to retrieve (optional, returns all if not provided)
 * @param page - Page number for pagination (optional)
 */
export async function getArtworks(
  limit?: number,
  page?: number,
): Promise<Art[]> {
  let query = queryCollection("art").order("created_at", "DESC");
  if (limit) {
    query = query.limit(limit);
    if (page) {
      query = query.skip((page - 1) * limit);
    }
  }
  return await query.all();
}

export async function getArtworkBySlug(slug: string): Promise<Art | null> {
  const artworks = await queryCollection("art").where("slug", "=", slug).all();
  return artworks[0] ?? null;
}

/**
 * Get pinned artworks only
 */
export async function getPinnedArtworks(): Promise<Art[]> {
  return await queryCollection("art").where("pinned", "=", true).all();
}

/**
 * Get artworks by character
 * @param characterSlug - Character slug to filter by
 * @param limit - Number of artworks to retrieve (optional, returns all if not provided)
 * @param page - Page number for pagination (optional)
 */
export async function getArtworksByCharacter(
  characterSlug: string,
  limit?: number,
  page?: number,
): Promise<Art[]> {
  let query = queryCollection("art")
    .orWhere((group) =>
      group
        .where("character", "=", characterSlug)
        .where("related_characters", "LIKE", `%${characterSlug}%`),
    )
    .order("created_at", "DESC");
  if (limit) {
    query = query.limit(limit);
    if (page) {
      query = query.skip((page - 1) * limit);
    }
  }
  return await query.all();
}

/**
 * Get artworks by tag
 */
export async function getArtworksByTag(tag: string): Promise<Art[]> {
  return await queryCollection("art").where("tags", "LIKE", `%${tag}%`).all();
}

/**
 * Get sketches only
 */
export async function getSketches(): Promise<Art[]> {
  return await queryCollection("art").where("sketch", "=", true).all();
}

/**
 * Get finished artworks (non-sketches)
 */
export async function getFinishedArtworks(): Promise<Art[]> {
  return await queryCollection("art").where("sketch", "=", false).all();
}

/**
 * Get artworks by artist
 */
export async function getArtworksByArtist(artistName: string): Promise<Art[]> {
  return await queryCollection("art")
    .where("artist.name", "=", artistName)
    .all();
}

/**
 * Get latest artworks (sorted by creation date)
 */
export async function getLatestArtworks(limit: number = 10) {
  return await queryCollection("art")
    .order("created_at", "DESC")
    .limit(limit)
    .all();
}

/**
 * Search artworks by title or description
 */
export async function searchArtworks(searchTerm: string) {
  return await queryCollection("art")
    .where("title", "LIKE", `%${searchTerm}%`)
    .orWhere((group) =>
      group.where("description", "LIKE", `%${searchTerm}%`),
    )
    .all();
}

export function isEcholotlArtwork(artwork: Art): boolean {
  return (
    !artwork.artist || artwork.artist.name.trim().toLowerCase() === "echolotl"
  );
}
