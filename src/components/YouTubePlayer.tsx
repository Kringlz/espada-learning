import React, { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { WebView } from "react-native-webview";
import { youtubeEmbedUrl } from "../course/videos";
import { emptyWatch, trackWatch } from "../engagement/rewards";
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
  const { colors } = useUITheme();
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  const watch = useRef(emptyWatch());
  const rewarded = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setError(false);
    watch.current = emptyWatch();
    rewarded.current = false;
    timeout.current = setTimeout(() => setError(true), 12000);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [id]);
  const source = `${youtubeEmbedUrl(id)}&enablejsapi=1&origin=https%3A%2F%2Fcom.espada.learning`;
  const html = `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#20372B"><iframe id="player" src="${source}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe><script src="https://www.youtube.com/iframe_api"></script><script>function onYouTubeIframeAPIReady(){var p=new YT.Player('player',{events:{onReady:function(){setInterval(function(){window.ReactNativeWebView.postMessage(JSON.stringify({position:p.getCurrentTime(),duration:p.getDuration(),playing:p.getPlayerState()===1}));},1000)},onError:function(){window.ReactNativeWebView.postMessage(JSON.stringify({error:true}));}}});}</script></body></html>`;
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
        }}
      >
        <WebView
          key={id}
          accessibilityLabel={`Видеоурок: ${title}`}
          source={{ html, baseUrl: "https://com.espada.learning/" }}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          javaScriptEnabled
          domStorageEnabled
          onError={() => setError(true)}
          onHttpError={() => setError(true)}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (timeout.current) clearTimeout(timeout.current);
              if (data.error) {
                setError(true);
                return;
              }
              setError(false);
              const result = trackWatch(
                watch.current,
                data.position,
                data.duration,
                data.playing === true && AppState.currentState === "active",
                Date.now(),
              );
              watch.current = result.state;
              if (result.completed && !rewarded.current) {
                rewarded.current = true;
                onWatched?.();
              }
            } catch {
              /* Ignore unrelated messages from embedded content. */
            }
          }}
        />
      </View>
      {error && (
        <Txt color={colors.red} accessibilityRole="alert">
          Плеер не загрузился. Открой видео через «Ссылка и источник».
        </Txt>
      )}
    </View>
  );
}
