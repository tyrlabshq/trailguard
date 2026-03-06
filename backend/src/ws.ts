import WebSocket from 'ws';

export interface WsClient {
  ws: WebSocket;
  riderId: string;
  groupId: string;
}

/** groupId -> Set of connected clients */
const groups = new Map<string, Set<WsClient>>();

/** riderId -> WsClient for quick lookup */
const riders = new Map<string, WsClient>();

export function addClient(client: WsClient) {
  riders.set(client.riderId, client);
  let group = groups.get(client.groupId);
  if (!group) {
    group = new Set();
    groups.set(client.groupId, group);
  }
  group.add(client);
}

export function removeClient(client: WsClient) {
  riders.delete(client.riderId);
  const group = groups.get(client.groupId);
  if (group) {
    group.delete(client);
    if (group.size === 0) groups.delete(client.groupId);
  }
}

/** Broadcast a message to all clients in a group */
export function broadcastToGroup(groupId: string, message: object, excludeRiderId?: string) {
  const group = groups.get(groupId);
  if (!group) return;
  const payload = JSON.stringify(message);
  for (const client of group) {
    if (excludeRiderId && client.riderId === excludeRiderId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function getGroupClients(groupId: string): Set<WsClient> | undefined {
  return groups.get(groupId);
}

export function getClientByRider(riderId: string): WsClient | undefined {
  return riders.get(riderId);
}
