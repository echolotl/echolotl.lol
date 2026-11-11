export interface AuthenticatedUser {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
  anonymous: boolean;
  shouldSync: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PublicUser {
  id: string | null;
  userId: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
}

export interface CommentNode {
  id: number;
  slug: string;
  parentId: number | null;
  body: string;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  author: PublicUser | null;
  replyCount: number;
}

export interface Status {
  id: number;
  text: string;
  emoji: string | null;
  createdAt: number;
}

export interface SpotifyResponse {
  playing: boolean;
  title: string;
  href: string;
  durationMs: number;
  progressMs: number;
  artists: {
    name: string;
    href: string;
  }[];
  album: {
    name: string;
    href: string;
    imageUrl: string | null;
  };
}
