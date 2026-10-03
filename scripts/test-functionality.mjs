import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5555';

async function runTests() {
  console.log('====================================================');
  console.log('  CLAPFETCH PRODUCTION FUNCTIONALITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, isOk, details) {
    if (isOk) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   ${details}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${name}`);
      if (details) console.log(`   ${details}`);
      failed++;
    }
  }

  // ─── TEST 1: FFmpeg & FFprobe Binary Detection ───
  try {
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
    const ffprobeInstaller = await import('@ffprobe-installer/ffprobe');
    const ffmpegPath = ffmpegInstaller.default?.path || ffmpegInstaller.path;
    const ffprobePath = ffprobeInstaller.default?.path || ffprobeInstaller.path;

    const ffmpegExists = fs.existsSync(ffmpegPath);
    const ffprobeExists = fs.existsSync(ffprobePath);
    report(
      'FFmpeg Binary Installed & Detected',
      ffmpegExists && ffprobeExists,
      `ffmpeg: ${ffmpegPath} (${ffmpegExists ? 'OK' : 'MISSING'})\n   ffprobe: ${ffprobePath} (${ffprobeExists ? 'OK' : 'MISSING'})`
    );
  } catch (err) {
    report('FFmpeg Binary Check', false, err.message);
  }

  // ─── TEST 2: Generate a Test Video File via FFmpeg ───
  const testDir = path.resolve(process.cwd(), 'storage', 'test');
  fs.mkdirSync(testDir, { recursive: true });
  const sampleVideoPath = path.join(testDir, 'sample_test.mp4');

  try {
    const { execSync } = await import('child_process');
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
    const ffmpegPath = ffmpegInstaller.default?.path || ffmpegInstaller.path;

    // Generate a 6-second 1280x720 MP4 with test tone and moving color box
    if (!fs.existsSync(sampleVideoPath)) {
      console.log('   Generating 6-second synthetic MP4 for end-to-end testing...');
      execSync(`"${ffmpegPath}" -y -f lavfi -i testsrc=duration=6:size=1280x720:rate=30 -f lavfi -i sine=frequency=440:duration=6 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${sampleVideoPath}"`, { stdio: 'pipe' });
    }
    const stat = fs.statSync(sampleVideoPath);
    report('Synthetic Test Media Created', stat.size > 1000, `Size: ${Math.round(stat.size / 1024)} KB, Path: ${sampleVideoPath}`);
  } catch (err) {
    report('Synthetic Media Generation', false, err.message);
  }

  // ─── TEST 3: Upload API (`/api/upload`) ───
  let uploadedMedia = null;
  try {
    const fileBuffer = fs.readFileSync(sampleVideoPath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('file', blob, 'sample_test.mp4');

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Session-Id': 'test-session-123',
      },
    });

    const json = await res.json();
    if (res.ok && json.ok && json.media) {
      uploadedMedia = json.media;
      report(
        'Upload API & Media Inspection (ffprobe)',
        true,
        `Media ID: ${json.media.id}\n   Filename: ${json.media.filename}\n   Duration: ${json.media.durationSeconds}s\n   Resolution: ${json.media.width}x${json.media.height}\n   Codec: ${json.media.codec}\n   Storage: ${json.media.storagePath}`
      );
    } else {
      report('Upload API', false, JSON.stringify(json));
    }
  } catch (err) {
    report('Upload API', false, err.message);
  }

  // ─── TEST 4: Video Trim / Cut Job (`/api/process` type "cut") ───
  let cutJobId = null;
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'cut',
          params: { startMs: 1000, endMs: 4000, outputFormat: 'mp4' },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        cutJobId = json.jobId;
        report('Cut Job Submission', true, `Job ID: ${json.jobId}`);
      } else {
        report('Cut Job Submission', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Cut Job Submission', false, err.message);
    }
  }

  // ─── TEST 5: Job Status Polling & Output Verification ───
  if (cutJobId) {
    try {
      let attempts = 0;
      let completed = false;
      let lastJob = null;

      while (attempts < 15 && !completed) {
        await new Promise((r) => setTimeout(r, 1000));
        const res = await fetch(`${BASE_URL}/api/process/${cutJobId}`);
        const json = await res.json();
        lastJob = json.job;

        if (json.job?.status === 'completed') {
          completed = true;
          break;
        } else if (json.job?.status === 'failed') {
          break;
        }
        attempts++;
      }

      report(
        'Processing Job Completion & Status Polling',
        completed,
        `Status: ${lastJob?.status}, Progress: ${lastJob?.progress}%, Output: ${lastJob?.outputUrl}`
      );

      // Verify file download
      if (completed) {
        const dlRes = await fetch(`${BASE_URL}/api/download/${cutJobId}`);
        const dlContentType = dlRes.headers.get('content-type');
        const dlContentDisposition = dlRes.headers.get('content-disposition');
        const dlBuffer = await dlRes.arrayBuffer();

        report(
          'Download Streaming API (`/api/download/[outputId]`)',
          dlRes.ok && dlBuffer.byteLength > 1000,
          `HTTP: ${dlRes.status}, Content-Type: ${dlContentType}, Length: ${dlBuffer.byteLength} bytes\n   Disposition: ${dlContentDisposition}`
        );
      }
    } catch (err) {
      report('Job Polling & Download', false, err.message);
    }
  }

  // ─── TEST 6: Audio Extraction Job (`/api/process` type "audio_extract") ───
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'audio_extract',
          params: { format: 'mp3', bitrate: 320 },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        report('Audio Extraction to MP3', completed, `Job: ${json.jobId}, Completed: ${completed}`);

        if (completed) {
          const dlRes = await fetch(`${BASE_URL}/api/download/${json.jobId}`);
          const dlContentType = dlRes.headers.get('content-type');
          const dlBuffer = await dlRes.arrayBuffer();
          report(
            'Download Streaming API (MP3 Audio)',
            dlRes.ok && dlBuffer.byteLength > 1000 && dlContentType?.includes('audio'),
            `HTTP: ${dlRes.status}, Content-Type: ${dlContentType}, Length: ${dlBuffer.byteLength} bytes`
          );
        }
      } else {
        report('Audio Extraction Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Audio Extraction Job', false, err.message);
    }

    // TEST 6b: Audio Extraction to WAV & Download
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'audio_extract',
          params: { format: 'wav' },
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        if (completed) {
          const dlRes = await fetch(`${BASE_URL}/api/download/${json.jobId}`);
          const dlContentType = dlRes.headers.get('content-type');
          const dlBuffer = await dlRes.arrayBuffer();
          report(
            'Download Streaming API (WAV Audio)',
            dlRes.ok && dlBuffer.byteLength > 1000,
            `HTTP: ${dlRes.status}, Content-Type: ${dlContentType}, Length: ${dlBuffer.byteLength} bytes`
          );
        } else {
          report('Audio Extraction to WAV', false, 'Job did not complete');
        }
      }
    } catch (err) {
      report('Audio Extraction to WAV', false, err.message);
    }
  }

  // ─── TEST 7: iPhone Ringtone Job (M4R container, ≤30s) ───
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'ringtone',
          params: { startMs: 0, endMs: 5000, target: 'iphone', fadeIn: true, fadeOut: true },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        report('iPhone Ringtone Creation (M4R format)', completed, `Job: ${json.jobId}, Completed: ${completed}`);

        if (completed) {
          const dlRes = await fetch(`${BASE_URL}/api/download/${json.jobId}`);
          const dlContentType = dlRes.headers.get('content-type');
          const dlBuffer = await dlRes.arrayBuffer();
          report(
            'Download Streaming API (iPhone M4R Ringtone)',
            dlRes.ok && dlBuffer.byteLength > 1000,
            `HTTP: ${dlRes.status}, Content-Type: ${dlContentType}, Length: ${dlBuffer.byteLength} bytes`
          );
        }
      } else {
        report('Ringtone Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Ringtone Job', false, err.message);
    }
  }

  // ─── TEST 7b: Video Muting Job (`/api/process` type "mute") ───
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'mute',
          params: { startMs: 0, endMs: 6000 },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        report('Video Muting Job', completed, `Job: ${json.jobId}, Completed: ${completed}`);
      } else {
        report('Video Muting Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Video Muting Job', false, err.message);
    }
  }

  // ─── TEST 7c: Frame Grab Job (`/api/process` type "frame_grab") ───
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'frame_grab',
          params: { timestampMs: 1500, format: 'jpg' },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        report('Frame Grabber Job', completed, `Job: ${json.jobId}, Completed: ${completed}`);
      } else {
        report('Frame Grabber Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Frame Grabber Job', false, err.message);
    }
  }

  // ─── TEST 7d: Reel 9:16 Creation Job (`/api/process` type "reel") ───
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'reel',
          params: { startMs: 0, endMs: 3000, aspectRatio: '9:16' },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        report('Reel 9:16 Creation Job', completed, `Job: ${json.jobId}, Completed: ${completed}`);
      } else {
        report('Reel Creation Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Reel Creation Job', false, err.message);
    }
  }

  // ─── TEST 7e: Video Compression Job (`/api/process` type "compress") ───
  if (uploadedMedia) {
    try {
      const res = await fetch(`${BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: uploadedMedia.id,
          storagePath: uploadedMedia.storagePath,
          type: 'compress',
          params: { quality: 'smaller', resolution: '854x480' },
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.jobId) {
        let attempts = 0;
        let completed = false;
        while (attempts < 15 && !completed) {
          await new Promise((r) => setTimeout(r, 1000));
          const pRes = await fetch(`${BASE_URL}/api/process/${json.jobId}`);
          const pJson = await pRes.json();
          if (pJson.job?.status === 'completed') {
            completed = true;
            break;
          }
          attempts++;
        }
        report('Video Compression Job', completed, `Job: ${json.jobId}, Completed: ${completed}`);
      } else {
        report('Video Compression Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Video Compression Job', false, err.message);
    }
  }

  // ─── TEST 8: AI Clip Finder / Moment Locator (`/api/clip-finder`) ───
  try {
    const res = await fetch(`${BASE_URL}/api/clip-finder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'The breakthrough turning point',
        durationSeconds: 120,
        maxResults: 3,
      }),
    });

    const json = await res.json();
    const hasResults = Array.isArray(json.results) && json.results.length > 0;
    let validConstraints = true;

    if (hasResults) {
      for (const r of json.results) {
        const duration = r.end - r.start;
        if (duration < 5 || duration > 30) {
          validConstraints = false;
        }
      }
    }

    report(
      'AI Moment Locator (Clip Finder: 5–30s strictly enforced)',
      res.ok && hasResults && validConstraints,
      `Results count: ${json.results?.length}\n   Sample: ${json.results?.[0]?.startTime} -> ${json.results?.[0]?.endTime} (${json.results?.[0]?.durationSeconds}s)\n   Reason: "${json.results?.[0]?.reason}"\n   Strict 5-30s bounds: ${validConstraints ? 'PASSED' : 'VIOLATED'}`
    );
  } catch (err) {
    report('AI Moment Locator', false, err.message);
  }

  // ─── TEST 9: AI Subtitle Generation (`/api/subtitles` action: "generate") ───
  let generatedTrack = null;
  try {
    const res = await fetch(`${BASE_URL}/api/subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        mediaId: 'test-media-1',
        durationSeconds: 60,
        language: 'en',
      }),
    });

    const json = await res.json();
    const cuesValid = Array.isArray(json.track?.cues) && json.track.cues.length > 0;
    if (res.ok && json.ok && cuesValid) {
      generatedTrack = json.track;
      report(
        'AI Subtitle Generation (Timestamped Cues)',
        true,
        `Track ID: ${json.track.id}\n   Label: ${json.track.label}\n   Cues Count: ${json.track.cues.length}\n   Sample: [${json.track.cues[0].startTime}s -> ${json.track.cues[0].endTime}s] "${json.track.cues[0].text}"`
      );
    } else {
      report('AI Subtitle Generation', false, JSON.stringify(json));
    }
  } catch (err) {
    report('AI Subtitle Generation', false, err.message);
  }

  // ─── TEST 10: Subtitle Batch Translation (`/api/subtitles` action: "translate") ───
  if (generatedTrack) {
    try {
      const res = await fetch(`${BASE_URL}/api/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          track: generatedTrack,
          targetLanguage: 'es',
          targetLanguageLabel: 'Spanish',
        }),
      });

      const json = await res.json();
      const translationValid =
        json.ok &&
        Array.isArray(json.track?.cues) &&
        json.track.cues.length === generatedTrack.cues.length &&
        json.track.cues[0].startTime === generatedTrack.cues[0].startTime;

      report(
        'Subtitle Translation (Timing Preserved & Multi-Track)',
        res.ok && translationValid,
        `Label: ${json.track?.label}\n   Sample: "${json.track?.cues[0]?.text}"\n   Exact Timing Maintained: ${json.track?.cues[0]?.startTime === generatedTrack.cues[0].startTime ? 'YES' : 'NO'}`
      );
    } catch (err) {
      report('Subtitle Translation', false, err.message);
    }
  }

  // ─── TEST 11: Subtitle Export (SRT & VTT) ───
  if (generatedTrack) {
    try {
      const srtRes = await fetch(`${BASE_URL}/api/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          cues: generatedTrack.cues,
          format: 'srt',
        }),
      });

      const srtText = await srtRes.text();
      const srtValid = srtText.includes('-->') && srtText.includes('1\n');

      const vttRes = await fetch(`${BASE_URL}/api/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          cues: generatedTrack.cues,
          format: 'vtt',
        }),
      });

      const vttText = await vttRes.text();
      const vttValid = vttText.startsWith('WEBVTT') && vttText.includes('-->');

      report(
        'Subtitle Export (.srt & .vtt formats)',
        srtValid && vttValid,
        `SRT Valid: ${srtValid}, VTT Valid: ${vttValid}`
      );
    } catch (err) {
      report('Subtitle Export', false, err.message);
    }
  }

  // ─── TEST 12: URL Downloader Metadata API (`/api/downloader`) ───
  try {
    const res = await fetch(`${BASE_URL}/api/downloader`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }),
    });

    const json = await res.json();
    report(
      'URL Import Metadata API (`/api/downloader`)',
      res.ok && json.ok && json.data?.title,
      `Platform: ${json.data?.platform}, Title: ${json.data?.title}, Duration: ${json.data?.duration}`
    );
  } catch (err) {
    report('URL Import Metadata API', false, err.message);
  }

  // ─── Helpers for output verification ───
  const { execFileSync } = await import('child_process');
  const ffprobeMod = await import('@ffprobe-installer/ffprobe');
  const ffprobeBin = ffprobeMod.default?.path || ffprobeMod.path;
  const probeBuffer = (buf, ext) => {
    const tmp = path.join(testDir, `probe_${Date.now()}.${ext}`);
    fs.writeFileSync(tmp, Buffer.from(buf));
    try {
      const out = execFileSync(ffprobeBin, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', tmp]).toString();
      const j = JSON.parse(out);
      const v = j.streams.find((s) => s.codec_type === 'video');
      return { duration: Number(j.format.duration), width: v?.width, height: v?.height, hasAudio: j.streams.some((s) => s.codec_type === 'audio'), hasVideo: !!v };
    } finally {
      fs.unlinkSync(tmp);
    }
  };
  const waitJob = async (jobId) => {
    for (let i = 0; i < 240; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const j = (await (await fetch(`${BASE_URL}/api/process/${jobId}`)).json()).job;
      if (j && (j.status === 'completed' || j.status === 'failed')) return j;
    }
    return { status: 'timeout' };
  };
  const renderTimeline = async (body) => {
    const r = await (await fetch(`${BASE_URL}/api/editor/render`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    if (!r.ok) throw new Error(r.error);
    const job = await waitJob(r.jobId);
    if (job.status !== 'completed') throw new Error(`job ${job.status}: ${job.errorMessage || ''}`);
    const dl = await fetch(`${BASE_URL}${job.outputUrl}`);
    return probeBuffer(await dl.arrayBuffer(), 'mp4');
  };

  // ─── TEST 13: Real link download (yt-dlp) — 1st YouTube video ever, 19s ───
  const realLink = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  try {
    const meta = await (await fetch(`${BASE_URL}/api/downloader`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: realLink }) })).json();
    const vfmt = meta.data?.formats?.find((f) => f.type === 'video');
    const dl = await fetch(`${BASE_URL}${vfmt.downloadUrl}`);
    const info = probeBuffer(await dl.arrayBuffer(), 'mp4');
    report(
      'Real Link Download returns the ACTUAL video (not a sample)',
      dl.ok && Math.abs(info.duration - 19) < 1.5 && info.hasVideo && info.hasAudio,
      `Title: ${meta.data?.title}, format: ${vfmt?.id}, downloaded duration: ${info.duration.toFixed(2)}s (expected ≈19s), ${info.width}x${info.height}`
    );
    const mp3 = await fetch(`${BASE_URL}${meta.data.formats.find((f) => f.id === 'mp3-320').downloadUrl}`);
    const a = probeBuffer(await mp3.arrayBuffer(), 'mp3');
    report('Real Link → MP3 audio extraction', mp3.ok && !a.hasVideo && a.hasAudio && Math.abs(a.duration - 19) < 1.5, `MP3 duration ${a.duration.toFixed(2)}s, type ${mp3.headers.get('content-type')}`);
  } catch (err) {
    report('Real Link Download', false, err.message);
  }

  // ─── TEST 14: Link import into editor storage ───
  try {
    const imp = await (await fetch(`${BASE_URL}/api/import-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: realLink }) })).json();
    const stream = await fetch(`${BASE_URL}${imp.media?.url}`, { headers: { Range: 'bytes=0-1023' } });
    report(
      'Link Import → server storage + seekable stream (HTTP 206)',
      imp.ok && imp.media.storagePath && stream.status === 206,
      `storagePath: ${imp.media?.storagePath}, duration ${imp.media?.durationSeconds}s, range status ${stream.status}`
    );
  } catch (err) {
    report('Link Import', false, err.message);
  }

  // ─── TEST 15–18: Timeline editor renders ───
  if (uploadedMedia) {
    const sp = uploadedMedia.storagePath;
    try {
      const info = await renderTimeline({ clips: [{ storagePath: sp, inMs: 3000, outMs: 5000 }, { storagePath: sp, inMs: 0, outMs: 2000 }] });
      report('Editor: reordered clips render (3–5s + 0–2s)', Math.abs(info.duration - 4) < 0.2 && info.hasAudio, `duration ${info.duration.toFixed(2)}s, ${info.width}x${info.height}`);
    } catch (err) {
      report('Editor: reorder render', false, err.message);
    }
    try {
      const info = await renderTimeline({ clips: [{ storagePath: sp, inMs: 0, outMs: 2000 }, { storagePath: sp, inMs: 2000, outMs: 4000 }, { storagePath: sp, inMs: 0, outMs: 2000, muted: true }] });
      report('Editor: split + paste + muted clip render', Math.abs(info.duration - 6) < 0.2, `duration ${info.duration.toFixed(2)}s`);
    } catch (err) {
      report('Editor: split/paste render', false, err.message);
    }
    try {
      const info = await renderTimeline({ clips: [{ storagePath: sp, inMs: 0, outMs: 3000 }], crop: { x: 0.341796875, y: 0, w: 0.31640625, h: 1 } });
      const ratio = info.width / info.height;
      report('Editor: 9:16 crop', Math.abs(ratio - 9 / 16) < 0.02 && info.width % 2 === 0 && info.height % 2 === 0, `${info.width}x${info.height} (ratio ${ratio.toFixed(3)})`);
    } catch (err) {
      report('Editor: crop render', false, err.message);
    }
    try {
      // second source: 640x360, NO audio track → joined with 1280x720 + audio
      const ffm = await import('@ffmpeg-installer/ffmpeg');
      const silentPath = path.join(testDir, 'silent_small.mp4');
      if (!fs.existsSync(silentPath)) {
        execFileSync(ffm.default?.path || ffm.path, ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=3:size=640x360:rate=25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', silentPath], { stdio: 'pipe' });
      }
      const fd = new FormData();
      fd.append('file', new Blob([fs.readFileSync(silentPath)], { type: 'video/mp4' }), 'silent_small.mp4');
      const up2 = await (await fetch(`${BASE_URL}/api/upload`, { method: 'POST', body: fd })).json();
      const info = await renderTimeline({ clips: [{ storagePath: sp, inMs: 0, outMs: 2000 }, { storagePath: up2.media.storagePath, inMs: 0, outMs: 3000 }], outputHeight: 720 });
      report('Editor: join different sizes + clip without audio', Math.abs(info.duration - 5) < 0.2 && info.hasAudio && info.height === 720, `duration ${info.duration.toFixed(2)}s, ${info.width}x${info.height}, audio ${info.hasAudio}`);
    } catch (err) {
      report('Editor: mixed sources render', false, err.message);
    }
  }

  // ─── TEST 19: Safety / no fake fallbacks ───
  try {
    const trav = await fetch(`${BASE_URL}/api/editor/render`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clips: [{ storagePath: '../package.json', inMs: 0, outMs: 1000 }] }) });
    const noSrc = await fetch(`${BASE_URL}/api/process`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaId: 'x', type: 'cut', params: { startMs: 0, endMs: 1000 } }) });
    const fake = await fetch(`${BASE_URL}/api/download/online-video-1080p.mp4`);
    const media = await fetch(`${BASE_URL}/api/media?path=${encodeURIComponent('../package.json')}`);
    report(
      'No sample-video fallbacks & path traversal blocked',
      trav.status === 400 && noSrc.status === 404 && fake.status === 404 && media.status === 404,
      `traversal ${trav.status}, missing source ${noSrc.status}, old fake id ${fake.status}, media traversal ${media.status}`
    );
  } catch (err) {
    report('Safety checks', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`  FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
