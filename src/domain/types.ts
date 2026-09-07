export interface GraphNode {
  key: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  fromKey: string;
  toKey: string;
  cost: number;
  maxWeight?: number | null;
  noHazardous?: boolean;
  trafficMultiplier?: number;
}

export interface PeakWindow {
  /** minute of day, 0..1439 */
  startMinute: number;
  endMinute: number;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  /** fromKey -> outgoing edges */
  adjacency: Map<string, GraphEdge[]>;
  /** min(cost / euclideanLength) over edges; null/undefined when any edge endpoint lacks coordinates */
  heuristicScale?: number | null;
  /** traffic multiplier windows for this network; empty means never peak */
  peakWindows: PeakWindow[];
}

export interface VehicleProfile {
  type?: string;
  weight: number;
  hazardous: boolean;
}

export interface RouteRequest {
  originNodeId: string;
  destinationNodeId: string;
  waypoints?: string[];
  vehicleProfile: VehicleProfile;
  /** "HH:MM" 24-hour */
  departureTime: string;
}

export interface PathSegment {
  path: string[];
  cost: number;
}

export interface RouteResult {
  totalCost: number;
  path: string[];
  hops: number;
}

export type RouteErrorCode = 'INVALID_NODE' | 'NO_ROUTE';

export class RouteError extends Error {
  readonly code: RouteErrorCode;
  constructor(code: RouteErrorCode, message: string) {
    super(message);
    this.name = 'RouteError';
    this.code = code;
  }
}

export type PlanOutcome =
  | { ok: true; result: RouteResult }
  | { ok: false; error: { code: RouteErrorCode; message: string } };

/** (nodeKey, goalKey) -> estimated remaining cost; must never overestimate */
export type HeuristicFn = (nodeKey: string, goalKey: string) => number;

/** Resolves the shortest single leg between two nodes, or null if none exists. May be async (a later slice backs it with a database). */
export type SegmentResolver = (
  fromKey: string,
  toKey: string,
) => Promise<PathSegment | null> | PathSegment | null;
