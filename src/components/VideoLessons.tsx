import { errorMessage } from "../i18n/errors";
import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import type { DocumentPickerAsset } from "expo-document-picker";
import { Topic, VideoLesson } from "../core/types";
import { useLearning } from "../services/context";
import { pickVideo, uploadVideo, resolveVideo } from "../services/videos";
import { LessonVideo } from "./LessonVideo";
import { Button, Card, Txt, Field, Notice, SectionTitle, colors } from "./ui";
function StoredPlayer({
  video,
  seconds,
  onSave,
}: {
  video: VideoLesson;
  seconds: number;
  onSave: (seconds: number) => void;
}) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let release = () => {};
    setSource("");
    setError("");
    void resolveVideo(video)
      .then((result) => {
        if (!active) {
          result.release();
          return;
        }
        release = result.release;
        setSource(result.url);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
      release();
    };
  }, [video.id, retry]);
  if (error)
    return (
      <View style={{ gap: 12 }}>
        <Txt color={colors.red} accessibilityRole="alert">
          {error}
        </Txt>
        <Button secondary onPress={() => setRetry((x) => x + 1)}>
          Повторить загрузку
        </Button>
      </View>
    );
  if (!source) return <Txt>Открываем видео…</Txt>;
  return (
    <LessonVideo
      video={{ url: source, attribution: "", captioned: false }}
      seconds={seconds}
      onSave={onSave}
    />
  );
}
export function VideoLessons({ topic }: { topic: Topic }) {
  const { actor, state, dispatch, mode } = useLearning();
  const staff = actor.role !== "student";
  const [asset, setAsset] = useState<DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const uploaded = useRef<VideoLesson | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const positions =
    state.activities.find(
      (a) => a.studentId === actor.id && a.topicId === topic.id,
    )?.videoPositions ?? {};
  async function choose() {
    setError("");
    setNotice("");
    try {
      const selected = await pickVideo();
      if (selected) {
        setAsset(selected);
        setTitle(selected.name.replace(/\.mp4$/i, ""));
        uploaded.current = null;
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function publish() {
    if (!asset || busy) return;
    setBusy(true);
    setError("");
    try {
      // Retain the uploaded object across uncertain publish retries; the command is idempotent.
      const video =
        uploaded.current ??
        (await uploadVideo(asset, title, actor.id, topic.id));
      uploaded.current = video;
      await dispatch({ type: "attachVideo", topicId: topic.id, video });
      uploaded.current = null;
      setAsset(null);
      setTitle("");
      setNotice("Видеоурок добавлен. Он доступен ученикам в этой теме.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function save(videoId: string, seconds: number) {
    if (staff) return;
    void dispatch({
      type: "saveVideoPosition",
      studentId: actor.id,
      topicId: topic.id,
      videoId,
      seconds,
    }).catch(() =>
      setError("Не удалось сохранить позицию просмотра. Проверьте соединение."),
    );
  }
  return (
    <Card>
      <SectionTitle title="Видеоуроки" icon="video" />
      <Txt size={13} color={colors.muted}>
        {staff
          ? "Добавьте объяснение к этой теме. Ученики смогут смотреть его здесь."
          : "Смотрите в своём темпе. Позиция просмотра сохраняется. Просмотр не подтверждает освоение темы."}
      </Txt>
      {!topic.videos?.length && !topic.video && (
        <Txt color={colors.muted}>Видеоурок пока не добавлен.</Txt>
      )}
      {topic.video && (
        <LessonVideo video={topic.video} seconds={0} onSave={() => {}} />
      )}
      {topic.videos?.map((video, i) => (
        <View
          key={video.id}
          style={{
            gap: 12,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Txt weight="600">
            {i + 1}. {video.title}
          </Txt>
          <Txt size={12} color={colors.muted}>
            {(video.size / 1024 / 1024).toLocaleString("ru-RU", {
              maximumFractionDigits: 1,
            })}{" "}
            МБ
            {positions[video.id] > 0
              ? ` · Продолжить с ${Math.floor(positions[video.id] / 60)}:${String(Math.floor(positions[video.id] % 60)).padStart(2, "0")}`
              : ""}
          </Txt>
          {playing === video.id ? (
            <>
              <StoredPlayer
                video={video}
                seconds={positions[video.id] ?? 0}
                onSave={(seconds) => save(video.id, seconds)}
              />
              <Button secondary small onPress={() => setPlaying(null)}>
                Закрыть видео
              </Button>
            </>
          ) : (
            <Button
              secondary
              icon="play-circle"
              onPress={() => setPlaying(video.id)}
            >
              Смотреть видео
            </Button>
          )}
        </View>
      ))}
      {staff && (
        <View style={{ gap: 12 }}>
          <Txt size={12} color={colors.muted}>
            {mode === "demo"
              ? "В демо файлы сохраняются в этом браузере или приложении на устройстве."
              : "Файлы доступны авторизованным участникам учебного центра."}{" "}
            MP4 до 50 МБ. Для совместимости используйте H.264 и звук AAC.
          </Txt>
          {!asset ? (
            <Button icon="upload" onPress={() => void choose()}>
              Загрузить видеоурок
            </Button>
          ) : (
            <>
              <Txt size={13}>{asset.name}</Txt>
              <Field
                label="Название видеоурока"
                value={title}
                editable={!busy && !uploaded.current}
                onChangeText={setTitle}
                maxLength={160}
              />
              <Button
                disabled={busy || !title.trim()}
                onPress={() => void publish()}
              >
                {busy
                  ? "Загружаем видео…"
                  : uploaded.current
                    ? "Повторить публикацию"
                    : "Добавить к теме"}
              </Button>
              {!uploaded.current && (
                <Button
                  secondary
                  disabled={busy}
                  onPress={() => setAsset(null)}
                >
                  Отмена
                </Button>
              )}
            </>
          )}
        </View>
      )}
      {!!error && <Notice tone="error">{error}</Notice>}
      {!!notice && <Notice>{notice}</Notice>}
    </Card>
  );
}
