import React, { useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { useSounds } from "../engagement/Sounds";
import { Icon, Txt, useUITheme } from "./ui";
export function ClarityControls() {
  const { colors, dark, setPreference } = useUITheme();
  const sound = useSounds();
  const [open, setOpen] = useState(false);
  const narrow = useWindowDimensions().width < 360;
  const style = {
    width: narrow ? 44 : 52,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          dark ? "Включить светлую тему" : "Включить тёмную тему"
        }
        onPress={() => setPreference(dark ? "light" : "dark")}
        style={style}
      >
        <Icon name={dark ? "sun" : "moon"} size={25} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Звук и музыка"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={style}
      >
        <Icon
          name={
            (sound.enabled || sound.music) && sound.volume > 0
              ? "volume-2"
              : "volume-x"
          }
          size={25}
        />
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#00000066",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть настройки звука"
            onPress={() => setOpen(false)}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 28,
              padding: 24,
              gap: 26,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.white,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Txt size={25} weight="700" style={{ flex: 1 }}>
                Звук
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Готово"
                onPress={() => setOpen(false)}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="x" />
              </Pressable>
            </View>
            {[
              {
                label: "Звуки",
                icon: "volume-2" as const,
                value: sound.enabled,
                change: sound.toggle,
              },
              {
                label: "Музыка",
                icon: "music" as const,
                value: sound.music,
                change: sound.toggleMusic,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <Icon name={item.icon} color={colors.green} />
                <Txt size={20} style={{ flex: 1 }}>
                  {item.label}
                </Txt>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: item.value }}
                  aria-checked={item.value}
                  onPress={item.change}
                  style={{
                    width: 56,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 16,
                      padding: 4,
                      backgroundColor: item.value ? colors.green : colors.line,
                      alignItems: item.value ? "flex-end" : "flex-start",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: item.value
                          ? colors.onPrimary
                          : colors.white,
                      }}
                    />
                  </View>
                </Pressable>
              </View>
            ))}
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Txt size={17} color={colors.muted}>
                  Громкость
                </Txt>
                <Txt size={17} weight="600">
                  {Math.round(sound.volume * 100)}%
                </Txt>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Тише"
                  disabled={sound.volume <= 0}
                  onPress={() =>
                    sound.setVolume(Math.round((sound.volume - 0.1) * 10) / 10)
                  }
                  style={[style, { width: 48, height: 48 }]}
                >
                  <Icon name="minus" />
                </Pressable>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Громкость"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.round(sound.volume * 100),
                  }}
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 8,
                    backgroundColor: colors.line,
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      borderRadius: 8,
                      width: `${sound.volume * 100}%`,
                      backgroundColor: colors.green,
                    }}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Громче"
                  disabled={sound.volume >= 1}
                  onPress={() =>
                    sound.setVolume(Math.round((sound.volume + 0.1) * 10) / 10)
                  }
                  style={[style, { width: 48, height: 48 }]}
                >
                  <Icon name="plus" />
                </Pressable>
              </View>
            </View>
            {sound.music && sound.musicPaused && (
              <Txt size={14} color={colors.muted}>
                Музыка на паузе, пока открыто видео.
              </Txt>
            )}
            {!!sound.error && (
              <Txt accessibilityRole="alert" size={16} color={colors.red}>
                {sound.error}
              </Txt>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
