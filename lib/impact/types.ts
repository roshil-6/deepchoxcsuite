export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ImpactResult {
    source: string;
    strategic: number;
    financial: number;
    operational: number;
    market: number;
    execution: number;
    severity: Severity;
    confidence: number;
    affectedRoles: string[];
    recommendations: string[];
    timestamp: string;
}

export interface AggregatedImpact extends ImpactResult {
    trend?: 'up' | 'down' | 'stable';
    requiresEscalation: boolean;
}

export type ImpactSnapshot = AggregatedImpact & { createdAt: string };
