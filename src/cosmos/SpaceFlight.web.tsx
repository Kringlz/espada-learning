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
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ data, active, reduced, onAction });
  latest.current = { data, active, reduced, onAction };
  const html = useMemo(() => spaceDocument(data, reduced), []);
  const sync = () =>
    frame.current?.contentWindow?.postMessage(
      {
        source: "espada-host",
        data: latest.current.data,
        active: latest.current.active,
        reduced: latest.current.reduced,
      },
      "*",
    );
  useEffect(sync, [data, active, reduced]);
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
      if (validSpaceAction(event.data.action, latest.current.data))
        latest.current.onAction(event.data.action);
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
