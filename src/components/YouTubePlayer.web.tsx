import { useVideoAudioFocus } from "../engagement/useVideoAudioFocus";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { youtubeEmbedUrl } from "../course/videos";
import { emptyWatch, trackWatch } from "../engagement/rewards";
import { VideoProgress } from "../course/videoLesson/model";
import { loadYouTubeAPI, YouTubeInstance } from "./youtubeApi.web";
import { Button, Txt, useUITheme } from "./ui";
import { MotionActiveContext } from "./Motion";
export type YouTubePlayerProps = {
  id: string;
  title: string;
  onWatched?: () => void;
  progress?: VideoProgress;
  onProgress?: (p: VideoProgress) => void;
};
export function YouTubePlayer({
  id,
  title,
  onWatched,
  progress,
  onProgress,
}: YouTubePlayerProps) {
  useVideoAudioFocus();
  const active = useContext(MotionActiveContext);
  const { colors } = useUITheme();
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onWatched, onProgress });
  callbacks.current = { onWatched, onProgress };
  const saved = useRef(progress);
  saved.current = progress;
  const playerRef = useRef<YouTubeInstance | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || !host.current) return;
    setError("");
    let live = true,
      connected = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let watch = {
      ...(saved.current?.watch ?? emptyWatch()),
      clock: null,
      position: null,
    } as ReturnType<typeof emptyWatch>;
    let rewarded = saved.current?.completed ?? false;
    const start = Math.floor(saved.current?.position ?? 0);
    let playbackStartedAt: number | null = null;
    const frame = document.createElement("iframe");
    frame.src = `${youtubeEmbedUrl(id)}&enablejsapi=1&controls=1&fs=1&start=${start}&origin=${encodeURIComponent(window.location.origin)}`;
    frame.title = `Видеоурок: ${title}`;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    Object.assign(frame.style, {
      width: "100%",
      height: "100%",
      position: "absolute",
      inset: "0",
      border: "0",
      borderRadius: "12px",
    });
    host.current.appendChild(frame);
    let player: YouTubeInstance | undefined;
    const timeout = setTimeout(() => {
      if (live && !connected)
        setError(
          "Видео не загрузилось. Проверь подключение и попробуй ещё раз.",
        );
    }, 14000);
    function sample(count = true) {
      if (!player || !connected) return;
      try {
        const p = player.getCurrentTime(),
          duration = player.getDuration();
        if (!Number.isFinite(p) || !Number.isFinite(duration) || duration <= 0)
          return;
        // YouTube can report near-zero time before applying the restored start offset.
        // Leaving during that window must not erase the last saved position.
        if (player.getPlayerState() === 1 && playbackStartedAt === null)
          playbackStartedAt = Date.now();
        if (
          start > 0 &&
          p < 1 &&
          (playbackStartedAt === null || Date.now() - playbackStartedAt < 2000)
        )
          return;
        const tracked = trackWatch(
          watch,
          p,
          duration,
          count && player.getPlayerState() === 1 && !document.hidden,
          Date.now(),
        );
        watch = tracked.state;
        if (tracked.completed && !rewarded) {
          rewarded = true;
          callbacks.current.onWatched?.();
        }
        const next = { position: p, duration, watch, completed: rewarded };
        saved.current = next;
        callbacks.current.onProgress?.(next);
      } catch {
        /* The iframe may already be shutting down during navigation. */
      }
    }
    function pause() {
      sample();
      player?.pauseVideo?.();
      watch = { ...watch, clock: null, position: null };
    }
    function visibility() {
      if (document.hidden) pause();
    }
    function offline() {
      pause();
      if (live) setError("Нет подключения. Ответы сохраняются на устройстве.");
    }
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    window.addEventListener("offline", offline);
    frame.onerror = () => {
      if (live) setError("Не удалось загрузить видео.");
    };
    void loadYouTubeAPI()
      .then((api) => {
        if (!live) return;
        player = new api.Player(frame, {
          events: {
            onReady: () => {
              if (!live) return;
              connected = true;
              clearTimeout(timeout);
              setError("");
              if (document.hidden) player?.pauseVideo();
              timer = setInterval(() => sample(), 1000);
            },
            onError: (event) => {
              if (live) {
                setError(
                  [101, 150].includes(event.data)
                    ? "Автор запретил встроенный просмотр. Видео можно открыть на YouTube."
                    : "Не удалось загрузить видео. Попробуй ещё раз или открой YouTube.",
                );
              }
            },
            onStateChange: (event) => {
              if (!live) return;
              sample(event.data === 1);
              watch = { ...watch, clock: null, position: null };
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (live)
          setError(
            "Не удалось подключить плеер. Проверь подключение и попробуй ещё раз.",
          );
      });
    return () => {
      pause();
      live = false;
      clearTimeout(timeout);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("offline", offline);
      player?.destroy();
      frame.remove();
      playerRef.current = null;
    };
  }, [id, retry, active]);
  return (
    <View style={{ gap: 12 }}>
      <div
        ref={host}
        data-testid="youtube-container"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          // YouTube requires a 200px minimum viewport. Its video keeps its
          // original proportions with letterboxing on the narrowest phones.
          minHeight: 200,
          borderRadius: 12,
          overflow: "hidden",
          background: "#050912",
        }}
      />
      {!!error && (
        <View style={{ gap: 8 }}>
          <Txt size={14} color={colors.gold} accessibilityRole="alert">
            {error}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Button small secondary onPress={() => setRetry((n) => n + 1)}>
              Повторить загрузку
            </Button>
            <Button
              small
              secondary
              onPress={() => {
                playerRef.current?.pauseVideo();
                void Linking.openURL(
                  `https://www.youtube.com/watch?v=${id}&t=${Math.floor(saved.current?.position ?? 0)}`,
                ).catch(() => setError("Не удалось открыть YouTube."));
              }}
            >
              Открыть YouTube
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
