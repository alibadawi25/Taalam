import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  CornersIn,
  CornersOut,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import "./LessonPlayer.css";

// ── YouTube IFrame API loader (singleton) ───────────────
// The YT API script is loaded once per page and resolves a promise when ready.
// Subsequent mounts reuse the same promise.
let ytReadyPromise = null;
function loadYouTubeIframeAPI() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (ytReadyPromise) return ytReadyPromise;

  ytReadyPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });
  return ytReadyPromise;
}

// ── Helpers ──────────────────────────────────────────────
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const IDLE_HIDE_MS = 2500;
const PERSIST_INTERVAL_SEC = 5;

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

function LessonPlayer({
  videoId,
  lessonNumber,
  lessonTitle,
  courseTitle,
  categoryMeta,
  durationSeconds: durationHint = 0,
  initialFurthestSeconds = 0,
  seekRequest,
  onProgress,
  onComplete,
  onTimeUpdate,
  onNext,
  hasNext,
}) {
  // ── Refs ──────────────────────────────────────────────
  const containerRef = useRef(null);
  const playerHostRef = useRef(null);
  const playerRef = useRef(null);
  const progressBarRef = useRef(null);
  const idleTimerRef = useRef(null);
  const currentTimeRef = useRef(0);
  const lastSeekRef = useRef({ at: 0, target: null });
  const initialResumeRef = useRef(
    Math.max(0, Number(initialFurthestSeconds) || 0),
  );

  // Mutable state read from inside the poll interval — refs so the effect
  // does not need to be torn down on every tick.
  const furthestWatchedRef = useRef(initialFurthestSeconds || 0);
  const lastPersistAtRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const flushProgressRef = useRef(() => {});

  // ── Reactive state ────────────────────────────────────
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHint || 0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [furthestWatched, setFurthestWatched] = useState(
    initialFurthestSeconds || 0,
  );
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Keep onProgress ref current so the poll interval can call the latest
  // version without recreating the interval.
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    flushProgressRef.current = ({ isCompleted = false } = {}) => {
      if (!onProgressRef.current) return;

      const player = playerRef.current;
      let currentSeconds = currentTimeRef.current;
      let durationSeconds = duration;

      try {
        const liveCurrent = Number(player?.getCurrentTime?.());
        if (Number.isFinite(liveCurrent) && liveCurrent >= 0) {
          currentSeconds = liveCurrent;
        }
      } catch {
        /* ignore */
      }

      try {
        const liveDuration = Number(player?.getDuration?.());
        if (Number.isFinite(liveDuration) && liveDuration > 0) {
          durationSeconds = liveDuration;
        }
      } catch {
        /* ignore */
      }

      const safeCurrent = Math.max(0, Math.floor(Number(currentSeconds) || 0));
      const safeFurthest = Math.max(
        safeCurrent,
        Math.floor(Number(furthestWatchedRef.current) || 0),
      );

      furthestWatchedRef.current = safeFurthest;
      setFurthestWatched((prev) => Math.max(prev, safeFurthest));

      onProgressRef.current({
        currentSeconds: safeCurrent,
        furthestSeconds: safeFurthest,
        durationSeconds: Math.max(0, Math.floor(Number(durationSeconds) || 0)),
        isCompleted,
      });
    };
  }, [duration]);

  useEffect(() => {
    // Freeze resume point per opened lesson/video to avoid re-seeking while watching.
    initialResumeRef.current = Math.max(0, Number(initialFurthestSeconds) || 0);
  }, [videoId, initialFurthestSeconds]);

  // ── Initialize YT.Player once ─────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const YT = await loadYouTubeIframeAPI();
      if (cancelled || !YT || !playerHostRef.current) return;

      const player = new YT.Player(playerHostRef.current, {
        videoId: videoId || "",
        playerVars: {
          autoplay: 0,
          controls: 0,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setIsReady(true);
            try {
              const iframe = event.target.getIframe?.();
              iframe?.classList?.add("lpl-yt-iframe");
              const reportedDuration = event.target.getDuration();
              if (reportedDuration > 0) setDuration(reportedDuration);
              setVolume(event.target.getVolume());
              setIsMuted(event.target.isMuted());
            } catch {
              /* ignore */
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            const states = window.YT.PlayerState;
            if (state === states.PLAYING) {
              setIsPlaying(true);
              setIsEnded(false);
            } else if (state === states.PAUSED) {
              setIsPlaying(false);
              flushProgressRef.current();
            } else if (state === states.ENDED) {
              setIsPlaying(false);
              setIsEnded(true);
            }
          },
        },
      });
      playerRef.current = player;
    }

    init();

    return () => {
      cancelled = true;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      flushProgressRef.current();
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load a new video when videoId changes ────────────
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady || !videoId) return;

    const resumeAt = initialResumeRef.current;

    try {
      if (resumeAt > 0) {
        player.cueVideoById({ videoId, startSeconds: resumeAt });
      } else {
        player.cueVideoById(videoId);
      }
    } catch {
      /* ignore */
    }
    setIsEnded(false);
    setCurrentTime(resumeAt);
    currentTimeRef.current = resumeAt;
    setBufferedFraction(0);
    furthestWatchedRef.current = resumeAt;
    setFurthestWatched(resumeAt);
    lastSeekRef.current = { at: 0, target: null };
    lastPersistAtRef.current = 0;
  }, [videoId, isReady]);

  useEffect(() => {
    if (!seekRequest || !isReady) return;

    const nextTime = Math.max(0, Math.floor(Number(seekRequest.seconds) || 0));
    const player = playerRef.current;
    if (!player) return;

    const liveDuration = Number(player.getDuration?.());
    const safeDuration =
      Number.isFinite(liveDuration) && liveDuration > 0 ? liveDuration : duration;
    const clamped = Math.max(0, Math.min(safeDuration || nextTime, nextTime));

    try {
      player.seekTo(clamped, true);
    } catch {
      /* ignore */
    }
    lastSeekRef.current = { at: Date.now(), target: clamped };
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;

    if (seekRequest.autoPlay) {
      try {
        playerRef.current?.playVideo?.();
      } catch {
        /* ignore */
      }
    }
  }, [duration, isReady, seekRequest]);

  // ── Poll player state for UI ─────────────────────────
  useEffect(() => {
    if (!isReady) return undefined;

    const intervalId = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      try {
        const rawCurrent = Number(player.getCurrentTime());
        const t = Number.isFinite(rawCurrent) ? rawCurrent : currentTimeRef.current;
        const rawDuration = Number(player.getDuration());
        const d = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
        const loaded = player.getVideoLoadedFraction?.() || 0;
        let displayTime = t;
        const { at: lastSeekAt, target: lastSeekTarget } = lastSeekRef.current;
        if (
          Number.isFinite(lastSeekTarget) &&
          Date.now() - lastSeekAt < 700 &&
          t + 1 < lastSeekTarget
        ) {
          // Prevent brief snap-back right after a manual seek.
          displayTime = lastSeekTarget;
        } else if (Date.now() - lastSeekAt >= 700) {
          lastSeekRef.current = { at: 0, target: null };
        }

        setCurrentTime(displayTime);
        currentTimeRef.current = displayTime;
        onTimeUpdateRef.current?.(Math.floor(displayTime));
        if (d > 0) {
          setDuration((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
        }
        setBufferedFraction(loaded);

        if (t > furthestWatchedRef.current) {
          furthestWatchedRef.current = t;
          setFurthestWatched(t);
        }

        // Persist every PERSIST_INTERVAL_SEC seconds of playback
        if (
          onProgressRef.current &&
          t - lastPersistAtRef.current >= PERSIST_INTERVAL_SEC
        ) {
          lastPersistAtRef.current = t;
          onProgressRef.current({
            currentSeconds: Math.floor(t),
            furthestSeconds: Math.floor(furthestWatchedRef.current),
            durationSeconds: Math.floor(d),
            isCompleted: false,
          });
        }
      } catch {
        /* ignore transient player errors */
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [isReady]);

  useEffect(() => {
    const flushProgress = () => flushProgressRef.current();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushProgress();
      }
    };

    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushProgress);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ── Completion side effect ────────────────────────────
  useEffect(() => {
    if (!isEnded) return;
    onComplete?.();
  }, [isEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-hide controls when idle during playback ─────
  const scheduleHide = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedMenu(false);
    }, IDLE_HIDE_MS);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (isPlaying) scheduleHide();
  }, [isPlaying, scheduleHide]);

  useEffect(() => {
    if (isPlaying) {
      scheduleHide();
    } else {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setShowControls(true);
    }
  }, [isPlaying, scheduleHide]);

  // ── Fullscreen change listener ───────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Control actions ──────────────────────────────────
  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isEnded) {
      try {
        player.seekTo(0, true);
        player.playVideo();
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
    } catch {
      /* ignore */
    }
  }, [isPlaying, isEnded]);

  const continueFromSaved = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const resumeAt = Math.max(0, Number(initialResumeRef.current) || 0);
    try {
      if (resumeAt > 0) {
        player.seekTo(resumeAt, true);
        lastSeekRef.current = { at: Date.now(), target: resumeAt };
        setCurrentTime(resumeAt);
        currentTimeRef.current = resumeAt;
      }
      player.playVideo();
    } catch {
      /* ignore */
    }
    revealControls();
  }, [revealControls]);

  const seekBy = useCallback(
    (delta) => {
      const player = playerRef.current;
      if (!player) return;
      const liveTime = Number(player.getCurrentTime?.());
      const baseTime = Number.isFinite(liveTime) ? liveTime : currentTimeRef.current;
      const liveDuration = Number(player.getDuration?.());
      const safeDuration =
        Number.isFinite(liveDuration) && liveDuration > 0 ? liveDuration : duration;
      if (!Number.isFinite(safeDuration) || safeDuration <= 0) return;

      const next = Math.max(0, Math.min(safeDuration, baseTime + delta));
      try {
        player.seekTo(next, true);
      } catch {
        /* ignore */
      }
      lastSeekRef.current = { at: Date.now(), target: next };
      setCurrentTime(next);
      currentTimeRef.current = next;
      revealControls();
    },
    [duration, revealControls],
  );

  const seekTo = useCallback(
    (time) => {
      const player = playerRef.current;
      if (!player) return;
      const liveDuration = Number(player.getDuration?.());
      const safeDuration =
        Number.isFinite(liveDuration) && liveDuration > 0 ? liveDuration : duration;
      const clamped = Math.max(0, Math.min(safeDuration || time, time));
      try {
        player.seekTo(clamped, true);
      } catch {
        /* ignore */
      }
      lastSeekRef.current = { at: Date.now(), target: clamped };
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
    },
    [duration],
  );

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch {
      /* ignore */
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback(
    (nextVolume) => {
      const player = playerRef.current;
      if (!player) return;
      try {
        player.setVolume(nextVolume);
        setVolume(nextVolume);
        if (nextVolume > 0 && isMuted) {
          player.unMute();
          setIsMuted(false);
        }
      } catch {
        /* ignore */
      }
    },
    [isMuted],
  );

  const handleRateChange = useCallback((rate) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.setPlaybackRate(rate);
    } catch {
      /* ignore */
    }
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {
        /* ignore */
      });
    } else {
      document.exitFullscreen?.().catch(() => {
        /* ignore */
      });
    }
  }, []);

  // ── Progress bar scrubbing ───────────────────────────
  const scrubFromClientX = useCallback(
    (clientX) => {
      const bar = progressBarRef.current;
      if (!bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      seekTo(ratio * duration);
    },
    [duration, seekTo],
  );

  useEffect(() => {
    if (!isScrubbing) return undefined;
    const move = (e) => scrubFromClientX(e.clientX);
    const up = () => setIsScrubbing(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isScrubbing, scrubFromClientX]);

  // ── Keyboard shortcuts ────
  useEffect(() => {
    const handler = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const activeElement = document.activeElement;
      const playerRoot = containerRef.current;
      const hasPlayerContext =
        !activeElement ||
        activeElement === document.body ||
        (playerRoot && playerRoot.contains(activeElement)) ||
        document.fullscreenElement === playerRoot;
      if (!hasPlayerContext) return;

      switch (e.key) {
        case "Spacebar":
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          revealControls();
          togglePlay();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          revealControls();
          seekBy(-10);
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          revealControls();
          seekBy(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          revealControls();
          handleVolumeChange(Math.min(100, (isMuted ? 0 : volume) + 5));
          break;
        case "ArrowDown":
          e.preventDefault();
          revealControls();
          handleVolumeChange(Math.max(0, (isMuted ? 0 : volume) - 5));
          break;
        case "Home":
          e.preventDefault();
          revealControls();
          seekTo(0);
          break;
        case "End": {
          const totalDuration = playerRef.current?.getDuration?.() || 0;
          if (Number.isFinite(totalDuration) && totalDuration > 0) {
            e.preventDefault();
            revealControls();
            seekTo(totalDuration);
          }
          break;
        }
        case "f":
        case "F":
          e.preventDefault();
          revealControls();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          revealControls();
          toggleMute();
          break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            const ratio = Number(e.key) / 10;
            const totalDuration = playerRef.current?.getDuration?.() || 0;
            if (Number.isFinite(totalDuration) && totalDuration > 0) {
              e.preventDefault();
              revealControls();
              seekTo(ratio * totalDuration);
            }
          }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    togglePlay,
    seekBy,
    toggleFullscreen,
    toggleMute,
    seekTo,
    revealControls,
    handleVolumeChange,
    isMuted,
    volume,
  ]);

  // ── Render ───────────────────────────────────────────
  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = Math.min(100, bufferedFraction * 100);
  const furthestPercent =
    duration > 0 ? Math.min(100, (furthestWatched / duration) * 100) : 0;
  const resumeSeconds = initialResumeRef.current;
  const showResumeButton =
    isReady &&
    !isPlaying &&
    !isEnded &&
    Number.isFinite(resumeSeconds) &&
    resumeSeconds >= 10;
  const CategoryIcon = categoryMeta?.Icon;

  const rootClass = [
    "lpl-root",
    showControls ? "is-active" : "is-idle",
    isPlaying ? "is-playing" : "is-paused",
    isEnded ? "is-ended" : "",
    isFullscreen ? "is-fullscreen" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      className={rootClass}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setShowSpeedMenu(false);
        }
      }}
      tabIndex={0}
      role="region"
      aria-label="مشغل الدرس"
    >
      {/* YouTube iframe mounts here (the div is replaced by an <iframe>) */}
      <div className="lpl-iframe-slot" ref={playerHostRef} />

      {/* Transparent surface below panels — click to toggle play */}
      <button
        type="button"
        className="lpl-surface"
        onClick={togglePlay}
        aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
        tabIndex={-1}
      />

      {/* Top bar — category + lesson title */}
      <div className="lpl-top">
        <div className="lpl-top-info">
          {CategoryIcon ? (
            <span
              className="lpl-category-chip"
              style={{ backgroundColor: categoryMeta?.color }}
              aria-hidden="true"
            >
              <CategoryIcon weight="duotone" />
            </span>
          ) : null}
          <div className="lpl-top-text">
            {lessonNumber ? (
              <span className="lpl-kicker">الدرس {lessonNumber}</span>
            ) : null}
            <span className="lpl-top-title">{lessonTitle}</span>
            {courseTitle ? (
              <span className="lpl-top-course">{courseTitle}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Big center play button — visible when paused/not started */}
      {!isPlaying && !isEnded && (
        <button
          type="button"
          className="lpl-big-play"
          onClick={togglePlay}
          aria-label="تشغيل الدرس"
        >
          <span className="lpl-big-play-ring" aria-hidden="true" />
          <Play weight="fill" aria-hidden="true" />
        </button>
      )}

      {showResumeButton && (
        <button
          type="button"
          className="lpl-resume-btn"
          onClick={continueFromSaved}
          aria-label={`متابعة من ${formatTime(resumeSeconds)}`}
        >
          متابعة من {formatTime(resumeSeconds)}
        </button>
      )}

      {/* Completion overlay */}
      {isEnded && (
        <div
          className="lpl-complete"
          role="region"
          aria-label="اكتمل الدرس"
        >
          <div className="lpl-complete-card">
            <div className="lpl-complete-icon" aria-hidden="true">
              <CheckCircle weight="fill" />
            </div>
            <h3 className="lpl-complete-title">أحسنت! لقد أتممت الدرس</h3>
            <p className="lpl-complete-sub">واصل التعلم — نجاحك يبدأ بخطوة.</p>
            <div className="lpl-complete-actions">
              <button
                type="button"
                className="lpl-complete-btn lpl-complete-btn--ghost"
                onClick={() => {
                  seekTo(0);
                  try {
                    playerRef.current?.playVideo();
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                إعادة المشاهدة
              </button>
              {hasNext && onNext ? (
                <button
                  type="button"
                  className="lpl-complete-btn lpl-complete-btn--primary"
                  onClick={() => onNext()}
                >
                  الدرس التالي
                  <ArrowRight weight="bold" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="lpl-bottom">
        {/* Scrubbable progress bar */}
        <div
          className="lpl-progress"
          ref={progressBarRef}
          role="slider"
          tabIndex={-1}
          aria-label="تقدم الفيديو"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.round(duration))}
          aria-valuenow={Math.round(currentTime)}
          onMouseDown={(e) => {
            setIsScrubbing(true);
            scrubFromClientX(e.clientX);
          }}
          onClick={(e) => scrubFromClientX(e.clientX)}
        >
          <div className="lpl-progress-track">
            <div
              className="lpl-progress-buffered"
              style={{ width: `${bufferedPercent}%` }}
            />
            {furthestPercent > playedPercent + 0.5 && (
              <div
                className="lpl-progress-furthest"
                style={{ width: `${furthestPercent}%` }}
                aria-hidden="true"
              />
            )}
            <div
              className="lpl-progress-played"
              style={{ width: `${playedPercent}%` }}
            >
              <span className="lpl-progress-thumb" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Button row */}
        <div className="lpl-controls">
          <button
            type="button"
            className="lpl-ctrl-btn lpl-ctrl-btn--primary"
            onClick={togglePlay}
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          >
            {isPlaying ? (
              <Pause weight="fill" aria-hidden="true" />
            ) : (
              <Play weight="fill" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className="lpl-ctrl-btn lpl-ctrl-btn--seek"
            onClick={() => seekBy(-10)}
            aria-label="الرجوع 10 ثوانٍ"
          >
            <ArrowCounterClockwise weight="bold" aria-hidden="true" />
            <span className="lpl-seek-pill">10</span>
          </button>

          <button
            type="button"
            className="lpl-ctrl-btn lpl-ctrl-btn--seek"
            onClick={() => seekBy(10)}
            aria-label="التقدم 10 ثوانٍ"
          >
            <ArrowClockwise weight="bold" aria-hidden="true" />
            <span className="lpl-seek-pill">10</span>
          </button>

          <div className="lpl-volume">
            <button
              type="button"
              className="lpl-ctrl-btn"
              onClick={toggleMute}
              aria-label={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
            >
              {isMuted || volume === 0 ? (
                <SpeakerSlash weight="fill" aria-hidden="true" />
              ) : (
                <SpeakerHigh weight="fill" aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              className="lpl-volume-slider"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="مستوى الصوت"
            />
          </div>

          <div className="lpl-time" aria-hidden={false}>
            <span className="lpl-time-current">{formatTime(currentTime)}</span>
            <span className="lpl-time-sep">/</span>
            <span className="lpl-time-total">{formatTime(duration)}</span>
          </div>

          <div className="lpl-spacer" />

          <div className="lpl-speed">
            <button
              type="button"
              className={`lpl-ctrl-btn lpl-speed-btn ${showSpeedMenu ? "is-open" : ""}`}
              onClick={() => setShowSpeedMenu((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={showSpeedMenu}
              aria-label="سرعة التشغيل"
            >
              {playbackRate}×
            </button>
            {showSpeedMenu && (
              <div className="lpl-speed-menu" role="menu">
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`lpl-speed-option ${rate === playbackRate ? "is-current" : ""}`}
                    onClick={() => handleRateChange(rate)}
                    role="menuitemradio"
                    aria-checked={rate === playbackRate}
                  >
                    <span>{rate}×</span>
                    {rate === playbackRate && (
                      <CheckCircle weight="fill" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="lpl-ctrl-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "إغلاق ملء الشاشة" : "ملء الشاشة"}
          >
            {isFullscreen ? (
              <CornersIn weight="bold" aria-hidden="true" />
            ) : (
              <CornersOut weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonPlayer;
