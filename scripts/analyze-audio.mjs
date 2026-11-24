#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const ANALYSIS_SR = 44100;
const DECODE_MAX_BUFFER = 768 * 1024 * 1024;

const MAJOR_CAMELOT = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const MINOR_CAMELOT = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function printUsage() {
  console.log(`daw-analyze — Zero-dependency Audio DSP Forensics & A/B Mix Comparator

Usage:
  node scripts/analyze-audio.mjs <input-file-or-url> [options]
  node scripts/analyze-audio.mjs --input <file-or-url> [options]

Options:
  --input <path|url>       Audio file path or HTTP/HTTPS URL (Dropbox links auto-converted to dl=1)
  --compare <path|url>     Second bounce or commercial reference track for A/B delta analysis
  --out-dir <dir>          Output directory (default: ./<basename>-analysis)
  --bucket-sec <seconds>   Arrangement timeline bucket width in seconds (default: 10)
  --no-plots               Skip generating waveform.png and spectrogram.png
  --listen-mp3             Also emit a 128 kbps MP3 preview (*-listen.mp3)
  --json-only              Print only JSON report to stdout (suppress banner/summary logs)
  -h, --help               Show this help message
`);
}

function parseArgs(argv) {
  const opts = {
    input: null,
    compare: null,
    outDir: null,
    bucketSec: 10,
    noPlots: false,
    listenMp3: false,
    jsonOnly: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '--no-plots') {
      opts.noPlots = true;
    } else if (arg === '--listen-mp3') {
      opts.listenMp3 = true;
    } else if (arg === '--json-only') {
      opts.jsonOnly = true;
    } else if (arg === '--input' || arg === '-i') {
      opts.input = argv[++i] ?? null;
    } else if (arg.startsWith('--input=')) {
      opts.input = arg.slice('--input='.length);
    } else if (arg === '--compare' || arg === '-c') {
      opts.compare = argv[++i] ?? null;
    } else if (arg.startsWith('--compare=')) {
      opts.compare = arg.slice('--compare='.length);
    } else if (arg === '--out-dir' || arg === '-o') {
      opts.outDir = argv[++i] ?? null;
    } else if (arg.startsWith('--out-dir=')) {
      opts.outDir = arg.slice('--out-dir='.length);
    } else if (arg === '--bucket-sec') {
      const val = Number(argv[++i]);
      if (!Number.isFinite(val) || val < 1) {
        throw new Error('--bucket-sec must be a positive number >= 1');
      }
      opts.bucketSec = val;
    } else if (arg.startsWith('--bucket-sec=')) {
      const val = Number(arg.slice('--bucket-sec='.length));
      if (!Number.isFinite(val) || val < 1) {
        throw new Error('--bucket-sec must be a positive number >= 1');
      }
      opts.bucketSec = val;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!opts.input) {
      opts.input = arg;
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
  }

  return opts;
}

function logInfo(msg, jsonOnly) {
  if (!jsonOnly) {
    console.log(msg);
  }
}

function checkBinary(name) {
  const res = spawnSync(name, ['-version'], { encoding: 'utf8' });
  return !res.error && res.status === 0;
}

function assertFfmpegInstalled() {
  const hasFfmpeg = checkBinary('ffmpeg');
  const hasFfprobe = checkBinary('ffprobe');
  if (hasFfmpeg && hasFfprobe) return;

  const missing = [!hasFfmpeg && 'ffmpeg', !hasFfprobe && 'ffprobe'].filter(Boolean).join(' and ');
  const platform = process.platform;
  let hint = 'Install FFmpeg (which includes both ffmpeg and ffprobe) and add it to PATH.';
  if (platform === 'darwin') {
    hint = 'macOS install:   brew install ffmpeg';
  } else if (platform === 'win32') {
    hint = 'Windows install: winget install Gyan.FFmpeg   (then restart your terminal)';
  } else {
    hint = 'Linux install:   sudo apt update && sudo apt install -y ffmpeg   (or sudo dnf install ffmpeg)';
  }

  console.error(`Error: Missing required binary (${missing}) on PATH.\n${hint}`);
  process.exit(1);
}

function isHttpUrl(str) {
  return /^https?:\/\//i.test(str);
}

function normalizeSourceUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (/(^|\.)dropbox\.com$/i.test(parsed.hostname)) {
    parsed.searchParams.set('dl', '1');
    parsed.searchParams.delete('raw');
  }
  return parsed.toString();
}

function safeSlug(name) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'audio'
  );
}

async function resolveInputSource(inputStr, tempDir, label, jsonOnly) {
  if (!isHttpUrl(inputStr)) {
    const resolved = path.resolve(inputStr);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Input file not found (${label}): ${resolved}`);
    }
    const stat = fs.statSync(resolved);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Input path is empty or not a regular file (${label}): ${resolved}`);
    }
    return {
      sourceType: 'file',
      originalInput: inputStr,
      localPath: resolved,
      baseName: safeSlug(path.basename(resolved)),
      cleanup: () => {},
    };
  }

  const downloadUrl = normalizeSourceUrl(inputStr);
  logInfo(`Downloading ${label} URL...`, jsonOnly);
  const res = await fetch(downloadUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status} ${res.statusText}) for ${downloadUrl}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('text/html')) {
    throw new Error(`URL returned an HTML page instead of an audio stream (${contentType}). Ensure the link is direct-downloadable.`);
  }

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length < 1024) {
    throw new Error(`Downloaded payload is unexpectedly small (${buf.length} bytes) for ${downloadUrl}`);
  }

  const headAscii = buf.subarray(0, 64).toString('utf8').trimStart().toLowerCase();
  if (headAscii.startsWith('<!doctype html') || headAscii.startsWith('<html')) {
    throw new Error('Downloaded payload appears to be an HTML document rather than audio.');
  }

  const urlObj = new URL(downloadUrl);
  const rawName = decodeURIComponent(path.basename(urlObj.pathname) || `${label}.audio`);
  const extMatch = path.extname(rawName);
  const destPath = path.join(tempDir, `${label}${extMatch || '.audio'}`);
  fs.writeFileSync(destPath, buf);

  return {
    sourceType: 'url',
    originalInput: inputStr,
    resolvedUrl: downloadUrl,
    localPath: destPath,
    baseName: safeSlug(rawName),
    cleanup: () => {
      try {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

function db(x) {
  return x > 1e-12 ? 20 * Math.log10(x) : -120;
}

function powerDb(p) {
  return p > 1e-24 ? 10 * Math.log10(p) : -120;
}

function round2(x) {
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : null;
}

function round4(x) {
  return Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null;
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return null;
  const idx = (sortedArr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function freqToNote(hz) {
  if (!hz || hz <= 0) return null;
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const name = PITCH_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return {
    note: `${name}${octave}`,
    cents,
    label: `${name}${octave} (${cents >= 0 ? '+' : ''}${cents} cents)`,
  };
}

function makeFft(N) {
  const bits = Math.round(Math.log2(N));
  if (1 << bits !== N) throw new Error(`FFT size ${N} must be power of 2`);
  const bitRev = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    let x = i;
    let r = 0;
    for (let b = 0; b < bits; b++) {
      r = (r << 1) | (x & 1);
      x >>= 1;
    }
    bitRev[i] = r;
  }

  const cosTable = new Float64Array(N / 2);
  const sinTable = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    const angle = (-2 * Math.PI * k) / N;
    cosTable[k] = Math.cos(angle);
    sinTable[k] = Math.sin(angle);
  }

  const hann = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / N));
  }

  function fft(re, im) {
    for (let i = 0; i < N; i++) {
      const j = bitRev[i];
      if (j > i) {
        let tmp = re[i];
        re[i] = re[j];
        re[j] = tmp;
        tmp = im[i];
        im[i] = im[j];
        im[j] = tmp;
      }
    }

    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1;
      const step = N / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0; j < half; j++) {
          const k = j * step;
          const wr = cosTable[k];
          const wi = sinTable[k];
          const idx1 = i + j;
          const idx2 = idx1 + half;
          const tr = re[idx2] * wr - im[idx2] * wi;
          const ti = re[idx2] * wi + im[idx2] * wr;
          re[idx2] = re[idx1] - tr;
          im[idx2] = im[idx1] - ti;
          re[idx1] += tr;
          im[idx1] += ti;
        }
      }
    }
  }

  return { N, hann, fft };
}

