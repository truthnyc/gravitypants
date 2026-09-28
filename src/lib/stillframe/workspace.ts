let current: string | null = null;
const activeWorkspaceKey = (userId: string) => `gravity-pants:workspace:${userId}`;
/** The signed-in user's active workspace (set by the sign-in gate). */
export function getWorkspaceId(): string {
  if (!current) throw new Error("No active workspace");
  return current;
}
export function setWorkspaceId(id: string | null) {
  current = id;
}
/** Active workspace if the sign-in gate has set one, else null. */
export function peekWorkspaceId(): string | null {
  return current;
}

/** The route gate verifies membership before using this per-user preference. */
export function rememberWorkspaceId(userId: string, id: string) {
  window.localStorage.setItem(activeWorkspaceKey(userId), id);
  setWorkspaceId(id);
}

export function preferredWorkspaceId(userId: string): string | null {
  return window.localStorage.getItem(activeWorkspaceKey(userId));
}

export function forgetWorkspaceId(userId: string) {
  window.localStorage.removeItem(activeWorkspaceKey(userId));
  setWorkspaceId(null);
}
