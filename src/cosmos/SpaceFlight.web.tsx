import { useSounds } from "../engagement/Sounds";
import { useTheme } from "../theme/Theme";
import { Asset } from "expo-asset";
import React, { useEffect, useMemo, useRef } from "react";
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
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({
    data,
    active,
    reduced,
    onAction,
    dark,
    brandUri,
    setPreference,
    sounds,
  });
  latest.current = {
    data,
    active,
    reduced,
    onAction,
    dark,
    brandUri,
    setPreference,
    sounds,
  };
  const html = useMemo(
    () => spaceDocument(data, reduced, brandUri, dark, sounds.enabled),
    [],
  );
  const sync = () =>
    frame.current?.contentWindow?.postMessage(
      {
        source: "espada-host",
        data: latest.current.data,
        active: latest.current.active,
        reduced: latest.current.reduced,
        dark: latest.current.dark,
        brandUri: latest.current.brandUri,
        soundEnabled: latest.current.sounds.enabled,
      },
      "*",
    );
  useEffect(sync, [data, active, reduced, dark, brandUri, sounds.enabled]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.source !== "espada-space"
      )
        return;
      if (event.data.type === "ready") {
        sync();
        return;
      }
      if (validSpaceAction(event.data.action, latest.current.data)) {
        if (event.data.action.type === "feedback") {
          if (event.data.action.id === "toggle") latest.current.sounds.toggle();
          else latest.current.sounds.play("open");
        } else if (event.data.action.type === "theme")
          latest.current.setPreference(event.data.action.id);
        else latest.current.onAction(event.data.action);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <iframe
      ref={frame}
      title="Вселенная Espada — свободный полёт"
      srcDoc={html}
      sandbox="allow-scripts"
      onLoad={sync}
      style={{
        border: 0,
        width: "100%",
        height: "100%",
        display: "block",
        background: "#030609",
      }}
    />
  );
}
