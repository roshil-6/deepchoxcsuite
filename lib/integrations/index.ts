export type IntegrationActionKind =
  | 'email.send'
  | 'calendar.create_event'
  | 'crm.create_lead'
  | 'pm.create_task';

export type IntegrationExecutionResult = {
  ok: boolean;
  externalId?: string;
  message: string;
};

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Dry-run safe adapter set. Replace internals with real providers when credentials/integrations are configured.
 */
export async function executeIntegrationAction(kind: string, payload: Record<string, unknown>): Promise<IntegrationExecutionResult> {
  switch (kind as IntegrationActionKind) {
    case 'email.send':
      return { ok: true, externalId: randomId('mail'), message: `Dry-run email queued to ${String(payload.to ?? 'unknown')}` };
    case 'calendar.create_event':
      return { ok: true, externalId: randomId('cal'), message: `Dry-run calendar event created: ${String(payload.title ?? 'Untitled')}` };
    case 'crm.create_lead':
      return { ok: true, externalId: randomId('lead'), message: `Dry-run CRM lead created: ${String(payload.name ?? 'Unknown')}` };
    case 'pm.create_task':
      return { ok: true, externalId: randomId('task'), message: `Dry-run PM task created: ${String(payload.title ?? 'Untitled')}` };
    default:
      return { ok: false, message: `Unsupported action kind: ${kind}` };
  }
}
