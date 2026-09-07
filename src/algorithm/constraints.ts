import type { GraphEdge, VehicleProfile } from '../domain/types';

export function canTraverse(edge: GraphEdge, vehicle: VehicleProfile): boolean {
  if (edge.maxWeight != null && vehicle.weight > edge.maxWeight) {
    return false;
  }
  if (edge.noHazardous === true && vehicle.hazardous === true) {
    return false;
  }
  return true;
}