function pearson(a, b) {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let dbv = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    dbv += xb * xb;
  }
  const denom = Math.sqrt(da * dbv);
  return denom > 0 ? num / denom : 0;
}

function classifyKey(chromaVec) {
  const candidates = [];
  for (let root = 0; root < 12; root++) {
    const rotMajor = new Array(12);
    const rotMinor = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotMajor[(root + i) % 12] = KS_MAJOR[i];
      rotMinor[(root + i) % 12] = KS_MINOR[i];
    }
    candidates.push({
      key: `${PITCH_NAMES[root]} major`,
      camelot: MAJOR_CAMELOT[root],
      score: round4(pearson(chromaVec, rotMajor)),
    });
    candidates.push({
      key: `${PITCH_NAMES[root]} minor`,
      camelot: MINOR_CAMELOT[root],
      score: round4(pearson(chromaVec, rotMinor)),
    });
  }
  candidates.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return candidates;
}

function estimateBpm(onsetArr, fps) {
  if (onsetArr.length < Math.ceil(fps * 8)) return { top: [] };
  let maxO = 0;
  for (let i = 0; i < onsetArr.length; i++) if (onsetArr[i] > maxO) maxO = onsetArr[i];
  const normOnset = new Float64Array(onsetArr.length);
  if (maxO > 0) {
    for (let i = 0; i < onsetArr.length; i++) normOnset[i] = onsetArr[i] / maxO;
  }

  const maxLag = Math.min(normOnset.length - 1, Math.ceil((fps * 60) / 30) * 4);
  const acf = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    const count = normOnset.length - lag;
    for (let i = 0; i < count; i++) {
      sum += normOnset[i] * normOnset[i + lag];
    }
    acf[lag] = count > 0 ? sum / count : 0;
  }

  const scores = [];
  for (let bpm = 60; bpm <= 185; bpm += 0.25) {
    const baseLag = (fps * 60) / bpm;
    let total = 0;
    let weights = 0;
    for (let mult = 1; mult <= 4; mult++) {
      const l = Math.round(baseLag * mult);
      if (l <= maxLag) {
        const w = 1 / mult;
        total += acf[l] * w;
        weights += w;
      }
    }
    const halfBeatLag = Math.round(baseLag * 0.5);
    if (halfBeatLag >= 1 && halfBeatLag <= maxLag) {
      total += acf[halfBeatLag] * 0.35;
      weights += 0.35;
    }
    scores.push({ bpm: round2(bpm), score: weights > 0 ? total / weights : 0 });
  }

  scores.sort((a, b) => b.score - a.score);
  const top = [];
  for (const s of scores) {
    if (top.every((t) => Math.abs((t.bpm ?? 0) - (s.bpm ?? 0)) >= 4.0)) {
      top.push({ bpm: s.bpm, score: round4(s.score) });
      if (top.length === 3) break;
    }
  }
  return { top };
}

function probeAudio(filePath) {
  const res = spawnSync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  if (res.status !== 0) {
    throw new Error(`ffprobe failed (${res.status}): ${res.stderr || 'unknown error'}`);
  }
  const raw = JSON.parse(res.stdout);
  const audioStream = (raw.streams || []).find((s) => s.codec_type === 'audio');
  if (!audioStream) {
    throw new Error(`No audio stream found in ${filePath}`);
  }

  const format = raw.format || {};
  const sampleRateHz = audioStream.sample_rate ? Number(audioStream.sample_rate) : null;
  const bitDepthRaw =
    audioStream.bits_per_raw_sample && Number(audioStream.bits_per_raw_sample) > 0
      ? Number(audioStream.bits_per_raw_sample)
      : audioStream.bits_per_sample && Number(audioStream.bits_per_sample) > 0
      ? Number(audioStream.bits_per_sample)
      : null;

  return {
    formatName: format.format_name || null,
    formatLongName: format.format_long_name || null,
    codecName: audioStream.codec_name || null,
    codecLongName: audioStream.codec_long_name || null,
    sampleFmt: audioStream.sample_fmt || null,
    sampleRateHz,
    bitDepth: bitDepthRaw,
    channels: audioStream.channels ?? null,
    channelLayout: audioStream.channel_layout || null,
    bitRateBps: format.bit_rate ? Number(format.bit_rate) : audioStream.bit_rate ? Number(audioStream.bit_rate) : null,
    durationSec: format.duration ? round2(Number(format.duration)) : audioStream.duration ? round2(Number(audioStream.duration)) : null,
    fileSizeBytes: format.size ? Number(format.size) : null,
    tags: format.tags || audioStream.tags || {},
  };
}

