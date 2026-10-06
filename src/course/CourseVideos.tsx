import React, { useContext, useState } from "react";
import { Linking, View, Pressable } from "react-native";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  useUITheme,
} from "../components/ui";
import { YouTubePlayer } from "../components/YouTubePlayer";
import { MotionActiveContext } from "../components/Motion";
import { useRewards } from "../engagement/RewardContext";
import { courseContent } from "./content";
import { videosForPage, youtubePlaylistUrl, youtubeWatchUrl } from "./videos";

/** A player belongs to one article part; no unrelated fallback video. */
export function CourseVideos({
  topicId,
  page,
  embedded = false,
  onOpen,
  excludeVideoIds = [],
}: {
  topicId: string;
  page: number;
  embedded?: boolean;
  onOpen?: () => void;
  excludeVideoIds?: string[];
}) {
  const { colors, styles } = useUITheme();
  const active = useContext(MotionActiveContext);
  const { award, earned } = useRewards();
  const videos = videosForPage(topicId, page).filter(
    (video) => !excludeVideoIds.includes(video.id),
  );
  const [selected, setSelected] = useState(0);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");
  const video = videos[selected];
  if (!video)
    return (
      <Card>
        <Icon name="book-open" size={28} color={colors.green} />
        <Txt weight="600">К этой части видео пока нет</Txt>
        <Txt color={colors.muted}>
          Открой «Урок» — там есть объяснение и примеры.
        </Txt>
      </Card>
    );
  const event = { kind: "video" as const, id: `youtube:${video.id}` };
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
  if (embedded)
    return (
      <View style={{ gap: 12 }}>
        {opened && active ? (
          <YouTubePlayer
            key={video.id}
            id={video.id}
            title={video.title}
            onWatched={() => award([event])}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Смотреть видео: ${video.title}`}
            onPress={() => {
              onOpen?.();
              setOpened(true);
            }}
            style={({ pressed }) => ({
              backgroundColor: colors.light,
              borderRadius: 24,
              minHeight: 160,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Icon name="play" size={28} color={colors.onPrimary} />
            </View>
            <Txt size={16} weight="600">
              {video.duration}
              {earned(event) ? " · ✓" : ""}
            </Txt>
          </Pressable>
        )}
        {opened && (
          <Disclosure title="О видео" icon="info">
            <Txt size={16}>{video.title}</Txt>
            <Txt size={14} color={colors.muted}>
              {video.sourceTitle}
            </Txt>
            {videos.length > 1 &&
              videos.map((item, i) => (
                <Button
                  key={item.id}
                  small
                  secondary
                  selected={selected === i}
                  onPress={() => {
                    setSelected(i);
                    onOpen?.();
                    setOpened(true);
                  }}
                >
                  {item.title}
                </Button>
              ))}
            <Button
              small
              secondary
              onPress={() => void openLink(youtubeWatchUrl(video))}
            >
              Открыть на YouTube
            </Button>
          </Disclosure>
        )}
        {!!error && (
          <Txt accessibilityRole="alert" color={colors.red}>
            {error}
          </Txt>
        )}
      </View>
    );
  return (
    <Card style={{ gap: 16 }}>
      <Txt size={12} color={colors.muted}>
        К части «{courseContent[topicId].pages[page].title}»
      </Txt>
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", alignItems: "flex-start" },
        ]}
      >
        <Txt size={22} weight="700" style={{ flex: 1 }}>
          {video.title}
        </Txt>
        <Txt size={12} color={colors.muted}>
          {video.duration}
        </Txt>
      </View>
      {opened && active ? (
        <YouTubePlayer
          key={video.id}
          id={video.id}
          title={video.title}
          onWatched={() => award([event])}
        />
      ) : (
        <Button icon="play-circle" onPress={() => setOpened(true)}>
          Смотреть видео
        </Button>
      )}
      <Txt size={13} color={colors.green}>
        {earned(event)
          ? "✓ Просмотр засчитан · +10 очков"
          : "+10 очков за просмотр здесь"}
      </Txt>
      {videos.length > 1 && (
        <View style={{ gap: 8 }}>
          <Txt size={13} color={colors.muted}>
            Объяснения к этой части
          </Txt>
          {videos.map((item, i) => (
            <Button
              key={item.id}
              secondary
              small
              selected={i === selected}
              icon="play"
              onPress={() => {
                setSelected(i);
                setOpened(true);
              }}
            >
              {item.title} · {item.duration}
            </Button>
          ))}
        </View>
      )}
      <Disclosure title="Ссылка и источник" icon="external-link">
        <Txt size={13} color={colors.muted}>
          {video.sourceTitle}
        </Txt>
        <Txt size={12} color={colors.muted}>
          В исходном плейлисте — {video.sourceGrade} класс. Здесь видео
          привязано по теме. Просмотр на YouTube не начисляет очки в приложении.
        </Txt>
        <Button
          secondary
          small
          onPress={() => void openLink(youtubeWatchUrl(video))}
        >
          Открыть на YouTube
        </Button>
        <Button
          secondary
          small
          onPress={() => void openLink(youtubePlaylistUrl(video.playlistId))}
        >
          Исходный плейлист
        </Button>
      </Disclosure>
      {!!error && (
        <Txt accessibilityRole="alert" color={colors.red}>
          {error}
        </Txt>
      )}
    </Card>
  );
}
