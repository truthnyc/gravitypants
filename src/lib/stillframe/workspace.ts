let current: string | null = null;
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