function parseNumberMatch(text, regex) {
  const m = text.match(regex);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseEbuR128(output) {
  const summaryIdx = output.lastIndexOf('Summary:');
  const section = summaryIdx >= 0 ? output.slice(summaryIdx) : output;

  const integratedLufs = parseNumberMatch(section, /Integrated loudness:\s*[\r\n]+\s*I:\s*([-+]?\d+(?:\.\d+)?)\s*LUFS/i);
  const integratedThresholdLufs = parseNumberMatch(
    section,
    /Integrated loudness:\s*[\r\n]+\s*I:\s*[-+]?\d+(?:\.\d+)?\s*LUFS\s*[\r\n]+\s*Threshold:\s*([-+]?\d+(?:\.\d+)?)\s*LUFS/i
  );
  const lraLu = parseNumberMatch(section, /Loudness range:\s*[\r\n]+\s*LRA:\s*([-+]?\d+(?:\.\d+)?)\s*LU/i);
  const lraThresholdLufs = parseNumberMatch(
    section,
    /Loudness range:\s*[\r\n]+\s*LRA:\s*[-+]?\d+(?:\.\d+)?\s*LU\s*[\r\n]+\s*Threshold:\s*([-+]?\d+(?:\.\d+)?)\s*LUFS/i
  );
  const lraLowLufs = parseNumberMatch(section, /LRA low:\s*([-+]?\d+(?:\.\d+)?)\s*LUFS/i);
  const lraHighLufs = parseNumberMatch(section, /LRA high:\s*([-+]?\d+(?:\.\d+)?)\s*LUFS/i);
  const truePeakDbtp = parseNumberMatch(section, /True peak:\s*[\r\n]+\s*Peak:\s*([-+]?\d+(?:\.\d+)?)\s*(?:dBFS|dBTP)/i);

  return {
    integratedLufs,
    integratedThresholdLufs,
    lraLu,
    lraThresholdLufs,
    lraLowLufs,
    lraHighLufs,
    truePeakDbtp,
  };
}

function parseAstatsBlock(lines) {
  const map = {};
  for (const line of lines) {
    const m = line.match(/\]\s*([^:]+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    const valStr = m[2].trim();
    map[key] = valStr;
  }

  const num = (k) => {
    if (!(k in map)) return null;
    const v = Number(map[k]);
    return Number.isFinite(v) ? round4(v) : null;
  };

  return {
    dcOffset: num('DC offset'),
    peakLevelDb: num('Peak level dB'),
    rmsLevelDb: num('RMS level dB'),
    rmsPeakDb: num('RMS peak dB'),
    rmsTroughDb: num('RMS through dB') ?? num('RMS trough dB'),
    crestFactorLinear: num('Crest factor'),
    flatFactor: num('Flat factor'),
    peakCount: num('Peak count'),
    noiseFloorDb: num('Noise floor dB'),
    entropy: num('Entropy'),
    bitDepth: map['Bit depth'] || null,
    dynamicRangeDb: num('Dynamic range'),
    zeroCrossingsRate: num('Zero crossings rate'),
    numberOfSamples: num('Number of samples'),
  };
}

function parseAstats(output) {
  const lines = output.split(/\r?\n/).filter((l) => l.includes('[Parsed_astats'));
  const sections = [];
  let current = null;

  for (const line of lines) {
    const chMatch = line.match(/\]\s*Channel:\s*(\d+)/i);
    const overallMatch = line.match(/\]\s*Overall\s*$/i);
    if (chMatch) {
      current = { name: `channel_${chMatch[1]}`, lines: [] };
      sections.push(current);
    } else if (overallMatch) {
      current = { name: 'overall', lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }

  const parsed = { channels: {}, overall: null };
  for (const sec of sections) {
    const obj = parseAstatsBlock(sec.lines);
    if (sec.name === 'overall') {
      parsed.overall = obj;
    } else {
      parsed.channels[sec.name] = obj;
    }
  }
  return parsed;
}

function runFfmpegMeters(filePath) {
  const r128 = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', filePath, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  if (r128.status !== 0) {
    throw new Error(`ffmpeg ebur128 failed (${r128.status}): ${r128.stderr}`);
  }

  const astatsRes = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', filePath, '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  if (astatsRes.status !== 0) {
    throw new Error(`ffmpeg astats failed (${astatsRes.status}): ${astatsRes.stderr}`);
  }

  return {
    ebur128: parseEbuR128(r128.stderr || ''),
    astats: parseAstats(astatsRes.stderr || ''),
  };
}

function decodeToStereoFloat32(filePath) {
  const res = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', filePath, '-f', 'f32le', '-ac', '2', '-ar', String(ANALYSIS_SR), 'pipe:1'],
    { maxBuffer: DECODE_MAX_BUFFER }
  );
  if (res.status !== 0) {
    throw new Error(`ffmpeg PCM decode failed (${res.status}): ${res.stderr?.toString('utf8') || ''}`);
  }
  const buf = res.stdout;
  const f32 = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  const totalSamples = Math.floor(f32.length / 2);
  if (totalSamples === 0) {
    throw new Error(`Decoded zero audio samples from ${filePath}`);
  }
  const L = new Float32Array(totalSamples);
  const R = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    L[i] = f32[i * 2];
    R[i] = f32[i * 2 + 1];
  }
  return { L, R, totalSamples };
}

