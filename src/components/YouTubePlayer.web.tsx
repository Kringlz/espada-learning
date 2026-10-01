import { useUITheme } from "./ui";
import React, { useState } from "react";
import { View } from "react-native";
import { youtubeEmbedUrl } from "../course/videos";
import { Txt, colors } from "./ui";

export function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const { colors, styles } = useUITheme();
  const [error, setError] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <iframe
        src={youtubeEmbedUrl(id)}
        title={`Видеоурок: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
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
          Плеер не загрузился. Попробуй открыть видео по ссылке ниже.
        </Txt>
      )}
    </View>
  );
}
