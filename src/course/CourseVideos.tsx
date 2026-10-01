import { useUITheme } from "../components/ui";
import React, { useState } from "react";
import { Linking, View } from "react-native";
import {
  Button,
  Card,
  Disclosure,
  Txt,
  colors,
  styles,
} from "../components/ui";
import { YouTubePlayer } from "../components/YouTubePlayer";
import { courseVideos, youtubePlaylistUrl, youtubeWatchUrl } from "./videos";

/** Keyed by topic and page in the reader: changing the article stops the old player. */
export function CourseVideos({
  topicId,
  page,
}: {
  topicId: string;
  page: number;
}) {
  const { colors, styles } = useUITheme();
  const collection = courseVideos[topicId];
  const [selected, setSelected] = useState(
    collection?.pageVideoIndices[page] ?? 0,
  );
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");
  if (!collection?.items.length) return null;
  const video = collection.items[selected];
  async function openLink(url: string) {
    try {
      setError("");
      await Linking.openURL(url);
    } catch {
      setError(
        "Не удалось открыть ссылку. Проверь подключение и попробуй ещё раз.",
      );
    }
  }
  return (
    <Card style={{ gap: 16 }}>
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", flexWrap: "wrap" },
        ]}
      >
        <Txt size={22} weight="700">
          Посмотри объяснение
        </Txt>
        <Txt size={12} color={colors.muted}>
          YouTube · {video.duration}
        </Txt>
      </View>
      <Txt size={17} weight="600">
        {video.title}
      </Txt>
      {opened ? (
        <YouTubePlayer key={video.id} id={video.id} title={video.title} />
      ) : (
        <Button icon="play-circle" onPress={() => setOpened(true)}>
          Смотреть здесь
        </Button>
      )}
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          secondary
          small
          icon="external-link"
          onPress={() => void openLink(youtubeWatchUrl(video))}
        >
          Открыть на YouTube
        </Button>
        {opened && (
          <Button secondary small icon="x" onPress={() => setOpened(false)}>
            Закрыть плеер
          </Button>
        )}
      </View>
      {collection.items.length > 1 && (
        <Disclosure
          title={`Ещё видео по теме · ${collection.items.length - 1}`}
          icon="film"
        >
          {collection.items.map((item, i) =>
            i === selected ? null : (
              <Button
                key={item.id}
                secondary
                small
                icon="play"
                onPress={() => {
                  setSelected(i);
                  setOpened(true);
                }}
              >
                {item.title} · {item.duration}
              </Button>
            ),
          )}
        </Disclosure>
      )}
      <Disclosure title="Источник и подборка" icon="info">
        <Txt size={13} color={colors.muted}>
          Видео из предоставленного плейлиста {video.sourceGrade} класса.
          Порядок тем в плейлистах может отличаться от нашего курса.
        </Txt>
        {!!collection.note && (
          <Txt size={13} color={colors.muted}>
            {collection.note}
          </Txt>
        )}
        <Button
          secondary
          small
          icon="external-link"
          onPress={() => void openLink(youtubePlaylistUrl(video.playlistId))}
        >
          Исходный плейлист
        </Button>
        {video.playlistId !== collection.coursePlaylistId && (
          <Button
            secondary
            small
            icon="list"
            onPress={() =>
              void openLink(youtubePlaylistUrl(collection.coursePlaylistId))
            }
          >
            Плейлист этого класса
          </Button>
        )}
      </Disclosure>
      {!!error && (
        <Txt accessibilityRole="alert" color={colors.red}>
          {error}
        </Txt>
      )}
    </Card>
  );
}
