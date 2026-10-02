import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/media/jobRunner';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> | { jobId: string } }
) {
  const resolvedParams = await Promise.resolve(context.params);
  const { jobId } = resolvedParams;

  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'Job ID missing' }, { status: 400 });
  }

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      type: job.type,
      outputUrl: job.outputUrl,
      outputFilename: job.outputFilename,
      errorMessage: job.errorMessage,
    },
  });
}
