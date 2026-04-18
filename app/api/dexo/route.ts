import { NextResponse } from 'next/server';
import { POST as jarvisPost } from '@/app/api/jarvis/route';
import { POST as personalAssistantPost } from '@/app/api/personal-assistant/route';
import { POST as dailyPulsePost } from '@/app/api/dexo/daily-pulse/route';
import { GET as dailyReportsGet } from '@/app/api/dexo/daily-reports/route';
import { POST as dailyReportsApplyPost } from '@/app/api/dexo/daily-reports/apply/route';
import { GET as dexoConvoGet, POST as dexoConvoPost, DELETE as dexoConvoDelete } from '@/app/api/dexo-convo/route';
import { POST as agentSyncPost } from '@/app/api/agent-sync/route';
import { POST as focusBriefingPost } from '@/app/api/focus-briefing/route';
import { POST as cfoFundingSuggestPost } from '@/app/api/cfo-funding-suggest/route';
import { POST as onboardingExtractPost } from '@/app/api/onboarding-extract/route';
import { POST as relayMeetingRoomPost } from '@/app/api/relay-meeting-room/route';
import { POST as boardroomPost } from '@/app/api/boardroom/route';
import { POST as chatPost } from '@/app/api/chat/route';
import { POST as ventureRegistryPost } from '@/app/api/dexo/venture-registry/route';
import { GET as proposalsGet, POST as proposalsPost } from '@/app/api/dexo/proposals/route';
import { POST as proposalsApplyPost } from '@/app/api/dexo/proposals/apply/route';
import { POST as proposalsRejectPost } from '@/app/api/dexo/proposals/reject/route';
import { GET as actionQueueGet, POST as actionQueuePost } from '@/app/api/dexo/actions/queue/route';
import { POST as actionApprovePost } from '@/app/api/dexo/actions/approve/route';
import { POST as actionExecutePost } from '@/app/api/dexo/actions/execute/route';

type DexoAction =
  | 'jarvis'
  | 'personalAssistant'
  | 'dailyPulse'
  | 'dailyReportsList'
  | 'dailyReportApply'
  | 'dexoConvoGet'
  | 'dexoConvoPost'
  | 'dexoConvoDelete'
  | 'agentSync'
  | 'focusBriefing'
  | 'cfoFundingSuggest'
  | 'onboardingExtract'
  | 'relayMeetingRoom'
  | 'boardroom'
  | 'chat'
  | 'ventureRegistryUpsert'
  | 'proposalCreate'
  | 'proposalList'
  | 'proposalApply'
  | 'proposalReject'
  | 'actionQueueList'
  | 'actionQueueCreate'
  | 'actionQueueApprove'
  | 'actionQueueExecute';

type DexoRequestBody = {
  action?: DexoAction;
  payload?: unknown;
};

function toJsonRequest(req: Request, payload: unknown): Request {
  return new Request(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
}

function toQueryRequest(req: Request, pathname: string, query: Record<string, unknown>): Request {
  const url = new URL(req.url);
  url.pathname = pathname;
  url.search = '';
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.set(k, String(v));
  });
  return new Request(url.toString(), { method: 'GET' });
}

function toDeleteQueryRequest(req: Request, pathname: string, query: Record<string, unknown>): Request {
  const url = new URL(req.url);
  url.pathname = pathname;
  url.search = '';
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.set(k, String(v));
  });
  return new Request(url.toString(), { method: 'DELETE' });
}

export async function POST(req: Request) {
  let body: DexoRequestBody;
  try {
    body = (await req.json()) as DexoRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action;
  const payload = body.payload ?? {};
  if (!action) {
    return NextResponse.json({ ok: false, error: 'action is required' }, { status: 400 });
  }

  switch (action) {
    case 'jarvis':
      return jarvisPost(toJsonRequest(req, payload));
    case 'personalAssistant':
      return personalAssistantPost(toJsonRequest(req, payload));
    case 'dailyPulse':
      return dailyPulsePost(toJsonRequest(req, payload));
    case 'dailyReportsList': {
      const p = (payload ?? {}) as { ventureId?: number; limit?: number };
      return dailyReportsGet(toQueryRequest(req, '/api/dexo/daily-reports', { ventureId: p.ventureId, limit: p.limit }));
    }
    case 'dailyReportApply':
      return dailyReportsApplyPost(toJsonRequest(req, payload));
    case 'dexoConvoGet': {
      const p = (payload ?? {}) as { ventureId?: number };
      return dexoConvoGet(toQueryRequest(req, '/api/dexo-convo', { ventureId: p.ventureId }));
    }
    case 'dexoConvoPost':
      return dexoConvoPost(toJsonRequest(req, payload));
    case 'dexoConvoDelete': {
      const p = (payload ?? {}) as { ventureId?: number };
      return dexoConvoDelete(toDeleteQueryRequest(req, '/api/dexo-convo', { ventureId: p.ventureId }));
    }
    case 'agentSync':
      return agentSyncPost(toJsonRequest(req, payload));
    case 'focusBriefing':
      return focusBriefingPost(toJsonRequest(req, payload));
    case 'cfoFundingSuggest':
      return cfoFundingSuggestPost(toJsonRequest(req, payload));
    case 'onboardingExtract':
      return onboardingExtractPost(toJsonRequest(req, payload));
    case 'relayMeetingRoom':
      return relayMeetingRoomPost(toJsonRequest(req, payload));
    case 'boardroom':
      return boardroomPost(toJsonRequest(req, payload));
    case 'chat':
      return chatPost(toJsonRequest(req, payload));
    case 'ventureRegistryUpsert':
      return ventureRegistryPost(toJsonRequest(req, payload));
    case 'proposalCreate':
      return proposalsPost(toJsonRequest(req, payload));
    case 'proposalList': {
      const p = (payload ?? {}) as { ventureId?: number; status?: string; take?: number };
      return proposalsGet(
        toQueryRequest(req, '/api/dexo/proposals', {
          ventureId: p.ventureId,
          status: p.status,
          take: p.take,
        })
      );
    }
    case 'proposalApply':
      return proposalsApplyPost(toJsonRequest(req, payload));
    case 'proposalReject':
      return proposalsRejectPost(toJsonRequest(req, payload));
    case 'actionQueueList': {
      const p = (payload ?? {}) as { ventureId?: number; status?: string; take?: number };
      return actionQueueGet(
        toQueryRequest(req, '/api/dexo/actions/queue', {
          ventureId: p.ventureId,
          status: p.status,
          take: p.take,
        })
      );
    }
    case 'actionQueueCreate':
      return actionQueuePost(toJsonRequest(req, payload));
    case 'actionQueueApprove':
      return actionApprovePost(toJsonRequest(req, payload));
    case 'actionQueueExecute':
      return actionExecutePost(toJsonRequest(req, payload));
    default:
      return NextResponse.json({ ok: false, error: `Unknown action: ${String(action)}` }, { status: 400 });
  }
}
