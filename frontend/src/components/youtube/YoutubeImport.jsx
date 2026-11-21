import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Film,
  Music2,
  Link2,
  LoaderCircle,
  Scissors,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import { api } from '../../api';

function parseTimestamp(value) {
  const parts = value.trim().split(':');
  if (parts.length < 1 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  const numbers = parts.map(Number);
  if (numbers.length > 1 && numbers[numbers.length - 1] >= 60) return null;
  if (numbers.length === 3 && numbers[1] >= 60) return null;

  return numbers.reduce((seconds, part) => seconds * 60 + part, 0);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return 'Duration unavailable';
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export default function YoutubeImport() {
  const [url, setUrl] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [video, setVideo] = useState(null);
  const [mediaType, setMediaType] = useState('video');
  const [quality, setQuality] = useState('best');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  const inspectVideo = async (event) => {
    event.preventDefault();
    setError('');
    setVideo(null);

    if (!hasPermission) {
      setError('Confirm that this is your video or that you have permission to download it.');
      return;
    }

    setIsLoadingInfo(true);
    try {
      const result = await api.youtube.info({ url, has_permission: hasPermission });
      setVideo(result);
      setQuality('best');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const downloadVideo = async (event) => {
    event.preventDefault();
    setError('');

    let startSeconds;
    let endSeconds;
    if (startTime.trim() || endTime.trim()) {
      startSeconds = parseTimestamp(startTime);
      endSeconds = parseTimestamp(endTime);
      if (startSeconds === null || endSeconds === null) {
        setError('Enter both timestamps as seconds, MM:SS, or HH:MM:SS.');
        return;
      }
      if (endSeconds <= startSeconds) {
        setError('The end timestamp must be after the start timestamp.');
        return;
      }
      if (Number.isFinite(video?.duration) && endSeconds > video.duration) {
        setError(`The end timestamp must be within the video duration (${formatDuration(video.duration)}).`);
        return;
      }
    }

    setIsDownloading(true);
    try {
      const result = await api.youtube.download({
        url,
        has_permission: hasPermission,
        media_type: mediaType,
        quality,
        start_seconds: startSeconds,
        end_seconds: endSeconds,
      });
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="space-y-7">
      <header className="relative overflow-hidden rounded-[2rem] bg-ink px-7 py-9 text-white shadow-lg sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-1 top-0 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
            <Youtube className="h-3.5 w-3.5 text-red-400" />
            Source ingest / YouTube
          </div>
          <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Bring your footage into the edit.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
            Import your own channel videos in the best available quality, or pull just the moment you need.
          </p>
        </div>
        <Film className="absolute bottom-8 right-10 hidden h-20 w-20 text-white/10 sm:block" strokeWidth={1} />
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <form onSubmit={video ? downloadVideo : inspectVideo} className="studio-card rounded-3xl p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-mute">01 / Video source</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-ink">Paste a video link</h2>
            </div>
            <div className="rounded-2xl bg-red-50 p-3 text-red-600">
              <Link2 className="h-5 w-5" />
            </div>
          </div>

          <label htmlFor="youtube-url" className="text-[10px] font-black uppercase tracking-widest text-mute">
            YouTube URL
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="youtube-url"
              type="url"
              required
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setVideo(null);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="studio-input min-w-0 flex-1"
            />
            {!video && (
              <button
                type="submit"
                disabled={isLoadingInfo || !url.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-xs font-black text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingInfo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
                {isLoadingInfo ? 'Checking…' : 'Inspect video'}
              </button>
            )}
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline bg-canvas-soft/60 p-4">
            <input
              type="checkbox"
              checked={hasPermission}
              onChange={(event) => setHasPermission(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ink"
            />
            <span className="text-xs leading-5 text-body">
              I own this video or have permission to download and reuse it.
            </span>
          </label>

          {video && (
            <div className="mt-7 animate-fade-in space-y-7 border-t border-hairline pt-7">
              <div className="flex gap-4">
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="aspect-video w-32 shrink-0 rounded-xl bg-canvas-soft object-cover sm:w-44"
                  />
                )}
                <div className="min-w-0 self-center">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Video ready
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-ink">{video.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-mute">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDuration(video.duration)}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-mute">Download as</span>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-canvas-soft p-1">
                      {[
                        { value: 'video', label: 'Video', Icon: Film },
                        { value: 'audio', label: 'Audio · MP3', Icon: Music2 },
                      ].map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={mediaType === value}
                          onClick={() => setMediaType(value)}
                          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${
                            mediaType === value
                              ? 'bg-white text-ink shadow-sm'
                              : 'text-mute hover:text-ink'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mediaType === 'video' && (
                    <div>
                      <label htmlFor="youtube-quality" className="text-[10px] font-black uppercase tracking-widest text-mute">
                        Video quality
                      </label>
                      <select
                        id="youtube-quality"
                        value={quality}
                        onChange={(event) => setQuality(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-hairline bg-canvas-soft px-3 py-3 text-sm font-bold text-ink outline-none focus:border-ink/30"
                      >
                        <option value="best">Best available quality</option>
                        {(video.qualities || []).map((height) => (
                          <option key={height} value={String(height)}>{height}p</option>
                        ))}
                      </select>
                      <p className="mt-2 text-[10px] leading-4 text-mute">
                        Best available selects the highest video stream and combines it with audio.
                      </p>
                    </div>
                  )}
                  {mediaType === 'audio' && (
                    <p className="rounded-xl border border-hairline bg-canvas-soft/50 p-3 text-[10px] leading-4 text-mute">
                      Audio downloads use the best available audio stream and are converted to high-quality MP3.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-hairline bg-canvas-soft/50 p-4">
                  <div className="flex items-center gap-2 text-ink">
                    <Scissors className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Optional clip range</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-mute">Leave both blank to download the whole video.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-mute">
                      Start
                      <input
                        type="text"
                        inputMode="numeric"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        placeholder="00:00:00"
                        aria-label="Clip start timestamp"
                        className="studio-input mt-1 w-full text-xs font-semibold"
                      />
                    </label>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-mute">
                      End
                      <input
                        type="text"
                        inputMode="numeric"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        placeholder="00:01:30"
                        aria-label="Clip end timestamp"
                        className="studio-input mt-1 w-full text-xs font-semibold"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isDownloading || !hasPermission}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-ink/90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isDownloading ? `Preparing your ${mediaType}…` : `Download ${mediaType}`}
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft p-3 text-xs leading-5 text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </form>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-hairline bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-black text-ink">Made for your own footage</h2>
            <p className="mt-2 text-xs leading-5 text-body">
              Use this importer for videos you own or are authorized to reuse. Make sure your intended use follows
              YouTube’s terms and any applicable licenses.
            </p>
          </div>
          <div className="rounded-3xl border border-hairline bg-canvas-soft/70 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-mute">How it works</p>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3 text-xs leading-5 text-body">
                <span className="font-mono text-[10px] font-bold text-mute">01</span>
                Paste a single video URL and inspect its duration and available resolutions.
              </li>
              <li className="flex gap-3 text-xs leading-5 text-body">
                <span className="font-mono text-[10px] font-bold text-mute">02</span>
                Choose the best available stream or cap the resolution, then optionally set a clip range.
              </li>
              <li className="flex gap-3 text-xs leading-5 text-body">
                <span className="font-mono text-[10px] font-bold text-mute">03</span>
                Download the prepared video directly to your device.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </section>
  );
}
