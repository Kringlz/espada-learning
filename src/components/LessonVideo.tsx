import { useVideoAudioFocus } from "../engagement/useVideoAudioFocus";
import { emptyWatch, trackWatch } from "../engagement/rewards";
import { useUITheme } from "./ui";
import React, { useRef, useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Topic } from "../core/types";
import { Txt, Button, colors } from "./ui";
export function LessonVideo({
  video,
  seconds,
  onSave,
  onWatched,
}: {
  video: NonNullable<Topic["video"]>;
  seconds: number;
  onSave: (n: number) => void;
  onWatched?: () => void;
}) {
  useVideoAudioFocus();
  const { colors, styles } = useUITheme();
  const complete = useRef(onWatched);
  complete.current = onWatched;
  const save = useRef(onSave);
  save.current = onSave;
  const initial = useRef(seconds);
  const [error, setError] = useState(false);
  const player = useVideoPlayer(video.url, (p) => {
    p.timeUpdateEventInterval = 1;
  });
  useEffect(() => {
    let restored = false;
    let watch = emptyWatch(),
      rewarded = false;
    let last = -1;
    const persist = () => {
      const value = player.currentTime;
      if (Number.isFinite(value) && value >= 0 && Math.abs(value - last) >= 5) {
        last = value;
        save.current(value);
      }
    };
    const restore = () => {
      if (!restored && player.status === "readyToPlay") {
        restored = true;
        player.currentTime = Math.min(
          initial.current,
          Math.max(0, player.duration - 0.2),
        );
      }
    };
    const a = player.addListener("timeUpdate", () => {
      if (restored) {
        persist();
        const result = trackWatch(
          watch,
          player.currentTime,
          player.duration,
          player.playing && AppState.currentState === "active",
          Date.now(),
        );
        watch = result.state;
        if (result.completed && !rewarded) {
          rewarded = true;
          complete.current?.();
        }
      }
    });
    const b = player.addListener("playingChange", (e) => {
      if (!e.isPlaying && restored) persist();
    });
    const c = player.addListener("statusChange", (e) => {
      setError(e.status === "error");
      restore();
    });
    restore();
    return () => {
      a.remove();
      b.remove();
      c.remove();
    };
  }, [player]);
  return (
    <View style={{ gap: 10 }}>
      <VideoView
        player={player}
        nativeControls
        style={{ height: 240, width: "100%", borderRadius: 12 }}
      />
      {error && (
        <>
          <Txt color={colors.red} accessibilityRole="alert">
            Не удалось воспроизвести видео. Проверьте соединение и формат файла.
          </Txt>
          <Button
            secondary
            onPress={() =>
              void player.replaceAsync(video.url).catch(() => setError(true))
            }
          >
            Повторить воспроизведение
          </Button>
        </>
      )}
      {!!video.attribution && <Txt size={12}>{video.attribution}</Txt>}
      {video.captioned && (
        <Txt size={12}>Субтитры доступны в настройках плеера.</Txt>
      )}
    </View>
  );
}
