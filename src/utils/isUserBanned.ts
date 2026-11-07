import { clerkClient } from "@clerk/express";

// A session token outlives a ban by up to its 60 second lifetime, so this has
// to stay well below that or the lookup stops closing the gap.
const BAN_STATUS_TTL_MS = 15_000;
const MAX_CACHED_USERS = 10_000;

type CachedBanStatus = {
  banned: Promise<boolean>;
  expiresAt: number;
};

const banStatusCache = new Map<string, CachedBanStatus>();

async function fetchBanStatus(clerkId: string) {
  const user = await clerkClient.users.getUser(clerkId);
  return user.banned;
}

/**
 * Reads the user's ban status from the Clerk Backend API, because session tokens
 * are verified locally and do not reflect a ban.
 *
 * Results are cached per process for BAN_STATUS_TTL_MS. The promise is what gets
 * cached, so concurrent requests from one user share a single Clerk call.
 * Failures are not cached.
 *
 * @throws if Clerk cannot be reached. Callers must treat this as "not verified".
 */
export function isUserBanned(clerkId: string): Promise<boolean> {
  const now = Date.now();
  const cached = banStatusCache.get(clerkId);

  if (cached && cached.expiresAt > now) {
    return cached.banned;
  }

  // Remove the expired entry if it exists.
  banStatusCache.delete(clerkId);

  // Evict the oldest entry if the cache reaches its maximum capacity.
  if (banStatusCache.size >= MAX_CACHED_USERS) {
    const oldestKey = banStatusCache.keys().next().value;

    if (oldestKey !== undefined) {
      banStatusCache.delete(oldestKey);
    }
  }

  const banned = fetchBanStatus(clerkId);

  banStatusCache.set(clerkId, {
    banned,
    expiresAt: now + BAN_STATUS_TTL_MS,
  });

  banned.catch(() => {
    if (banStatusCache.get(clerkId)?.banned === banned) {
      banStatusCache.delete(clerkId);
    }
  });

  return banned;
}

export function clearBanStatusCache(): void {
  banStatusCache.clear();
}
