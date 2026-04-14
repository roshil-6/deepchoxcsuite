export type { AggregatedImpact, ImpactResult, ImpactSnapshot, Severity } from './types';
export {
    aggregateImpact,
    createImpactSnapshot,
    generateActionItems,
    getAffectedDesks,
} from './impactEngine';
export { deskRoutingFromCfo } from './orchestratorBridge';
export { intelLegacyLabelFromTitle, intelTitleToImpactResult, intelLegacyLabelToImpactResult } from './adapters/intelAdapter';
export type { IntelLegacyLabel } from './adapters/intelAdapter';
export { cfoToImpactResult, cfoToAggregatedImpact } from './adapters/cfoAdapter';
export { wargameStatsToImpactResult } from './adapters/wargameAdapter';
export type { WargameStats } from './adapters/wargameAdapter';
export { fromExecutionScore, fromVenturePillarScores } from './adapters/dashboardAdapter';
export { fromAnalysisResult } from './adapters/analysisAdapter';
export { average, clampScore } from './utils/scoring';
export { deriveSeverity } from './utils/severity';
export { mergeUniqueStrings } from './utils/merge';
