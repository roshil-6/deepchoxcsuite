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
      } else {
        report('Audio Extraction Job', false, JSON.stringify(json));
      }
    } catch (err) {
      report('Audio Extraction Job', false, err.message);
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

  console.log('\n====================================================');
  console.log(`  FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