function runDspAnalysis(filePath, bucketSec) {
  const { L, R, totalSamples } = decodeToStereoFloat32(filePath);
  const durationSec = totalSamples / ANALYSIS_SR;

  // 1. Time-domain dynamics, clipping & DC offset
  let peakL = 0;
  let peakR = 0;
  let sumSqL = 0;
  let sumSqR = 0;
  let sumSqMono = 0;
  let sumL = 0;
  let sumR = 0;
  let sumLR = 0;
  let sumMidSq = 0;
  let sumSideSq = 0;
  let clipL = 0;
  let clipR = 0;

  for (let i = 0; i < totalSamples; i++) {
    const l = L[i];
    const r = R[i];
    const al = Math.abs(l);
    const ar = Math.abs(r);
    if (al > peakL) peakL = al;
    if (ar > peakR) peakR = ar;
    if (al >= 0.9999) clipL++;
    if (ar >= 0.9999) clipR++;
    sumL += l;
    sumR += r;
    sumSqL += l * l;
    sumSqR += r * r;
    const mono = 0.5 * (l + r);
    sumSqMono += mono * mono;
    sumLR += l * r;
    const m = (l + r) * Math.SQRT1_2;
    const s = (l - r) * Math.SQRT1_2;
    sumMidSq += m * m;
    sumSideSq += s * s;
  }

  const dcL = sumL / totalSamples;
  const dcR = sumR / totalSamples;
  const rmsL = Math.sqrt(sumSqL / totalSamples);
  const rmsR = Math.sqrt(sumSqR / totalSamples);
  const rmsStereo = Math.sqrt((sumSqL + sumSqR) / (2 * totalSamples));
  const rmsMono = Math.sqrt(sumSqMono / totalSamples);
  const samplePeakMax = Math.max(peakL, peakR);
  const rmsStereoDbfs = db(rmsStereo);
  const rmsMonoDbfs = db(rmsMono);
  const crestFactorDb = db(samplePeakMax) - rmsStereoDbfs;
  const monoFoldDownLossDb = rmsMonoDbfs - rmsStereoDbfs;

  const varL = Math.max(sumSqL - totalSamples * dcL * dcL, 0);
  const varR = Math.max(sumSqR - totalSamples * dcR * dcR, 0);
  const fullCorrDenom = Math.sqrt(varL * varR);
  const fullCorr = fullCorrDenom > 1e-18 ? (sumLR - totalSamples * dcL * dcR) / fullCorrDenom : 1;
  const fullSideToMidDb = powerDb(sumSideSq / Math.max(sumMidSq, 1e-24));

  // Short-term 3s RMS (hop 1s) & Momentary 400ms max RMS (hop 100ms)
  const win3s = ANALYSIS_SR * 3;
  const hop1s = ANALYSIS_SR;
  const shortRmsAll = [];
  const shortRmsActive = [];
  let max3sRms = -120;
  for (let start = 0; start + win3s <= totalSamples; start += hop1s) {
    let sSq = 0;
    for (let i = start; i < start + win3s; i++) {
      sSq += 0.5 * (L[i] * L[i] + R[i] * R[i]);
    }
    const rDb = db(Math.sqrt(sSq / win3s));
    shortRmsAll.push(rDb);
    if (rDb > -60) shortRmsActive.push(rDb);
    if (rDb > max3sRms) max3sRms = rDb;
  }
  shortRmsAll.sort((a, b) => a - b);
  shortRmsActive.sort((a, b) => a - b);

  const win400ms = Math.round(ANALYSIS_SR * 0.4);
  const hop100ms = Math.round(ANALYSIS_SR * 0.1);
  let max400msRms = -120;
  for (let start = 0; start + win400ms <= totalSamples; start += hop100ms) {
    let mSq = 0;
    for (let i = start; i < start + win400ms; i++) {
      mSq += 0.5 * (L[i] * L[i] + R[i] * R[i]);
    }
    const rDb = db(Math.sqrt(mSq / win400ms));
    if (rDb > max400msRms) max400msRms = rDb;
  }

  // 2. Spectral + Stereo Split (N = 8192, hop = 2048)
  const fft8k = makeFft(8192);
  const N8 = fft8k.N;
  const hop8 = 2048;
  const binHz8 = ANALYSIS_SR / N8;
  const bandDefs = [
    { name: 'Sub-Bass (20-60 Hz)', min: 20, max: 60 },
    { name: 'Bass (60-250 Hz)', min: 60, max: 250 },
    { name: 'Low-Mid (250-500 Hz)', min: 250, max: 500 },
    { name: 'Mid (500-2000 Hz)', min: 500, max: 2000 },
    { name: 'Upper-Mid (2000-6000 Hz)', min: 2000, max: 6000 },
    { name: 'Presence (6000-12000 Hz)', min: 6000, max: 12000 },
    { name: 'Air (12000-20000 Hz)', min: 12000, max: 20000 },
  ];
  const bandEnergy = new Float64Array(bandDefs.length);
  const stereoBands = [
    { name: 'Sub (<120 Hz)', min: 20, max: 120, eL: 0, eR: 0, eLR: 0, eM: 0, eS: 0 },
    { name: 'Mids (120-2000 Hz)', min: 120, max: 2000, eL: 0, eR: 0, eLR: 0, eM: 0, eS: 0 },
    { name: 'Highs (2000-20000 Hz)', min: 2000, max: 20000, eL: 0, eR: 0, eLR: 0, eM: 0, eS: 0 },
  ];

  const k20 = Math.ceil(20 / binHz8);
  const k20k = Math.min(N8 / 2 - 1, Math.floor(20000 / binHz8));
  const totalBinCount = k20k - k20 + 1;
  const meanPowSpectrum = new Float64Array(N8 / 2);

  let centroidNum = 0;
  let centroidDen = 0;
  let flatnessSum = 0;
  let flatnessFrames = 0;

  const reL = new Float64Array(N8);
  const imL = new Float64Array(N8);
  const reR = new Float64Array(N8);
  const imR = new Float64Array(N8);

  for (let start = 0; start + N8 <= totalSamples; start += hop8) {
    for (let i = 0; i < N8; i++) {
      const w = fft8k.hann[i];
      reL[i] = L[start + i] * w;
      imL[i] = 0;
      reR[i] = R[start + i] * w;
      imR[i] = 0;
    }
    fft8k.fft(reL, imL);
    fft8k.fft(reR, imR);

    let framePowSum = 0;
    let frameLogPowSum = 0;
    for (let k = k20; k <= k20k; k++) {
      const rlk = reL[k];
      const ilk = imL[k];
      const rrk = reR[k];
      const irk = imR[k];

      const pL = rlk * rlk + ilk * ilk;
      const pR = rrk * rrk + irk * irk;
      const pCross = rlk * rrk + ilk * irk;
      const rm = (rlk + rrk) * Math.SQRT1_2;
      const imv = (ilk + irk) * Math.SQRT1_2;
      const rs = (rlk - rrk) * Math.SQRT1_2;
      const isv = (ilk - irk) * Math.SQRT1_2;
      const pM = rm * rm + imv * imv;
      const pS = rs * rs + isv * isv;

      const rMono = 0.5 * (rlk + rrk);
      const iMono = 0.5 * (ilk + irk);
      const pMono = rMono * rMono + iMono * iMono;

      const f = k * binHz8;
      meanPowSpectrum[k] += pMono;

      for (let b = 0; b < bandDefs.length; b++) {
        if (f >= bandDefs[b].min && f < bandDefs[b].max) {
          bandEnergy[b] += pMono;
          break;
        }
      }

      for (let sb = 0; sb < stereoBands.length; sb++) {
        if (f >= stereoBands[sb].min && f < stereoBands[sb].max) {
          stereoBands[sb].eL += pL;
          stereoBands[sb].eR += pR;
          stereoBands[sb].eLR += pCross;
          stereoBands[sb].eM += pM;
          stereoBands[sb].eS += pS;
          break;
        }
      }

      centroidNum += f * Math.sqrt(pMono);
      centroidDen += Math.sqrt(pMono);

      framePowSum += pMono;
      frameLogPowSum += Math.log(Math.max(pMono, 1e-24));
    }

    if (framePowSum > 1e-8) {
      const arith = framePowSum / totalBinCount;
      const geom = Math.exp(frameLogPowSum / totalBinCount);
      flatnessSum += geom / Math.max(arith, 1e-24);
      flatnessFrames++;
    }
  }

  let totalBandPow = 0;
  for (let b = 0; b < bandDefs.length; b++) totalBandPow += bandEnergy[b];
  const spectralBands = bandDefs.map((bd, idx) => ({
    band: bd.name,
    energyPct: round2((bandEnergy[idx] / Math.max(totalBandPow, 1e-24)) * 100),
    relToTotalDb: round2(powerDb(bandEnergy[idx] / Math.max(totalBandPow, 1e-24))),
  }));

  let specSum = 0;
  for (let k = k20; k <= k20k; k++) specSum += meanPowSpectrum[k];
  let cumSpec = 0;
  let rolloff85Hz = 0;
  for (let k = k20; k <= k20k; k++) {
    cumSpec += meanPowSpectrum[k];
    if (cumSpec >= 0.85 * specSum) {
      rolloff85Hz = k * binHz8;
      break;
    }
  }

  const stereoSplit = stereoBands.map((sb) => ({
    band: sb.name,
    correlation: round4(sb.eLR / Math.sqrt(Math.max(sb.eL * sb.eR, 1e-24))),
    sideToMidDb: round2(powerDb(sb.eS / Math.max(sb.eM, 1e-24))),
  }));

  // 3. High-Res Sub Peak (N = 32768) + Chromagram (N = 16384)
  let subPeakHz = null;
  let subNote = null;
  if (totalSamples >= 32768) {
    const fft32k = makeFft(32768);
    const N32 = fft32k.N;
    const hop32 = 16384;
    const binHz32 = ANALYSIS_SR / N32;
    const subAvg = new Float64Array(Math.ceil(120 / binHz32) + 2);
    const re32 = new Float64Array(N32);
    const im32 = new Float64Array(N32);
    for (let start = 0; start + N32 <= totalSamples; start += hop32) {
      for (let i = 0; i < N32; i++) {
        re32[i] = 0.5 * (L[start + i] + R[start + i]) * fft32k.hann[i];
        im32[i] = 0;
      }
      fft32k.fft(re32, im32);
      for (let k = 1; k < subAvg.length; k++) {
        subAvg[k] += re32[k] * re32[k] + im32[k] * im32[k];
      }
    }
    const kSubMin = Math.ceil(25 / binHz32);
    const kSubMax = Math.floor(100 / binHz32);
    let bestSubK = kSubMin;
    for (let k = kSubMin + 1; k <= kSubMax; k++) {
      if (subAvg[k] > subAvg[bestSubK]) bestSubK = k;
    }
    const y0 = subAvg[Math.max(0, bestSubK - 1)];
    const y1 = subAvg[bestSubK];
    const y2 = subAvg[Math.min(subAvg.length - 1, bestSubK + 1)];
    const denomQ = y0 - 2 * y1 + y2;
    const deltaQ = Math.abs(denomQ) > 1e-24 ? (0.5 * (y0 - y2)) / denomQ : 0;
    subPeakHz = (bestSubK + deltaQ) * binHz32;
    subNote = freqToNote(subPeakHz);
  }

  // Chromagram with N = 16384, hop = 4096
  let keyCandidates = [];
  let quarterKeys = [];
  if (totalSamples >= 16384) {
    const fft16k = makeFft(16384);
    const N16 = fft16k.N;
    const hop16 = 4096;
    const binHz16 = ANALYSIS_SR / N16;
    const kChMin = Math.ceil(65 / binHz16);
    const kChMax = Math.floor(2100 / binHz16);
    const fullChroma = new Float64Array(12);
    const quarterChromas = [new Float64Array(12), new Float64Array(12), new Float64Array(12), new Float64Array(12)];
    const re16 = new Float64Array(N16);
    const im16 = new Float64Array(N16);

    for (let start = 0; start + N16 <= totalSamples; start += hop16) {
      for (let i = 0; i < N16; i++) {
        re16[i] = 0.5 * (L[start + i] + R[start + i]) * fft16k.hann[i];
        im16[i] = 0;
      }
      fft16k.fft(re16, im16);
      const qIdx = Math.min(3, Math.floor((start / totalSamples) * 4));
      for (let k = kChMin; k <= kChMax; k++) {
        const mag = Math.sqrt(re16[k] * re16[k] + im16[k] * im16[k]);
        const midi = Math.round(69 + 12 * Math.log2((k * binHz16) / 440));
        const pc = ((midi % 12) + 12) % 12;
        fullChroma[pc] += mag;
        quarterChromas[qIdx][pc] += mag;
      }
    }

    keyCandidates = classifyKey(fullChroma);
    quarterKeys = quarterChromas.map((qc, qi) => {
      const top = classifyKey(qc)[0];
      return { quarter: `Q${qi + 1}`, key: top?.key ?? null, camelot: top?.camelot ?? null, score: top?.score ?? null };
    });
  }

  // 4. Onset Flux & BPM (N = 2048, hop = 512)
  const fft2k = makeFft(2048);
  const N2 = fft2k.N;
  const hop2 = 512;
  const fps = ANALYSIS_SR / hop2;
  const binHz2 = ANALYSIS_SR / N2;
  const kFluxMin = Math.max(1, Math.ceil(30 / binHz2));
  const kFluxMax = Math.min(N2 / 2 - 1, Math.floor(16000 / binHz2));
  const numFrames2 = Math.max(0, Math.floor((totalSamples - N2) / hop2) + 1);
  const rawFlux = new Float64Array(numFrames2);
  const prevLogMag = new Float64Array(N2 / 2);
  const re2 = new Float64Array(N2);
  const im2 = new Float64Array(N2);

  for (let f = 0; f < numFrames2; f++) {
    const start = f * hop2;
    for (let i = 0; i < N2; i++) {
      re2[i] = 0.5 * (L[start + i] + R[start + i]) * fft2k.hann[i];
      im2[i] = 0;
    }
    fft2k.fft(re2, im2);
    let flux = 0;
    for (let k = kFluxMin; k <= kFluxMax; k++) {
      const mag = Math.sqrt(re2[k] * re2[k] + im2[k] * im2[k]);
      const lMag = Math.log(1 + 100 * mag);
      const diff = lMag - prevLogMag[k];
      if (diff > 0) flux += diff;
      prevLogMag[k] = lMag;
    }
    rawFlux[f] = flux;
  }

  const halfWin = 21;
  const onsetEnv = new Float64Array(numFrames2);
  const prefix = new Float64Array(numFrames2 + 1);
  for (let i = 0; i < numFrames2; i++) prefix[i + 1] = prefix[i] + rawFlux[i];
  let meanOnset = 0;
  for (let i = 0; i < numFrames2; i++) {
    const lo = Math.max(0, i - halfWin);
    const hi = Math.min(numFrames2 - 1, i + halfWin);
    const localMean = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
    const val = Math.max(0, rawFlux[i] - localMean);
    onsetEnv[i] = val;
    meanOnset += val;
  }
  meanOnset /= Math.max(1, numFrames2);

  const bpmFull = estimateBpm(onsetEnv, fps);
  const quarterSize = Math.floor(numFrames2 / 4);
  const quarterBpms = [0, 1, 2, 3].map((qi) => {
    const slice = onsetEnv.subarray(qi * quarterSize, qi === 3 ? numFrames2 : (qi + 1) * quarterSize);
    const res = estimateBpm(slice, fps);
    return { quarter: `Q${qi + 1}`, topBpm: res.top[0]?.bpm ?? null, score: res.top[0]?.score ?? null };
  });

  const peakThresh = meanOnset * 1.35;
  const minPeakGapFrames = Math.round(fps * 0.06);
  const peakFrames = [];
  let lastPeak = -minPeakGapFrames;
  for (let i = 1; i < numFrames2 - 1; i++) {
    if (
      onsetEnv[i] > peakThresh &&
      onsetEnv[i] >= onsetEnv[i - 1] &&
      onsetEnv[i] > onsetEnv[i + 1] &&
      i - lastPeak >= minPeakGapFrames
    ) {
      peakFrames.push(i);
      lastPeak = i;
    }
  }

  // 5. Arrangement Timeline
  const bucketSamples = Math.round(bucketSec * ANALYSIS_SR);
  const numBuckets = Math.ceil(totalSamples / bucketSamples);
  const timeline = [];
  const kSub120 = Math.floor(120 / binHz8);

  for (let b = 0; b < numBuckets; b++) {
    const sStart = b * bucketSamples;
    const sEnd = Math.min(totalSamples, (b + 1) * bucketSamples);
    const count = sEnd - sStart;
    if (count < ANALYSIS_SR) continue;

    let bSq = 0;
    let bPeak = 0;
    for (let i = sStart; i < sEnd; i++) {
      const l = L[i];
      const r = R[i];
      const a = Math.max(Math.abs(l), Math.abs(r));
      if (a > bPeak) bPeak = a;
      bSq += 0.5 * (l * l + r * r);
    }
    const bRmsDb = db(Math.sqrt(bSq / count));
    const bCrestDb = db(bPeak) - bRmsDb;

    let bSubPow = 0;
    let bTotPow = 0;
    let bCNum = 0;
    let bCDen = 0;
    for (let st = sStart; st + N8 <= sEnd; st += 4096) {
      for (let i = 0; i < N8; i++) {
        reL[i] = 0.5 * (L[st + i] + R[st + i]) * fft8k.hann[i];
        imL[i] = 0;
      }
      fft8k.fft(reL, imL);
      for (let k = k20; k <= k20k; k++) {
        const p = reL[k] * reL[k] + imL[k] * imL[k];
        const f = k * binHz8;
        bTotPow += p;
        if (k <= kSub120) bSubPow += p;
        bCNum += f * Math.sqrt(p);
        bCDen += Math.sqrt(p);
      }
    }

    const fStart = Math.floor(sStart / hop2);
    const fEnd = Math.floor(sEnd / hop2);
    let transients = 0;
    for (const pf of peakFrames) {
      if (pf >= fStart && pf < fEnd) transients++;
    }

    timeline.push({
      time: fmtTime(sStart / ANALYSIS_SR),
      endTime: fmtTime(sEnd / ANALYSIS_SR),
      rmsDbfs: round2(bRmsDb),
      crestDb: round2(bCrestDb),
      subSharePct: round2((bSubPow / Math.max(bTotPow, 1e-24)) * 100),
      centroidHz: Math.round(bCNum / Math.max(bCDen, 1e-24)),
      transientsPerSec: round2(transients / (count / ANALYSIS_SR)),
    });
  }

  return {
    durationSec: round2(durationSec),
    durationFormatted: fmtTime(durationSec),
    analysisSampleRateHz: ANALYSIS_SR,
    dynamics: {
      samplePeakLeftDbfs: round2(db(peakL)),
      samplePeakRightDbfs: round2(db(peakR)),
      samplePeakMaxDbfs: round2(db(samplePeakMax)),
      rmsLeftDbfs: round2(db(rmsL)),
      rmsRightDbfs: round2(db(rmsR)),
      rmsStereoDbfs: round2(rmsStereoDbfs),
      rmsMonoSumDbfs: round2(rmsMonoDbfs),
      monoFoldDownLossDb: round2(monoFoldDownLossDb),
      crestFactorDb: round2(crestFactorDb),
      clippedSamplesLeft: clipL,
      clippedSamplesRight: clipR,
      dcOffsetLeft: round4(dcL),
      dcOffsetRight: round4(dcR),
      max400msMomentaryRmsDbfs: round2(max400msRms),
      max3sShortTermRmsDbfs: round2(max3sRms),
      shortTermRms3sAllPercentilesDbfs: {
        p10: round2(percentile(shortRmsAll, 0.1)),
        p50: round2(percentile(shortRmsAll, 0.5)),
        p90: round2(percentile(shortRmsAll, 0.9)),
        p99: round2(percentile(shortRmsAll, 0.99)),
      },
      shortTermRms3sActivePercentilesDbfs: {
        p10: round2(percentile(shortRmsActive, 0.1)),
        p50: round2(percentile(shortRmsActive, 0.5)),
        p90: round2(percentile(shortRmsActive, 0.9)),
        p99: round2(percentile(shortRmsActive, 0.99)),
      },
    },
    spectral: {
      centroidHz: Math.round(centroidNum / Math.max(centroidDen, 1e-24)),
      rolloff85Hz: Math.round(rolloff85Hz),
      flatness: round4(flatnessSum / Math.max(1, flatnessFrames)),
      dominantSubPeakHz: subPeakHz !== null ? round2(subPeakHz) : null,
      dominantSubNote: subNote,
      bands: spectralBands,
    },
    stereo: {
      fullBandCorrelation: round4(fullCorr),
      fullBandSideToMidDb: round2(fullSideToMidDb),
      frequencySplit: stereoSplit,
    },
    tempo: {
      topCandidates: bpmFull.top,
      quarterStability: quarterBpms,
      averageTransientsPerSec: durationSec > 0 ? round2(peakFrames.length / durationSec) : null,
    },
    key: {
      topCandidates: keyCandidates.slice(0, 4),
      quarterStability: quarterKeys,
    },
    timeline,
  };
}

