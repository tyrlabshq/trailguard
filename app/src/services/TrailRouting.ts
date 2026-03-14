/**
 * TrailRouting Service — TG-11
 *
 * Builds a graph from cached OSM trail segments and suggests
 * connected routes from the rider's current snapped position.
 *
 * Design:
 *   - Nodes are deduplicated endpoint coordinates (within a 15m tolerance)
 *   - Edges are trail segments with cost = length * difficulty_multiplier
 *   - Route suggestions = top-3 nearby reachable loops/destinations
 *   - Avoids road segments when building the graph
 */

import { haversineM, getTrailsGeoJSON, type TrailDifficulty, type TrailSegment } from './TrailSnapping';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RouteNode {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteEdge {
  fromId: string;
  toId: string;
  segment: TrailSegment;
  /** Approximate length in metres. */
  lengthM: number;
  /** Routing cost (length × difficulty multiplier). Lower = preferred. */
  cost: number;
}

export interface RouteSuggestion {
  name: string;
  difficulty: TrailDifficulty;
  /** Total estimated distance in metres. */
  totalDistanceM: number;
  /** GeoJSON LineString for map display. */
  path: GeoJSON.Feature<GeoJSON.LineString>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Node deduplication tolerance in metres. */
const NODE_MERGE_DIST_M = 15;

/** Difficulty multipliers (harder trails cost more in routing). */
const DIFFICULTY_COST: Record<TrailDifficulty, number> = {
  easy: 1.0,
  moderate: 1.5,
  hard: 2.5,
  expert: 4.0,
  unknown: 1.2,
};

// ─── Graph construction ──────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  edges: RouteEdge[];
}

type Graph = Map<string, GraphNode>;

function nodeKey(lat: number, lng: number): string {
  // ~1m resolution grid snap for deduplication
  return `${(lat * 100_000).toFixed(0)},${(lng * 100_000).toFixed(0)}`;
}

/**
 * Build a routing graph from the current trail GeoJSON.
 * Only non-road segments are included.
 */
export function buildTrailGraph(): Graph {
  const geojson = getTrailsGeoJSON();
  const graph: Graph = new Map();

  // Helper: find or create a node for a coordinate
  const findOrCreate = (lat: number, lng: number): GraphNode => {
    const key = nodeKey(lat, lng);

    // Check nearby existing nodes to merge close-together endpoints
    for (const [, node] of graph) {
      if (haversineM(lat, lng, node.lat, node.lng) < NODE_MERGE_DIST_M) {
        return node;
      }
    }

    const node: GraphNode = { id: key, lat, lng, edges: [] };
    graph.set(key, node);
    return node;
  };

  for (const feature of geojson.features) {
    if (feature.geometry.type !== 'LineString') continue;
    const coords = feature.geometry.coordinates as [number, number][];
    if (coords.length < 2) continue;

    const props = feature.properties as {
      id: string;
      name: string;
      difficulty: TrailDifficulty;
      trailType: string;
    };

    // Build a synthetic TrailSegment from the GeoJSON feature
    const segment: TrailSegment = {
      id: props.id,
      name: props.name,
      difficulty: props.difficulty,
      trailType: props.trailType,
      isRoad: false,
      coordinates: coords,
      tags: {},
    };

    // Calculate total segment length
    let lengthM = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [aLng, aLat] = coords[i];
      const [bLng, bLat] = coords[i + 1];
      lengthM += haversineM(aLat, aLng, bLat, bLng);
    }

    const cost = lengthM * (DIFFICULTY_COST[props.difficulty] ?? 1.2);

    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];

    const startNode = findOrCreate(startLat, startLng);
    const endNode = findOrCreate(endLat, endLng);

    const edgeFwd: RouteEdge = {
      fromId: startNode.id,
      toId: endNode.id,
      segment,
      lengthM,
      cost,
    };
    const edgeRev: RouteEdge = {
      fromId: endNode.id,
      toId: startNode.id,
      segment: { ...segment, coordinates: [...coords].reverse() as [number, number][] },
      lengthM,
      cost,
    };

    startNode.edges.push(edgeFwd);
    endNode.edges.push(edgeRev);
  }

  return graph;
}

// ─── Dijkstra ────────────────────────────────────────────────────────────────

interface DijkstraResult {
  distances: Map<string, number>;
  prev: Map<string, string | null>;
}

