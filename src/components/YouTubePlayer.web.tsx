import { useVideoAudioFocus } from "../engagement/useVideoAudioFocus";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { youtubeEmbedUrl } from "../course/videos";
import { emptyWatch, trackWatch } from "../engagement/rewards";
import { loadYouTubeAPI } from "./youtubeApi.web";
import { Txt, useUITheme } from "./ui";

export function YouTubePlayer({
  id,
  title,
  onWatched,
}: {
  id: string;
  title: string;
  onWatched?: () => void;
}) {
  useVideoAudioFocus();
  const { colors } = useUITheme();
  const element = useRef<HTMLIFrameElement>(null);
  const complete = useRef(onWatched);
  complete.current = onWatched;
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
    let live = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      if (live) setError(true);
    }, 12000);
    let player:
      | {
          getCurrentTime(): number;
          getDuration(): number;
          getPlayerState(): number;
          destroy(): void;
        }
      | undefined;
    let watch = emptyWatch(),
      rewarded = false;
    void loadYouTubeAPI()
      .then((api) => {
        if (!live || !element.current) return;
        player = new api.Player(element.current, {
          events: {
            onReady: () => {
              if (!live) return;
              clearTimeout(timeout);
              setError(false);
              timer = setInterval(() => {
                if (!player || rewarded) return;
                const result = trackWatch(
                  watch,
                  player.getCurrentTime(),
                  player.getDuration(),
                  player.getPlayerState() === 1 && !document.hidden,
                  Date.now(),
                );
                watch = result.state;
                if (result.completed) {
                  rewarded = true;
                  complete.current?.();
                }
              }, 1000);
            },
            onError: () => {
              if (live) setError(true);
            },
          },
        });
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
      clearInterval(timer);
      clearTimeout(timeout);
      player?.destroy();
    };
  }, [id]);
  return (
    <View style={{ gap: 10 }}>
      <iframe
        ref={element}
        src={`${youtubeEmbedUrl(id)}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
        title={`Видеоурок: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => setError(true)}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          minHeight: 200,
          border: 0,
          borderRadius: 16,
          backgroundColor: "#20372B",
        }}
      />
      {error && (
        <Txt color={colors.red} accessibilityRole="alert">
          Не удалось подключить плеер или учёт просмотра. Можно открыть видео
          через «Ссылка и источник».
        </Txt>
      )}
    </View>
  );
}