function buildDiagnostics(loudness, dynamics, spectral, stereo) {
  const flags = [];
  const ebu = loudness.ebur128 || {};
  const lufs = ebu.integratedLufs;
  const truePeak = ebu.truePeakDbtp;
  const crest = dynamics.crestFactorDb;
  const clips = (dynamics.clippedSamplesLeft || 0) + (dynamics.clippedSamplesRight || 0);
  const subBand = (stereo.frequencySplit || []).find((b) => b.band.includes('<120'));
  const subCorr = subBand?.correlation ?? null;
  const airBand = (spectral.bands || []).find((b) => b.band.startsWith('Air'));
  const airPct = airBand?.energyPct ?? null;

  if (lufs !== null) {
    if (lufs >= -7.5) {
      flags.push({
        code: 'MASTERED_VERY_LOUD',
        severity: 'info',
        summary: `Competitive club/festival master loudness (${lufs} LUFS)`,
        detail: 'Check for audible limiter pumping or upper-mid harshness if targeting streaming normalization.',
      });
    } else if (lufs >= -10.5) {
      flags.push({
        code: 'MASTERED_CLUB_LOUD',
        severity: 'ok',
        summary: `Club-ready mastered loudness (${lufs} LUFS)`,
        detail: 'Sits in typical modern Beatport/club release range (-8 to -10 LUFS).',
      });
    } else if (lufs >= -14.5) {
      flags.push({
        code: 'MASTERED_STREAMING',
        severity: 'ok',
        summary: `Streaming-target loudness (${lufs} LUFS)`,
        detail: 'Aligned with Spotify/Apple Music playback targets (~-14 LUFS) with natural transient punch intact.',
      });
    } else {
      flags.push({
        code: 'HEADROOM_PREMASTER',
        severity: 'info',
        summary: `Unmastered / pre-master headroom (${lufs} LUFS)`,
        detail: 'Plenty of dynamic headroom for mastering compression/limiting without touching mix bus balance.',
      });
    }
  }

  if ((truePeak !== null && truePeak > 0.0) || clips > 0) {
    flags.push({
      code: 'TRUE_PEAK_CLIPPING_RISK',
      severity: 'alert',
      summary: `Inter-sample or digital clipping detected (True Peak ${truePeak ?? 'n/a'} dBTP, ${clips} clipped samples)`,
      detail: 'Set limiter output ceiling to -1.0 dBTP before distributing or encoding lossy AAC/MP3 formats.',
    });
  } else if (truePeak !== null && truePeak > -0.3) {
    flags.push({
      code: 'TRUE_PEAK_HOT',
      severity: 'warn',
      summary: `Hot true peak ceiling (${truePeak} dBTP)`,
      detail: 'Safe in PCM WAV, but streaming encoders (AAC/Ogg/MP3) may introduce +0.5 to +1.0 dB inter-sample overs.',
    });
  } else if (truePeak !== null) {
    flags.push({
      code: 'TRUE_PEAK_SAFE',
      severity: 'ok',
      summary: `Clean true peak ceiling (${truePeak} dBTP, 0 clips)`,
      detail: 'Safe for both uncompressed distribution and lossy transcoding.',
    });
  }

  if (subCorr !== null) {
    if (subCorr >= 0.9) {
      flags.push({
        code: 'SUB_MONO_LOCKED',
        severity: 'ok',
        summary: `Sub-bass (<120 Hz) phase locked (${subCorr})`,
        detail: 'Club-safe mono low end; will translate reliably on mono club systems without phase cancellation.',
      });
    } else if (subCorr >= 0.6) {
      flags.push({
        code: 'SUB_SLIGHTLY_WIDE',
        severity: 'warn',
        summary: `Moderately wide sub-bass (<120 Hz corr ${subCorr})`,
        detail: 'Consider M/S high-passing Side info below 90-110 Hz to tighten mono punch.',
      });
    } else {
      flags.push({
        code: 'SUB_PHASE_RISK',
        severity: 'alert',
        summary: `Wide/out-of-phase sub-bass (<120 Hz corr ${subCorr})`,
        detail: 'High risk of severe bass drop on mono PA systems and vinyl cuts; mono-sum below 100-120 Hz.',
      });
    }
  }

  if (stereo.fullBandCorrelation < 0.2 || dynamics.monoFoldDownLossDb < -2.0) {
    flags.push({
      code: 'MONO_PHASE_CANCEL_RISK',
      severity: 'warn',
      summary: `Noticeable mono fold-down loss (${dynamics.monoFoldDownLossDb} dB, corr ${stereo.fullBandCorrelation})`,
      detail: 'Heavy stereo widening/chorus/Haas effects are attenuating elements when summed to mono.',
    });
  } else {
    flags.push({
      code: 'STEREO_HEALTHY',
      severity: 'ok',
      summary: `Healthy stereo-to-mono translation (corr ${stereo.fullBandCorrelation}, fold-down ${dynamics.monoFoldDownLossDb} dB)`,
      detail: 'Stereo image holds together cleanly when collapsed to mono.',
    });
  }

  if (airPct !== null && (airPct < 1.5 || spectral.rolloff85Hz < 3000)) {
    flags.push({
      code: 'DARK_TOP_END',
      severity: 'info',
      summary: `Warm/dark top-end tilt (Air ${airPct}%, 85% rolloff ${spectral.rolloff85Hz} Hz)`,
      detail: 'Very relaxed upper harmonics (>12 kHz). Intentional for warm deep house/analog dub, or room for a gentle +1-2 dB high shelf if brighter sparkle is desired.',
    });
  } else if (airPct !== null && (airPct > 8.0 || spectral.rolloff85Hz > 9000)) {
    flags.push({
      code: 'BRIGHT_TOP_END',
      severity: 'warn',
      summary: `Forward/bright top-end energy (Air ${airPct}%, 85% rolloff ${spectral.rolloff85Hz} Hz)`,
      detail: 'Check hi-hats, rides, and vocal sibilance at high club playback volume.',
    });
  } else {
    flags.push({
      code: 'BALANCED_TOP_END',
      severity: 'ok',
      summary: `Balanced spectral tilt (Air ${airPct ?? 'n/a'}%, 85% rolloff ${spectral.rolloff85Hz} Hz)`,
      detail: 'Top-end brightness sits in a natural range.',
    });
  }

  if (crest >= 14.0) {
    flags.push({
      code: 'HIGH_CREST_DYNAMIC',
      severity: 'info',
      summary: `High dynamic crest factor (${crest} dB)`,
      detail: 'Preserved drum transients typical of an unmastered or lightly bus-compressed mix.',
    });
  } else if (crest >= 8.0) {
    flags.push({
      code: 'BALANCED_DYNAMICS',
      severity: 'ok',
      summary: `Controlled punchy dynamics (crest ${crest} dB)`,
      detail: 'Healthy balance between loudness and transient snap.',
    });
  } else {
    flags.push({
      code: 'HEAVILY_LIMITED',
      severity: 'warn',
      summary: `Dense / heavily limited dynamics (crest ${crest} dB)`,
      detail: 'Very tight peak-to-RMS ratio; verify kick/snare transients are not flat-topping.',
    });
  }

  const maxDc = Math.max(Math.abs(dynamics.dcOffsetLeft || 0), Math.abs(dynamics.dcOffsetRight || 0));
  if (maxDc > 0.005) {
    flags.push({
      code: 'DC_OFFSET_DETECTED',
      severity: 'warn',
      summary: `Significant DC offset (${maxDc})`,
      detail: 'Apply a 20 Hz linear-phase high-pass filter before limiting to reclaim lost headroom.',
    });
  }

  return flags;
}