function dijkstra(graph: Graph, startId: string): DijkstraResult {
  const distances = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of graph.keys()) {
    distances.set(id, Infinity);
    prev.set(id, null);
  }
  distances.set(startId, 0);

  // Simple priority queue via sorted array (fine for small graphs <500 nodes)
  const queue: { id: string; cost: number }[] = [{ id: startId, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const node = graph.get(current.id);
    if (!node) continue;

    for (const edge of node.edges) {
      if (visited.has(edge.toId)) continue;
      const newDist = (distances.get(current.id) ?? Infinity) + edge.cost;
      if (newDist < (distances.get(edge.toId) ?? Infinity)) {
        distances.set(edge.toId, newDist);
        prev.set(edge.toId, current.id);
        queue.push({ id: edge.toId, cost: newDist });
      }
    }
  }

  return { distances, prev };
}

function reconstructPath(prev: Map<string, string | null>, targetId: string): string[] {
  const path: string[] = [];
  let cur: string | null | undefined = targetId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return path;
}

// ─── Route suggestion ────────────────────────────────────────────────────────

/**
 * Suggest up to `maxSuggestions` connected trail routes from the rider's
 * current position (lat/lng on a snapped trail).
 *
 * Returns routes sorted by total distance (shortest first).
 */
export function suggestRoutes(
  lat: number,
  lng: number,
  maxSuggestions = 3,
): RouteSuggestion[] {
  const graph = buildTrailGraph();
  if (graph.size === 0) return [];

  // Find nearest graph node to the current position
  let nearestId: string | null = null;
  let nearestDist = Infinity;

  for (const [id, node] of graph) {
    const d = haversineM(lat, lng, node.lat, node.lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearestId = id;
    }
  }

  if (!nearestId || nearestDist > 200) return []; // No nearby node

  const { distances, prev } = dijkstra(graph, nearestId);

  // Collect reachable nodes sorted by distance, pick varied difficulties
  const reachable: { id: string; dist: number; node: GraphNode }[] = [];
  for (const [id, dist] of distances) {
    if (dist === Infinity || dist === 0) continue;
    const node = graph.get(id);
    if (!node) continue;
    reachable.push({ id, dist, node });
  }

  // Sort by distance, then pick top candidates at varied distances
  reachable.sort((a, b) => a.dist - b.dist);

  // Pick targets: spread across short/medium/long ranges
  const targets: typeof reachable = [];
  const thresholds = [1_500, 5_000, 15_000]; // metres (approx, via cost)

  for (const threshold of thresholds) {
    const candidate = reachable.find(
      (r) => r.dist > threshold * 0.7 && r.dist < threshold * 1.5 && !targets.includes(r),
    );
    if (candidate) targets.push(candidate);
  }

  // Fill remaining slots from sorted list
  for (const r of reachable) {
    if (targets.length >= maxSuggestions) break;
    if (!targets.includes(r)) targets.push(r);
  }

  const suggestions: RouteSuggestion[] = [];

  for (const target of targets.slice(0, maxSuggestions)) {
    const pathIds = reconstructPath(prev, target.id);
    if (pathIds.length < 2) continue;

    // Build coordinate array from path nodes
    const pathCoords: [number, number][] = [];
    let totalDistM = 0;
    let dominantDifficulty: TrailDifficulty = 'unknown';
    let maxDifficultyWeight = 0;
    let routeName = '';

    for (let i = 0; i < pathIds.length - 1; i++) {
      const fromNode = graph.get(pathIds[i]);
      const toNode = graph.get(pathIds[i + 1]);
      if (!fromNode || !toNode) continue;

      // Find the edge between these nodes
      const edge = fromNode.edges.find((e) => e.toId === pathIds[i + 1]);
      if (!edge) continue;

      totalDistM += edge.lengthM;

      const weight = DIFFICULTY_COST[edge.segment.difficulty] * edge.lengthM;
      if (weight > maxDifficultyWeight) {
        maxDifficultyWeight = weight;
        dominantDifficulty = edge.segment.difficulty;
        if (!routeName) routeName = edge.segment.name;
      }

      // Add segment coordinates (avoid duplicating shared endpoints)
      const segCoords = edge.segment.coordinates;
      if (pathCoords.length === 0) {
        pathCoords.push(...segCoords);
      } else {
        pathCoords.push(...segCoords.slice(1));
      }
    }

    if (pathCoords.length < 2) continue;

    suggestions.push({
      name: routeName || `Route ${suggestions.length + 1}`,
      difficulty: dominantDifficulty,
      totalDistanceM: totalDistM,
      path: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pathCoords },
        properties: {
          difficulty: dominantDifficulty,
          distanceM: totalDistM,
        },
      },
    });
  }

  return suggestions;
}

/** Format a distance for display (m / km). */
export function formatDistanceM(metres: number): string {
  if (metres < 1_000) return `${Math.round(metres)} m`;
  return `${(metres / 1_000).toFixed(1)} km`;
}
