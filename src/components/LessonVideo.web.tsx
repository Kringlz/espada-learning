import { useVideoAudioFocus } from "../engagement/useVideoAudioFocus";
import { emptyWatch, trackWatch } from "../engagement/rewards";
import { useUITheme } from "./ui";
import React, { useRef, useState, useEffect } from "react";
import { View } from "react-native";
import { Topic } from "../core/types";
import { Txt, Button, colors, styles } from "./ui";
/** Use the browser's media element directly; native apps use expo-video. */
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
  const element = useRef<HTMLVideoElement>(null);
  const watch = useRef(emptyWatch());
  const rewarded = useRef(false);
  const initial = useRef(seconds);
  const save = useRef(onSave);
  save.current = onSave;
  const last = useRef(-1);
  const restored = useRef(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  function persist(force = false) {
    const v = element.current;
    if (!v || !restored.current || !Number.isFinite(v.currentTime)) return;
    if (force || Math.abs(v.currentTime - last.current) >= 5) {
      last.current = v.currentTime;
      save.current(v.currentTime);
    }
  }
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) persist(true);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  async function toggle() {
    const v = element.current;
    if (!v) return;
    if (v.paused) {
      try {
        await v.play();
        setError("");
      } catch {
        setError("Не удалось начать воспроизведение. Повторите попытку.");
      }
    } else v.pause();
  }
  return (
    <View style={{ gap: 12 }}>
      <video
        ref={element}
        src={video.url}
        controls
        playsInline
        preload="metadata"
        aria-label="Видеоурок"
        lang="ru"
        style={{
          width: "100%",
          maxHeight: 420,
          aspectRatio: "16/9",
          borderRadius: 12,
          background: "#18382B",
        }}
        onLoadedMetadata={() => {
          const v = element.current!;
          if (!restored.current) {
            v.currentTime = Math.min(
              initial.current,
              Math.max(0, v.duration - 0.2),
            );
            restored.current = true;
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          persist(true);
        }}
        onTimeUpdate={() => {
          persist();
          const v = element.current;
          if (!v || rewarded.current) return;
          const result = trackWatch(
            watch.current,
            v.currentTime,
            v.duration,
            !v.paused && !v.seeking && !document.hidden,
            Date.now(),
          );
          watch.current = result.state;
          if (result.completed) {
            rewarded.current = true;
            onWatched?.();
          }
        }}
        onSeeked={() => persist(true)}
        onEnded={() => {
          setPlaying(false);
          persist(true);
        }}
        onError={() =>
          setError(
            "Не удалось открыть видео. Проверьте соединение и формат файла.",
          )
        }
      />
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          secondary
          small
          icon={playing ? "pause" : "play"}
          onPress={() => void toggle()}
        >
          {playing ? "Пауза" : "Воспроизвести"}
        </Button>
        <Button
          secondary
          small
          onPress={() => {
            const v = element.current;
            if (v) {
              v.pause();
              v.currentTime = 0;
              persist(true);
            }
          }}
        >
          С начала
        </Button>
      </View>
      {!!error && (
        <>
          <Txt accessibilityRole="alert" color={colors.red}>
            {error}
          </Txt>
          <Button
            secondary
            onPress={() => {
              setError("");
              restored.current = false;
              element.current?.load();
            }}
          >
            Повторить воспроизведение
          </Button>
        </>
      )}
      {!!video.attribution && <Txt size={12}>{video.attribution}</Txt>}
    </View>
  );
}