function renderVisualArtifacts(filePath, outDir, prefix, emitPlots, emitListenMp3, baseName) {
  const artifacts = {
    waveformPng: null,
    spectrogramPng: null,
    listenMp3: null,
  };

  if (emitPlots) {
    const wavePath = path.join(outDir, `${prefix}waveform.png`);
    const specPath = path.join(outDir, `${prefix}spectrogram.png`);

    const wRes = spawnSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        filePath,
        '-lavfi',
        'showwavespic=s=1600x420:split_channels=1:colors=#2dd4bf|#f59e0b:scale=sqrt',
        wavePath,
      ],
      { encoding: 'utf8' }
    );
    if (wRes.status !== 0) {
      throw new Error(`ffmpeg waveform render failed: ${wRes.stderr}`);
    }
    artifacts.waveformPng = wavePath;

    const sRes = spawnSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        filePath,
        '-lavfi',
        'showspectrumpic=s=1600x600:mode=combined:color=magma:scale=log:fscale=log:legend=1',
        specPath,
      ],
      { encoding: 'utf8' }
    );
    if (sRes.status !== 0) {
      throw new Error(`ffmpeg spectrogram render failed: ${sRes.stderr}`);
    }
    artifacts.spectrogramPng = specPath;
  }

  if (emitListenMp3) {
    const mp3Path = path.join(outDir, `${prefix}${baseName}-listen.mp3`);
    const mRes = spawnSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', filePath, '-codec:a', 'libmp3lame', '-b:a', '128k', mp3Path],
      { encoding: 'utf8' }
    );
    if (mRes.status !== 0) {
      throw new Error(`ffmpeg MP3 transcode failed: ${mRes.stderr}`);
    }
    artifacts.listenMp3 = mp3Path;
  }

  return artifacts;
}

