import type { Static } from '@sinclair/typebox';
import { computeHeuristicScale } from '../algorithm/heuristic';
import { prisma } from '../db/client';
import type { GraphEdge, GraphNode } from '../domain/types';
import { DEFAULT_PEAK_WINDOWS, parseHhMm } from '../lib/time';
import type { UploadNetworkBody } from '../schemas/network';

export type CreateNetworkInput = Static<typeof UploadNetworkBody>;

export interface NodesResult {
  networkId: string;
  nodes: { key: string; x?: number; y?: number }[];
}

export async function createNetwork(input: CreateNetworkInput): Promise<{ networkId: string }> {
  const nodeInputByKey = new Map<string, { key: string; x?: number; y?: number }>();
  for (const node of input.nodes ?? []) {
    nodeInputByKey.set(node.key, node);
  }

  const keys = new Set<string>();
  for (const edge of input.edges) {
    keys.add(edge.from);
    keys.add(edge.to);
  }
  for (const key of nodeInputByKey.keys()) {
    keys.add(key);
  }

  const graphNodes: GraphNode[] = [];
  for (const key of keys) {
    const match = nodeInputByKey.get(key);
    graphNodes.push({ key, x: match?.x, y: match?.y });
  }

  const graphEdges: GraphEdge[] = input.edges.map((e) => ({
    fromKey: e.from,
    toKey: e.to,
    cost: e.cost,
    maxWeight: e.maxWeight ?? null,
    noHazardous: e.noHazardous ?? false,
    trafficMultiplier: e.trafficMultiplier ?? 1,
  }));

  const heuristicScale = computeHeuristicScale(graphNodes, graphEdges);

  const peakWindows: { startMinute: number; endMinute: number }[] =
    input.peakWindows === undefined
      ? DEFAULT_PEAK_WINDOWS.map((w) => ({ startMinute: w.startMinute, endMinute: w.endMinute }))
      : input.peakWindows.map((w) => ({
          startMinute: parseHhMm(w.start),
          endMinute: parseHhMm(w.end),
        }));

  const network = await prisma.$transaction(async (tx) => {
    const created = await tx.network.create({
      data: { name: input.name ?? null, heuristicScale },
    });

    await tx.node.createMany({
      data: graphNodes.map((n) => ({
        networkId: created.id,
        key: n.key,
        x: n.x ?? null,
        y: n.y ?? null,
      })),
    });

    await tx.edge.createMany({
      data: input.edges.map((e) => ({
        networkId: created.id,
        fromKey: e.from,
        toKey: e.to,
        cost: e.cost,
        maxWeight: e.maxWeight ?? null,
        noHazardous: e.noHazardous ?? false,
        trafficMultiplier: e.trafficMultiplier ?? 1,
      })),
    });

    if (peakWindows.length > 0) {
      await tx.networkPeakWindow.createMany({
        data: peakWindows.map((w) => ({
          networkId: created.id,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
        })),
      });
    }

    return created;
  });

  return { networkId: network.id };
}

export async function getNodes(networkId: string): Promise<NodesResult | null> {
  const network = await prisma.network.findUnique({
    where: { id: networkId },
    select: { id: true, nodes: { select: { key: true, x: true, y: true } } },
  });

  if (network === null) {
    return null;
  }

  return {
    networkId: network.id,
    nodes: network.nodes.map((n) => ({
      key: n.key,
      ...(n.x !== null ? { x: n.x } : {}),
      ...(n.y !== null ? { y: n.y } : {}),
    })),
  };
}
