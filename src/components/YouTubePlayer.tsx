import { useUITheme } from "./ui";
import React, { useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { youtubeEmbedUrl } from "../course/videos";
import { Txt, colors } from "./ui";

export function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const { colors, styles } = useUITheme();
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: 10 }}
    >
      <View
        style={{
          height: Math.max(200, (width * 9) / 16),
          overflow: "hidden",
          borderRadius: 16,
          backgroundColor: "#20372B",
        }}
      >
        <WebView
          accessibilityLabel={`Видеоурок: ${title}`}
          source={{
            uri: youtubeEmbedUrl(id),
            headers: { Referer: "https://com.espada.learning/" },
          }}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          javaScriptEnabled
          domStorageEnabled
          onError={() => setError(true)}
          onHttpError={() => setError(true)}
          style={{ flex: 1, backgroundColor: "#20372B" }}
        />
      </View>
      {error && (
        <Txt color={colors.red} accessibilityRole="alert">
          Плеер не загрузился. Попробуй открыть видео по ссылке ниже.
        </Txt>
      )}
    </View>
  );
}
