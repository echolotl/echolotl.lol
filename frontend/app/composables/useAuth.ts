export interface AuthenticatedUser {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
  anonymous: boolean;
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

type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

let authInstance: ReturnType<typeof createAuth> | null = null;

const anonymousAvatars = [
  "king",
  "orchy",
  "glory",
  "mino",
  "nautilus",
  "kitral",
  "ishes",
];

const mockUser: AuthenticatedUser = {
  id: "1234123412341234",
  userId: "1234123412341234",
  username: "account",
  displayName: "Account",
  avatarHash: null,
  anonymous: false,
  createdAt: 0,
  updatedAt: 0,
};

function getAnonymousAvatarUrl(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const index = hash % anonymousAvatars.length;
  return `/images/anonymous/${anonymousAvatars[index]}.webp`;
}

function getAvatarUrl(user: AuthenticatedUser | PublicUser | null, size = 128) {
  if (!user) return "/images/deletedavatar.webp";
  if (!user.id || !user.avatarHash) return getAnonymousAvatarUrl(user.userId);
  const animated = user.avatarHash.startsWith("a_");
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatarHash}.webp?size=${size}&animated=${animated}`;
}

function getDisplayName(
  user: AuthenticatedUser | PublicUser | null | undefined,
) {
  if (!user) return "";
  return user.displayName || user.username;
}

function toPublicUser(user: AuthenticatedUser): PublicUser {
  return {
    id: user.anonymous ? null : user.id,
    userId: user.userId,
    username: user.anonymous
      ? "anonymous" + user.userId.slice(0, 4)
      : user.username,
    avatarHash: user.anonymous ? null : user.avatarHash,
    displayName: user.anonymous ? "Anonymous" : user.displayName,
  };
}

function createAuth() {
  const user = ref<AuthenticatedUser | null>(null);
  const publicUser = computed(() =>
    user.value ? toPublicUser(user.value) : null,
  );
  const status = ref<AuthStatus>("idle");
  const error = ref<string | null>(null);

  const isLoggedIn = computed(() => status.value === "authenticated");

  function backendUrl() {
    return useRuntimeConfig().public.backendUrl as string;
  }

  function backendEnabled() {
    return useRuntimeConfig().public.backendEnabled as boolean;
  }

  async function fetchUser(): Promise<AuthenticatedUser | null> {
    if (!backendEnabled()) {
      user.value = null;
      status.value = "unauthenticated";
      error.value = null;
      return null;
    }

    status.value = "loading";
    error.value = null;
    try {
      const res = await fetch(`${backendUrl()}/auth/discord/me`, {
        credentials: "include",
      });

      if (res.status === 204) {
        user.value = null;
        status.value = "unauthenticated";
        return null;
      }
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = (await res.json()) as { user: AuthenticatedUser };
      user.value = data.user;
      status.value = "authenticated";
      return data.user;
    } catch (err) {
      console.error("Error fetching current user:", err);
      user.value = null;
      status.value = "error";
      error.value = err instanceof Error ? err.message : "Unknown error";
      return null;
    }
  }

  function login() {
    if (import.meta.client) {
      if (!backendEnabled()) {
        user.value = { ...mockUser };
        status.value = "authenticated";
        error.value = null;
        return;
      }

      window.location.href = `${backendUrl()}/auth/discord/`;
    }
  }

  async function logout() {
    if (!backendEnabled()) {
      user.value = null;
      status.value = "unauthenticated";
      return;
    }

    try {
      await fetch(`${backendUrl()}/auth/discord/logout`, {
        credentials: "include",
      });
    } catch (err) {
      console.error("Error logging out:", err);
    } finally {
      user.value = null;
      status.value = "unauthenticated";
    }
  }

  async function setAnonymous(
    anonymous: boolean,
  ): Promise<AuthenticatedUser | null> {
    if (!backendEnabled()) {
      if (!user.value) return null;
      user.value = { ...user.value, anonymous, updatedAt: Date.now() };
      return user.value;
    }

    const res = await fetch(`${backendUrl()}/auth/discord/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous }),
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = (await res.json()) as { user: AuthenticatedUser };
    user.value = data.user;
    return data.user;
  }

  async function deleteAccount() {
    if (!backendEnabled()) {
      user.value = null;
      status.value = "unauthenticated";
      return;
    }

    const res = await fetch(`${backendUrl()}/auth/discord/me`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    user.value = null;
    status.value = "unauthenticated";
  }

  async function getPublicUser(userId: string): Promise<PublicUser | null> {
    if (!backendEnabled()) {
      return userId === mockUser.userId ? toPublicUser(mockUser) : null;
    }

    try {
      const res = await fetch(
        `${backendUrl()}/auth/discord/user/${encodeURIComponent(userId)}`,
      );
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = (await res.json()) as { user: PublicUser };
      return data.user;
    } catch (err) {
      console.error("Error fetching public user:", err);
      return null;
    }
  }

  return {
    user,
    status,
    error,
    isLoggedIn,
    fetchUser,
    login,
    logout,
    setAnonymous,
    deleteAccount,
    getPublicUser,
    getAvatarUrl,
    getDisplayName,
    publicUser,
  };
}

export const useAuth = () => {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
};
