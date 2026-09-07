import type { Static } from '@sinclair/typebox';
import type { UploadNetworkBody } from '../schemas/network';

export type CreateNetworkInput = Static<typeof UploadNetworkBody>;

export interface NodesResult {
  networkId: string;
  nodes: { key: string; x?: number; y?: number }[];
}

export async function createNetwork(_input: CreateNetworkInput): Promise<{ networkId: string }> {
  throw new Error('not implemented');
}

export async function getNodes(_networkId: string): Promise<NodesResult | null> {
  throw new Error('not implemented');
}
