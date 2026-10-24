import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { copyText } from "../services/clipboard";
import { Button, Icon, Txt, useUITheme } from "./ui";
import { useSounds } from "../engagement/Sounds";

export function CopyCode({ code }: { code: string }) {
  const { colors, dark } = useUITheme();
  const { play } = useSounds();
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">(
    "idle",
  );
  const request = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    pending.current = false;
    setStatus("idle");
    return () => {
      request.current++;
    };
  }, [code]);
  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 3500);
    return () => clearTimeout(timer);
  }, [status]);
  async function copy() {
    if (pending.current) return;
    pending.current = true;
    const id = ++request.current;
    setStatus("copying");
    try {
      await copyText(code);
      if (id !== request.current) return;
      setStatus("copied");
      play("copy");
    } catch {
      if (id === request.current) setStatus("error");
    } finally {
      if (id === request.current) pending.current = false;
    }
  }
  const green = dark ? "#86DBAA" : "#23794B";
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <Txt selectable size={22} weight="600" style={{ letterSpacing: 2 }}>
          {code}
        </Txt>
        <Button
          small
          secondary
          icon="copy"
          label="Скопировать код"
          disabled={status === "copying"}
          onPress={() => void copy()}
        >
          Скопировать
        </Button>
      </View>
      <View accessibilityLiveRegion="polite" style={{ minHeight: 24 }}>
        {status === "copied" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Icon name="check-circle" size={18} color={green} />
            <Txt size={15} color={green}>
              Код скопирован
            </Txt>
          </View>
        )}
        {status === "error" && (
          <Txt size={14} color={colors.red}>
            Не удалось скопировать. Попробуйте ещё раз или выделите код.
          </Txt>
        )}
      </View>
    </View>
  );
}
