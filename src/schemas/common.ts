import { Type } from '@sinclair/typebox';

export const UUID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

export const ErrorResponse = Type.Object({
  error: Type.Object({ code: Type.String(), message: Type.String() }),
});

export const NodeDto = Type.Object({
  key: Type.String({ minLength: 1 }),
  x: Type.Optional(Type.Number()),
  y: Type.Optional(Type.Number()),
});

export const EdgeDto = Type.Object({
  from: Type.String({ minLength: 1 }),
  to: Type.String({ minLength: 1 }),
  cost: Type.Number({ minimum: 0 }),
  maxWeight: Type.Optional(Type.Number({ minimum: 0 })),
  noHazardous: Type.Optional(Type.Boolean()),
  trafficMultiplier: Type.Optional(Type.Number({ minimum: 0 })),
});
