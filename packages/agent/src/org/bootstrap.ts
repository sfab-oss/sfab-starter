export function resolveTurnUserId(
  connection: { id: string; state: unknown } | undefined,
  agentName: string
): string {
  if (!connection) {
    throw new Error(
      `OrgAgent ${agentName}: no active connection for this turn`
    );
  }
  // The user id is persisted on the connection attachment in onConnect, so it
  // survives DO hibernation (see OrgChat.onConnect → connection.setState).
  const userId = (connection.state as { userId?: string } | null | undefined)
    ?.userId;
  if (!userId) {
    throw new Error(
      `OrgAgent ${agentName}: connection ${connection.id} has no resolved user`
    );
  }
  return userId;
}