function camelotNeighbors(code) {
  if (!code) return [];
  const m = String(code).match(/^(\d+)([AB])$/);
  if (!m) return [];
  const num = Number(m[1]);
  const letter = m[2];
  const prev = num === 1 ? 12 : num - 1;
  const next = num === 12 ? 1 : num + 1;
  const oppositeLetter = letter === 'A' ? 'B' : 'A';
  return [code, `${prev}${letter}`, `${next}${letter}`, `${num}${oppositeLetter}`];
}

function diffOrNull(a, b, rounder = round2) {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return rounder(a - b);
}

function computeComparisonDeltas(primary, reference) {
  const pEbu = primary.loudness.ebur128 || {};
  const rEbu = reference.loudness.ebur128 || {};

  const pBpm = primary.tempo.topCandidates?.[0]?.bpm ?? null;
  const rBpm = reference.tempo.topCandidates?.[0]?.bpm ?? null;
  let bpmHalfDoubleRelation = 'unknown';
  if (pBpm && rBpm) {
    if (Math.abs(pBpm - rBpm) <= 1.5) bpmHalfDoubleRelation = 'exact';
    else if (Math.abs(pBpm * 2 - rBpm) <= 2.5) bpmHalfDoubleRelation = 'primary-half-time-of-reference';
    else if (Math.abs(pBpm - rBpm * 2) <= 2.5) bpmHalfDoubleRelation = 'primary-double-time-of-reference';
    else bpmHalfDoubleRelation = 'different';
  }

  const pKey = primary.key.topCandidates?.[0] || null;
  const rKey = reference.key.topCandidates?.[0] || null;
  const compatSet = pKey?.camelot ? camelotNeighbors(pKey.camelot) : [];

  const pSubBand = primary.stereo.frequencySplit.find((s) => s.band.includes('<120'));
  const rSubBand = reference.stereo.frequencySplit.find((s) => s.band.includes('<120'));

  const bandDeltas = primary.spectral.bands.map((pb, idx) => {
    const rb = reference.spectral.bands[idx];
    return {
      band: pb.band,
      primaryPct: pb.energyPct,
      referencePct: rb?.energyPct ?? null,
      pctPointDelta: diffOrNull(pb.energyPct, rb?.energyPct, round2),
      relDbDelta: diffOrNull(pb.relToTotalDb, rb?.relToTotalDb, round2),
    };
  });

  return {
    note: 'Positive (+) deltas mean primary track has MORE / HIGHER value than comparison/reference track.',
    integratedLufsDelta: diffOrNull(pEbu.integratedLufs, rEbu.integratedLufs),
    lraDeltaLu: diffOrNull(pEbu.lraLu, rEbu.lraLu),
    truePeakDeltaDb: diffOrNull(pEbu.truePeakDbtp, rEbu.truePeakDbtp),
    crestDeltaDb: diffOrNull(primary.dynamics.crestFactorDb, reference.dynamics.crestFactorDb),
    rmsStereoDeltaDb: diffOrNull(primary.dynamics.rmsStereoDbfs, reference.dynamics.rmsStereoDbfs),
    centroidDeltaHz: diffOrNull(primary.spectral.centroidHz, reference.spectral.centroidHz, Math.round),
    rolloff85DeltaHz: diffOrNull(primary.spectral.rolloff85Hz, reference.spectral.rolloff85Hz, Math.round),
    subPeakHzDelta: diffOrNull(primary.spectral.dominantSubPeakHz, reference.spectral.dominantSubPeakHz),
    subNotePrimary: primary.spectral.dominantSubNote?.label ?? null,
    subNoteReference: reference.spectral.dominantSubNote?.label ?? null,
    subCorrelationDelta: diffOrNull(pSubBand?.correlation, rSubBand?.correlation, round4),
    fullCorrelationDelta: diffOrNull(primary.stereo.fullBandCorrelation, reference.stereo.fullBandCorrelation, round4),
    fullSideToMidDeltaDb: diffOrNull(primary.stereo.fullBandSideToMidDb, reference.stereo.fullBandSideToMidDb),
    bpmPrimary: pBpm,
    bpmReference: rBpm,
    bpmDelta: diffOrNull(pBpm, rBpm),
    bpmHalfDoubleRelation,
    keyPrimary: pKey?.key ?? null,
    camelotPrimary: pKey?.camelot ?? null,
    keyReference: rKey?.key ?? null,
    camelotReference: rKey?.camelot ?? null,
    keyMatch: Boolean(pKey?.key && rKey?.key && pKey.key === rKey.key),
    camelotCompatible: Boolean(pKey?.camelot && rKey?.camelot && compatSet.includes(rKey.camelot)),
    bandDeltas,
  };
}

