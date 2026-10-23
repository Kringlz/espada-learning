import React, { useContext, useEffect, useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { WebView } from "react-native-webview";
import { useVideoAudioFocus } from "../engagement/useVideoAudioFocus";
import { youtubeEmbedUrl } from "../course/videos";
import { emptyWatch, trackWatch } from "../engagement/rewards";
import { VideoProgress } from "../course/videoLesson/model";
import { MotionActiveContext } from "./Motion";
import { Button, Txt, useUITheme } from "./ui";
export type YouTubePlayerProps = {
  id: string;
  title: string;
  onWatched?: () => void;
  progress?: VideoProgress;
  onProgress?: (p: VideoProgress) => void;
};
export function YouTubePlayer({
  id,
  title,
  onWatched,
  progress,
  onProgress,
}: YouTubePlayerProps) {
  useVideoAudioFocus();
  const active = useContext(MotionActiveContext);
  const { colors } = useUITheme();
  const web = useRef<WebView>(null);
  const saved = useRef(progress);
  saved.current = progress;
  const watch = useRef(progress?.watch ?? emptyWatch());
  const rewarded = useRef(progress?.completed ?? false);
  const playbackStartedAt = useRef<number | null>(null);
  const restoredPosition = useRef(progress?.position ?? 0);
  const [retry, setRetry] = useState(0);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function command(code: string) {
    web.current?.injectJavaScript(`if(window.p){${code}} true;`);
  }
  useEffect(() => {
    setError(false);
    playbackStartedAt.current = null;
    restoredPosition.current = saved.current?.position ?? 0;
    watch.current = {
      ...(saved.current?.watch ?? emptyWatch()),
      clock: null,
      position: null,
    };
    rewarded.current = saved.current?.completed ?? false;
    timeout.current = setTimeout(() => setError(true), 14000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") {
        command("p.pauseVideo();");
        watch.current = { ...watch.current, clock: null, position: null };
      }
    });
    return () => {
      clearTimeout(timeout.current);
      sub.remove();
      command("p.pauseVideo();");
    };
  }, [id, retry, active]);
  // Keep the source stable while progress updates every second.
  const html = React.useMemo(() => {
    const source = `${youtubeEmbedUrl(id)}&enablejsapi=1&controls=1&fs=1&start=${Math.floor(saved.current?.position ?? 0)}&origin=https%3A%2F%2Fcom.espada.learning`;
    return `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#050912"><iframe id="player" src="${source}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe><script>function send(x){window.ReactNativeWebView.postMessage(JSON.stringify(x))}function sample(){send({position:p.getCurrentTime(),duration:p.getDuration(),playing:p.getPlayerState()===1})}function onYouTubeIframeAPIReady(){window.p=new YT.Player('player',{events:{onReady:function(){send({ready:true});setInterval(sample,1000)},onStateChange:sample,onError:function(){send({error:true})}}})}</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`;
  }, [id, retry, active]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: 12 }}
    >
      {active && (
        <View
          style={{
            height: Math.max(200, (width * 9) / 16),
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <WebView
            ref={web}
            key={`${id}:${retry}`}
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
                const d = JSON.parse(event.nativeEvent.data);
                if (d.error) {
                  clearTimeout(timeout.current);
                  setError(true);
                  return;
                }
                if (d.ready) {
                  clearTimeout(timeout.current);
                  setError(false);
                  return;
                }
                if (
                  !Number.isFinite(d.position) ||
                  !Number.isFinite(d.duration) ||
                  d.duration <= 0
                )
                  return;
                // Ignore early near-zero reports while YouTube applies the offset.
                if (d.playing === true && playbackStartedAt.current === null)
                  playbackStartedAt.current = Date.now();
                if (
                  restoredPosition.current > 0 &&
                  d.position < 1 &&
                  (playbackStartedAt.current === null ||
                    Date.now() - playbackStartedAt.current < 2000)
                )
                  return;
                const tracked = trackWatch(
                  watch.current,
                  d.position,
                  d.duration,
                  d.playing === true &&
                    active &&
                    AppState.currentState === "active",
                  Date.now(),
                );
                watch.current = tracked.state;
                if (tracked.completed && !rewarded.current) {
                  rewarded.current = true;
                  onWatched?.();
                }
                onProgress?.({
                  position: d.position,
                  duration: d.duration,
                  watch: tracked.state,
                  completed: rewarded.current,
                });
              } catch {
                /* Ignore unrelated frame messages. */
              }
            }}
          />
        </View>
      )}
      {error && (
        <View style={{ gap: 8 }}>
          <Txt size={14} color={colors.gold} accessibilityRole="alert">
            Видео не загрузилось. Проверь подключение или открой YouTube.
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Button secondary small onPress={() => setRetry((n) => n + 1)}>
              Повторить загрузку
            </Button>
            <Button
              secondary
              small
              onPress={() => {
                command("p.pauseVideo();");
                void Linking.openURL(
                  `https://www.youtube.com/watch?v=${id}&t=${Math.floor(saved.current?.position ?? 0)}`,
                ).catch(() => setError(true));
              }}
            >
              Открыть YouTube
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
