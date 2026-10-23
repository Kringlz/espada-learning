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
  const view = useRef<WebView>(null);
  const html = useMemo(() => spaceDocument(data, reduced), []);
  const sync = () =>
    view.current?.injectJavaScript(
      `window.postMessage(${JSON.stringify({ source: "espada-host", data, active, reduced }).replace(/</g, "\\u003c")}, '*'); true;`,
    );
  useEffect(sync, [data, active, reduced]);
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
          )
            onAction(message.action);
        } catch {
          /* Ignore malformed bridge messages. */
        }
      }}
    />
  );
}
