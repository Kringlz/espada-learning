import { useSounds } from "../engagement/Sounds";
import { useTheme } from "../theme/Theme";
import { Asset } from "expo-asset";
import React, { useEffect, useMemo, useRef } from "react";
import { WebView } from "react-native-webview";
import { spaceDocument } from "./document";
import { SpaceAction, SpaceData, validSpaceAction } from "./model";
export type SpaceFlightProps = {
  data: SpaceData;
  active: boolean;
  reduced: boolean;
  onAction: (action: SpaceAction) => void;
};
export function SpaceFlight({
  data,
  active,
  reduced,
  onAction,
}: SpaceFlightProps) {
  const sounds = useSounds();
  const { dark, setPreference } = useTheme();
  const brandUri = Asset.fromModule(
    dark
      ? require("../../assets/brand/knight-dark.jpg")
      : require("../../assets/brand/knight-light.jpg"),
  ).uri;
  const view = useRef<WebView>(null);
  const html = useMemo(
    () => spaceDocument(data, reduced, brandUri, dark, sounds.enabled),
    [],
  );
  const sync = () =>
    view.current?.injectJavaScript(
      `window.postMessage(${JSON.stringify({ source: "espada-host", data, active, reduced, dark, brandUri, soundEnabled: sounds.enabled }).replace(/</g, "\\u003c")}, '*'); true;`,
    );
  useEffect(sync, [data, active, reduced, dark, brandUri, sounds.enabled]);
  return (
    <WebView
      ref={view}
      source={{ html }}
      originWhitelist={["about:blank"]}
      onShouldStartLoadWithRequest={(request) =>
        request.url === "about:blank" || request.url.startsWith("about:srcdoc")
      }
      javaScriptEnabled
      scrollEnabled={false}
      style={{ flex: 1, backgroundColor: "#030609" }}
      onLoad={sync}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (
            message.source === "espada-space" &&
            validSpaceAction(message.action, data)
          ) {
            if (message.action.type === "feedback") {
              if (message.action.id === "toggle") sounds.toggle();
              else sounds.play(message.action.id === "tap" ? "open" : message.action.id);
            } else if (message.action.type === "theme")
              setPreference(message.action.id);
            else onAction(message.action);
          }
        } catch {
          /* Ignore malformed bridge messages. */
        }
      }}
    />
  );
}
