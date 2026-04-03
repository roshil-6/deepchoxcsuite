import type { CFOResponse } from '@/lib/orchestrator/types';
import { cfoToAggregatedImpact } from './adapters/cfoAdapter';
import { getAffectedDesks } from './impactEngine';

/**
 * Desk routing for orchestration: uses unified CFO impact + score rules.
 */
export function deskRoutingFromCfo(cfo: CFOResponse): string[] {
    return getAffectedDesks(cfoToAggregatedImpact(cfo));
}