function analyzeSingleTrack(resolvedSource, outDir, opts, prefix) {
  logInfo(`Probing container & running EBU R128 / astats (${resolvedSource.baseName})...`, opts.jsonOnly);
  const container = probeAudio(resolvedSource.localPath);
  const loudness = runFfmpegMeters(resolvedSource.localPath);

  logInfo(`Running pure-Node PCM + FFT DSP analysis (${resolvedSource.baseName})...`, opts.jsonOnly);
  const dsp = runDspAnalysis(resolvedSource.localPath, opts.bucketSec);
  const diagnostics = buildDiagnostics(loudness, dsp.dynamics, dsp.spectral, dsp.stereo);

  logInfo(
    opts.noPlots
      ? `Skipping visual plots (--no-plots) for ${resolvedSource.baseName}.`
      : `Rendering waveform & log-spectrogram PNGs (${resolvedSource.baseName})...`,
    opts.jsonOnly
  );
  const artifacts = renderVisualArtifacts(
    resolvedSource.localPath,
    outDir,
    prefix,
    !opts.noPlots,
    opts.listenMp3,
    resolvedSource.baseName
  );

  return {
    input: {
      sourceType: resolvedSource.sourceType,
      originalInput: resolvedSource.originalInput,
      resolvedUrl: resolvedSource.resolvedUrl || null,
      fileName: path.basename(resolvedSource.localPath),
    },
    container,
    loudness,
    dynamics: dsp.dynamics,
    spectral: dsp.spectral,
    stereo: dsp.stereo,
    tempo: dsp.tempo,
    key: dsp.key,
    diagnostics,
    timeline: dsp.timeline,
    plots: {
      waveformPng: artifacts.waveformPng,
      spectrogramPng: artifacts.spectrogramPng,
    },
    listenMp3: artifacts.listenMp3,
  };
}

function printHumanSummary(report, reportPath) {
  const ebu = report.loudness.ebur128 || {};
  const dyn = report.dynamics;
  const spec = report.spectral;
  const topKey = report.key.topCandidates?.[0];
  const topBpm = report.tempo.topCandidates?.[0];
  const altBpm = report.tempo.topCandidates?.[1];
  const subCorr = report.stereo.frequencySplit.find((s) => s.band.includes('<120'));

  console.log('\n============================================================');
  console.log(`DAW AUDIO FORENSICS REPORT — ${report.input.fileName}`);
  console.log('============================================================');
  console.log(
    `Container : ${report.container.codecName || 'unknown'} | ${report.container.sampleRateHz} Hz | ${
      report.container.bitDepth ? `${report.container.bitDepth}-bit | ` : ''
    }${report.container.channels} ch | ${report.container.durationSec}s (${fmtTime(report.container.durationSec || 0)})`
  );
  console.log(
    `Loudness  : ${ebu.integratedLufs ?? 'n/a'} LUFS-I | LRA ${ebu.lraLu ?? 'n/a'} LU | True Peak ${
      ebu.truePeakDbtp ?? 'n/a'
    } dBTP | Crest ${dyn.crestFactorDb} dB | Clips L=${dyn.clippedSamplesLeft}, R=${dyn.clippedSamplesRight}`
  );
  console.log(
    `Tempo/Key : ${topBpm ? `${topBpm.bpm} BPM (${topBpm.score})${altBpm ? ` / alt ${altBpm.bpm} BPM` : ''}` : 'n/a'} | ${
      topKey ? `${topKey.key} [${topKey.camelot}] (${topKey.score})` : 'n/a'
    }`
  );
  console.log(
    `Sub/Tone  : Sub Peak ${spec.dominantSubPeakHz ?? 'n/a'} Hz (${spec.dominantSubNote?.label ?? 'n/a'}) | Centroid ${
      spec.centroidHz
    } Hz | 85% Rolloff ${spec.rolloff85Hz} Hz`
  );
  console.log(
    `Stereo    : Full corr ${report.stereo.fullBandCorrelation} (S/M ${report.stereo.fullBandSideToMidDb} dB) | Sub <120Hz corr ${
      subCorr?.correlation ?? 'n/a'
    } | Mono fold-down ${dyn.monoFoldDownLossDb} dB`
  );
  console.log('\n7-Band Spectral Energy:');
  for (const b of spec.bands) {
    console.log(`  ${b.band.padEnd(24)} ${String(b.energyPct).padStart(6)}%  (${b.relToTotalDb} dB rel)`);
  }
  console.log('\nDiagnostics:');
  for (const d of report.diagnostics) {
    console.log(`  [${d.severity.toUpperCase()}] ${d.code}: ${d.summary}`);
  }

  if (report.comparison) {
    const cmp = report.comparison.deltas;
    console.log('\n------------------------------------------------------------');
    console.log(`A/B COMPARISON DELTAS (Primary minus ${report.comparison.reference.input.fileName})`);
    console.log('------------------------------------------------------------');
    console.log(
      `LUFS-I Delta : ${cmp.integratedLufsDelta >= 0 ? '+' : ''}${cmp.integratedLufsDelta} LU | True Peak Delta: ${
        cmp.truePeakDeltaDb >= 0 ? '+' : ''
      }${cmp.truePeakDeltaDb} dB | Crest Delta: ${cmp.crestDeltaDb >= 0 ? '+' : ''}${cmp.crestDeltaDb} dB`
    );
    console.log(
      `Tempo/Key    : ${cmp.bpmPrimary} vs ${cmp.bpmReference} BPM (${cmp.bpmHalfDoubleRelation}) | ${cmp.keyPrimary} [${cmp.camelotPrimary}] vs ${cmp.keyReference} [${cmp.camelotReference}] (Camelot compat: ${cmp.camelotCompatible})`
    );
    console.log('Band Deltas (percentage points / relative dB):');
    for (const bd of cmp.bandDeltas) {
      const pSign = bd.pctPointDelta >= 0 ? '+' : '';
      const dSign = bd.relDbDelta >= 0 ? '+' : '';
      console.log(`  ${bd.band.padEnd(24)} ${pSign}${bd.pctPointDelta} pp   (${dSign}${bd.relDbDelta} dB)`);
    }
  }

  console.log(`\nReport JSON : ${reportPath}`);
  if (report.plots.waveformPng) console.log(`Waveform PNG: ${report.plots.waveformPng}`);
  if (report.plots.spectrogramPng) console.log(`Spectro PNG : ${report.plots.spectrogramPng}`);
  if (report.listenMp3) console.log(`Listen MP3  : ${report.listenMp3}`);
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}\n`);
    printUsage();
    process.exit(1);
  }

  if (opts.help || !opts.input) {
    printUsage();
    process.exit(opts.help ? 0 : 1);
  }

  assertFfmpegInstalled();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daw-analyze-'));
  let primarySrc = null;
  let compareSrc = null;

  try {
    const inferredBase = isHttpUrl(opts.input)
      ? safeSlug(decodeURIComponent(path.basename(new URL(opts.input).pathname) || 'track'))
      : safeSlug(path.basename(opts.input));
    const outDir = path.resolve(opts.outDir || `${inferredBase}-analysis`);
    fs.mkdirSync(outDir, { recursive: true });

    primarySrc = await resolveInputSource(opts.input, tempDir, 'primary', opts.jsonOnly);
    const primaryResult = analyzeSingleTrack(primarySrc, outDir, opts, '');

    let comparison = null;
    if (opts.compare) {
      compareSrc = await resolveInputSource(opts.compare, tempDir, 'compare', opts.jsonOnly);
      const refResult = analyzeSingleTrack(compareSrc, outDir, opts, 'compare-');
      comparison = {
        reference: refResult,
        deltas: computeComparisonDeltas(primaryResult, refResult),
      };
    }

    const report = {
      meta: {
        tool: 'daw-agent-skills/analyze-audio.mjs',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        bucketSec: opts.bucketSec,
      },
      ...primaryResult,
      ...(comparison ? { comparison } : {}),
    };

    const reportPath = path.join(outDir, 'report.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    if (opts.jsonOnly) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHumanSummary(report, reportPath);
    }
  } finally {
    primarySrc?.cleanup();
    compareSrc?.cleanup();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore temp dir cleanup errors
    }
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
