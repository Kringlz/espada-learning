import { Starfield, StarGlyph } from "../components/Starfield";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChoiceTabs } from "../components/ChoiceTabs";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  useUITheme,
} from "../components/ui";
import { useLearning } from "../services/context";
import { useRewards } from "../engagement/RewardContext";
import { arenaService } from "./service";
import { ArenaTopic, Leader, Room, arenaTopics } from "./model";
import { Practice } from "./Practice";
import { Match } from "./Match";

export function Arena() {
  const { actor, state, mode } = useLearning();
  const { colors } = useUITheme();
  const rewards = useRewards();
  const wide = useWindowDimensions().width >= 850;
  const [view, setView] = useState<"play" | "practice" | "leaders">(
    mode === "demo" ? "practice" : "play",
  );
  const [topic, setTopic] = useState<ArenaTopic>("arithmetic");
  const groups = state.classes.filter(
    (g) =>
      actor.role === "admin" ||
      g.studentIds.includes(actor.id) ||
      g.teacherIds.includes(actor.id),
  );
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [resume, setResume] = useState<string | null>(null);
  const [practice, setPractice] = useState<{
    topic: ArenaTopic;
    daily: boolean;
  } | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [boardReady, setBoardReady] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const live = useRef(true);
  const rememberedId = useRef<string | null | undefined>(undefined);
  const roomKey = `espada.arena.room:${actor.id}`;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(roomKey)
      .then((id) => {
        if (active) setResume(id);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [roomKey]);
  const remember = useCallback(
    (value: Room) => {
      const id =
        value.phase === "finished" || value.phase === "closed"
          ? null
          : value.id;
      setResume(id);
      if (rememberedId.current === id) return;
      rememberedId.current = id;
      // Only write when the identifier changes, never on every snapshot.
      if (id) void AsyncStorage.setItem(roomKey, id).catch(() => {});
      else void AsyncStorage.removeItem(roomKey).catch(() => {});
    },
    [roomKey],
  );
  useEffect(() => {
    if (groups.length && !groups.some((g) => g.id === group))
      setGroup(groups[0].id);
  }, [groups, group]);
  useEffect(() => {
    if (mode !== "supabase" || !group || room || practice || view !== "leaders")
      return;
    let active = true;
    setLoading(true);
    setBoardReady(false);
    setBoardError("");
    setLeaders([]);
    void arenaService
      .leaders(group)
      .then((data) => {
        if (active) {
          setLeaders(data);
          setBoardReady(true);
        }
      })
      .catch((e) => {
        if (active) setBoardError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, group, reload, room, practice, view]);
  async function open(action: () => Promise<Room>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await action();
      if (live.current) {
        setRoom(value);
        remember(value);
      }
    } catch (e) {
      if (live.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (live.current) setBusy(false);
    }
  }
  if (practice)
    return <Practice {...practice} back={() => setPractice(null)} />;
  if (room)
    return (
      <Match
        initial={room}
        remember={remember}
        back={() => {
          setRoom(null);
          setView("leaders");
          setReload((n) => n + 1);
        }}
      />
    );
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          backgroundColor: "#0D1424",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 26,
          padding: 22,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Starfield height={220} />
        <View style={{ flex: 1, gap: 10 }}>
          <Txt size={wide ? 36 : 27} weight="500" color="#FFFFFF">
            Арена
          </Txt>
          <Txt size={14} color="#AABAD8">
            10 вопросов · 15 секунд
          </Txt>
        </View>
        <View style={{ width: "40%", maxWidth: 240 }}>
          <StarGlyph id="arena" size={150} color="#E6C894" selected />
        </View>
      </View>
      <ChoiceTabs
        label="Режим арены"
        value={view}
        onChange={setView}
        options={[
          ["play", "Вместе"],
          ["practice", "Практика"],
          ["leaders", "Рейтинг"],
        ]}
      />
      {!!resume && mode === "supabase" && (
        <Button
          fullWidth
          secondary
          icon="rotate-ccw"
          disabled={busy}
          onPress={() => void open(() => arenaService.read(resume))}
        >
          Вернуться в игру
        </Button>
      )}
      {view !== "leaders" && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {arenaTopics.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={item.title}
              accessibilityState={{ checked: topic === item.id }}
              aria-checked={topic === item.id}
              onPress={() => setTopic(item.id)}
              style={{
                flex: 1,
                minWidth: 0,
                paddingVertical: 10,
                paddingHorizontal: 5,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: topic === item.id ? colors.primary : colors.line,
                backgroundColor:
                  topic === item.id ? colors.light : colors.white,
                gap: 8,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <StarGlyph
                  id={item.id}
                  size={wide ? 100 : 65}
                  color={colors.green}
                  selected={topic === item.id}
                />
              </View>
              <Txt size={12} weight="700" style={{ textAlign: "center" }}>
                {item.id === "arithmetic" ? "Счёт" : item.title}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
      {view === "practice" && (
        <>
          <Button
            fullWidth
            icon="play"
            onPress={() => setPractice({ topic, daily: false })}
          >
            Начать тренировку
          </Button>
          <Card style={{ gap: 12, backgroundColor: colors.light }}>
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <Icon name="sun" size={30} color={colors.green} />
              <View style={{ flex: 1 }}>
                <Txt size={21} weight="800">
                  Разминка дня
                </Txt>
                <Txt size={14} color={colors.muted}>
                  5 примеров · до +100 учебных очков
                </Txt>
              </View>
            </View>
            <Button
              fullWidth
              secondary
              disabled={!rewards.ready || actor.role !== "student"}
              onPress={() => setPractice({ topic: "arithmetic", daily: true })}
            >
              Размяться
            </Button>
          </Card>
        </>
      )}
      {view === "play" && (
        <Card style={{ gap: 16 }}>
          {mode === "demo" && (
            <Txt size={15} color={colors.muted}>
              Совместная игра доступна в учебном аккаунте.
            </Txt>
          )}
          {!groups.length && (
            <Txt color={colors.muted}>
              Попроси преподавателя добавить тебя в группу.
            </Txt>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {groups.map((g) => (
              <Button
                key={g.id}
                small
                secondary
                selected={group === g.id}
                onPress={() => setGroup(g.id)}
              >
                {g.name}
              </Button>
            ))}
          </View>
          <Button
            fullWidth
            icon="plus"
            disabled={busy || mode !== "supabase" || !group}
            onPress={() => void open(() => arenaService.create(group, topic))}
          >
            Создать игру
          </Button>
          {actor.role === "student" && (
            <>
              <TextInput
                value={code}
                onChangeText={(v) =>
                  setCode(
                    v
                      .toUpperCase()
                      .replace(/[^A-F0-9]/g, "")
                      .slice(0, 6),
                  )
                }
                placeholder="Код комнаты"
                placeholderTextColor={colors.muted}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Код игровой комнаты"
                style={{
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 14,
                  padding: 15,
                  color: colors.ink,
                  fontSize: 24,
                  letterSpacing: 5,
                }}
              />
              <Button
                fullWidth
                secondary
                icon="log-in"
                disabled={busy || mode !== "supabase" || code.length !== 6}
                onPress={() => void open(() => arenaService.join(code))}
              >
                Войти по коду
              </Button>
            </>
          )}
          {!!error && (
            <Txt color={colors.red} size={14} accessibilityRole="alert">
              {error}
            </Txt>
          )}
        </Card>
      )}
      {view === "leaders" && (
        <Card style={{ gap: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Txt size={24} weight="800">
              Лидеры группы
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Обновить рейтинг"
              disabled={loading || !group || mode !== "supabase"}
              onPress={() => setReload((n) => n + 1)}
              style={{ padding: 12 }}
            >
              <Icon name="refresh-cw" color={colors.green} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {groups.map((g) => (
              <Button
                key={g.id}
                small
                secondary
                selected={group === g.id}
                onPress={() => setGroup(g.id)}
              >
                {g.name}
              </Button>
            ))}
          </View>
          {mode === "demo" ? (
            <Txt color={colors.muted}>Рейтинг появится в учебном аккаунте.</Txt>
          ) : loading ? (
            <Txt>Загружаем…</Txt>
          ) : boardError ? (
            <Txt color={colors.red} accessibilityRole="alert">
              {boardError}
            </Txt>
          ) : boardReady && !leaders.length ? (
            <Txt color={colors.muted}>В группе пока нет учеников.</Txt>
          ) : null}
          {leaders.map((p) => (
            <View
              key={p.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 14,
                padding: 14,
                backgroundColor:
                  p.id === actor.id ? colors.light : colors.subtle,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor:
                    p.rank === 1 && p.points > 0 ? "#F7CC51" : colors.white,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt
                  weight="800"
                  color={p.rank === 1 && p.points > 0 ? "#443000" : colors.ink}
                >
                  {p.rank}
                </Txt>
              </View>
              <Txt style={{ flex: 1 }} weight="700">
                {p.name}
                {p.id === actor.id ? " · ты" : ""}
              </Txt>
              <Txt size={22} weight="800" color={colors.green}>
                {p.points}
              </Txt>
            </View>
          ))}
        </Card>
      )}
      <Disclosure title="Правила игры" icon="help-circle">
        <Txt size={15}>
          Один ответ на вопрос. Верный ответ — 100 очков и до 400 за скорость.
          Рейтинг группы обновляется после матча. Учебные очки и тренировочный
          счёт считаются отдельно.
        </Txt>
      </Disclosure>
    </View>
  );
}
