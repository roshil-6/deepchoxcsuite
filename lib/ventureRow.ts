import type { Project } from '@/lib/projectTypes';

/** Plain JSON object for `Venture.dataJson` (drops functions/undefined; BigInt → string). */
export function projectToDataJson(project: Project): object {
    const { id: _id, ...rest } = project;
    let s: string;
    try {
        s = JSON.stringify(rest, (_key, value) => (typeof value === 'bigint' ? String(value) : value));
    } catch {
        throw new Error('project_not_json_serializable');
    }
    return JSON.parse(s) as object;
}

export function rowToProject(row: { id: number; name: string; dataJson: unknown }): Project {
  const defaults: Omit<Project, 'id'> = {
    name: row.name,
    timestamp: Date.now(),
    strategy: '{}',
    productPlan: '',
    budget: '',
    marketInsights: '',
    userNotes: '',
    teamDirectives: '',
    onboardingData: '{}',
    journal: [],
    events: [],
    files: [],
    orgStructure: [],
    kanban: [],
    diary: [],
    deskDocuments: [],
  };
  const blob =
    typeof row.dataJson === 'object' && row.dataJson !== null && !Array.isArray(row.dataJson)
      ? (row.dataJson as Record<string, unknown>)
      : {};
  const merged = { ...defaults, ...blob, name: row.name };
  return { ...(merged as Project), id: row.id };
}
