import { useUITheme } from "./ui";
import React, { useRef, useEffect, useState } from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Topic } from "../core/types";
import { Txt, Button, colors } from "./ui";
export function LessonVideo({
  video,
  seconds,
  onSave,
}: {
  video: NonNullable<Topic["video"]>;
  seconds: number;
  onSave: (n: number) => void;
}) {
  const { colors, styles } = useUITheme();
  const save = useRef(onSave);
  save.current = onSave;
  const initial = useRef(seconds);
  const [error, setError] = useState(false);
  const player = useVideoPlayer(video.url, (p) => {
    p.timeUpdateEventInterval = 5;
  });
  useEffect(() => {
    let restored = false;
    let last = -1;
    const persist = () => {
      const value = player.currentTime;
      if (Number.isFinite(value) && value >= 0 && value !== last) {
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
      if (restored) persist();
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
