import { Type } from '@sinclair/typebox';
import { HHMM_PATTERN } from '../lib/time';
import { EdgeDto, ErrorResponse, NodeDto, UUID_PATTERN } from './common';

export const PeakWindowDto = Type.Object({
  start: Type.String({ pattern: HHMM_PATTERN }),
  end: Type.String({ pattern: HHMM_PATTERN }),
});

export const UploadNetworkBody = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    edges: Type.Array(EdgeDto, { minItems: 1 }),
    nodes: Type.Optional(Type.Array(NodeDto)),
    peakWindows: Type.Optional(Type.Array(PeakWindowDto)),
  },
  { additionalProperties: false },
);

export const UploadNetworkReply = Type.Object({
  networkId: Type.String({ pattern: UUID_PATTERN }),
});

export const NetworkIdParam = Type.Object({
  id: Type.String({ pattern: UUID_PATTERN }),
});

export const NodesReply = Type.Object({
  networkId: Type.String({ pattern: UUID_PATTERN }),
  nodes: Type.Array(NodeDto),
});

export { ErrorResponse };
