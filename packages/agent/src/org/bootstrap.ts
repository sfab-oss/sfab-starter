export function resolveTurnUserId(
  connection: { id: string } | undefined,
  connectionUsers: ReadonlyMap<string, string>,
  agentName: string
): string {
  if (!connection) {
    throw new Error(
      `OrgAgent ${agentName}: no active connection for this turn`
    );
  }
  const userId = connectionUsers.get(connection.id);
  if (!userId) {
    throw new Error(
      `OrgAgent ${agentName}: connection ${connection.id} has no resolved user`
    );
  }
  return userId;
}
