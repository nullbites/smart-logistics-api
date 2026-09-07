import { Type } from '@sinclair/typebox';
import { HHMM_PATTERN } from '../lib/time';

export const VehicleProfileDto = Type.Object({
  type: Type.Optional(Type.String({ minLength: 1 })),
  weight: Type.Number({ minimum: 0 }),
  hazardous: Type.Boolean(),
});

export const OptimizeBody = Type.Object(
  {
    originNodeId: Type.String({ minLength: 1 }),
    destinationNodeId: Type.String({ minLength: 1 }),
    waypoints: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    vehicleProfile: VehicleProfileDto,
    departureTime: Type.String({ pattern: HHMM_PATTERN }),
  },
  { additionalProperties: false },
);

export const OptimizeReply = Type.Object({ jobId: Type.String() });

export const JobIdParam = Type.Object({ jobId: Type.String({ minLength: 1 }) });

export const RouteResultDto = Type.Object({
  graphId: Type.String(),
  totalCost: Type.Number(),
  path: Type.Array(Type.String()),
  durationMs: Type.Number(),
});

export const StatusReply = Type.Union([
  Type.Object({ status: Type.Union([Type.Literal('PENDING'), Type.Literal('RUNNING')]) }),
  Type.Object({ status: Type.Literal('COMPLETED'), result: RouteResultDto }),
  Type.Object({
    status: Type.Literal('FAILED'),
    error: Type.Object({ code: Type.String(), message: Type.String() }),
  }),
]);
