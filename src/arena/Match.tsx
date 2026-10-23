import { MathCopy as Txt } from "../math/MathCopy";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { Button, Card, Icon, Pill, useUITheme } from "../components/ui";
import { useLearning } from "../services/context";
import { arenaService } from "./service";
import { Room, remainingSeconds } from "./model";
import { Answers, ReviewList } from "./GameCards";

export function Match({
  initial,
  back,
  remember,
}: {
  initial: Room;
  back: () => void;
  remember: (room: Room) => void;
}) {
  const { actor } = useLearning();
  const { colors } = useUITheme();
  const [room, setRoom] = useState(initial);
  const [seconds, setSeconds] = useState(0);
  const offset = useRef(Date.parse(initial.serverNow) - Date.now());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  const latestStamp = useRef(Date.parse(initial.serverNow));
  const accept = useCallback(
    (next: Room) => {
      if (!alive.current || Date.parse(next.serverNow) < latestStamp.current)
        return;
      latestStamp.current = Date.parse(next.serverNow);
      offset.current = Date.parse(next.serverNow) - Date.now();
      setRoom(next);
      remember(next);
    },
    [remember],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (room.phase === "finished" || room.phase === "closed") return;
    let live = true,
      timer: ReturnType<typeof setTimeout>;
    let active = AppState.currentState === "active";
    async function poll() {
      if (!live) return;
      if (active) {
        try {
          const next = await arenaService.read(initial.id);
          if (live) {
            accept(next);
            setError("");
          }
        } catch (e) {
          if (live) setError((e as Error).message);
        }
      }
      if (live) timer = setTimeout(poll, 1000);
    }
    void poll();
    const sub = AppState.addEventListener("change", (state) => {
      active = state === "active";
    });
    return () => {
      live = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [
    initial.id,
    accept,
    room.phase === "finished" || room.phase === "closed",
  ]);
  useEffect(() => {
    if (!["question", "reveal", "countdown"].includes(room.phase)) return;
    const update = () =>
      setSeconds(
        remainingSeconds(
          Date.parse(
            (room.phase === "reveal" ? room.nextAt : room.deadline) ??
              room.serverNow,
          ),
          Date.now() + offset.current,
        ),
      );
    update();
    const timer = setInterval(update, 150);
    return () => clearInterval(timer);
  }, [room.phase, room.nextAt, room.deadline]);
  async function act(action: () => Promise<Room>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      accept(await action());
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const host = room.hostId === actor.id;
  const participant = room.players.some((p) => p.id === actor.id);
  const self = room.players.find((p) => p.id === actor.id);
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Button small secondary onPress={back} icon="arrow-left">
          На арену
        </Button>
        <Pill>Комната {room.code}</Pill>
      </View>
      {!!error && (
        <Card style={{ backgroundColor: colors.error, gap: 8 }}>
          <Txt color={colors.red} accessibilityRole="alert">
            {error}
          </Txt>
          <Txt size={14}>
            Восстанавливаем соединение. При сомнении повтори ответ: он
            засчитается только один раз.
          </Txt>
          <Button
            secondary
            small
            disabled={busy}
            onPress={() => void act(() => arenaService.read(room.id))}
          >
            Обновить
          </Button>
        </Card>
      )}
      {room.phase === "lobby" && (
        <Card
          style={{
            backgroundColor: colors.light,
            gap: 18,
            alignItems: "center",
            paddingVertical: 32,
          }}
        >
          <Txt weight="800" color={colors.green}>
            ПРИГЛАСИ СВОЮ ГРУППУ
          </Txt>
          <Txt size={48} weight="800" selectable style={{ letterSpacing: 6 }}>
            {room.code}
          </Txt>
          <Txt style={{ textAlign: "center" }}>
            Откройте «Арену» на своих телефонах и введите этот код. Нужны
            аккаунты учеников одной группы.
          </Txt>
          <Txt size={14} color={colors.muted}>
            10 вопросов · 15 секунд на ответ · до 500 очков за вопрос
          </Txt>
          {host ? (
            <>
              <Button
                fullWidth
                disabled={busy || room.players.length < 2}
                onPress={() => void act(() => arenaService.start(room.id))}
              >
                Начать игру · {room.players.length} участников
              </Button>
              <Button
                small
                secondary
                disabled={busy}
                onPress={() => void act(() => arenaService.cancel(room.id))}
              >
                Закрыть комнату
              </Button>
            </>
          ) : (
            <Pill>Ожидаем старта от ведущего</Pill>
          )}
        </Card>
      )}
      {room.phase === "countdown" && (
        <Card style={{ padding: 40, alignItems: "center", gap: 12 }}>
          <Txt size={26} weight="800">
            Приготовься!
          </Txt>
          <Txt size={70} weight="800" color={colors.green}>
            {seconds}
          </Txt>
          <Txt>У всех будет один и тот же пример.</Txt>
        </Card>
      )}
      {(room.phase === "question" || room.phase === "reveal") &&
        room.question && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Pill>Вопрос {(room.round ?? 0) + 1} из 10</Pill>
              <Pill>
                {room.phase === "reveal"
                  ? `Следующий через ${seconds} с`
                  : `${seconds} с`}
              </Pill>
            </View>
            <Card
              style={{ gap: 20, alignItems: "center", paddingVertical: 34 }}
            >
              <Txt size={34} weight="800" style={{ textAlign: "center" }}>
                {room.question.prompt}
              </Txt>
              <View
                style={{
                  width: "100%",
                  height: 7,
                  backgroundColor: colors.line,
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 7,
                    width: `${Math.min(100, (seconds / 15) * 100)}%`,
                    backgroundColor: colors.primary,
                  }}
                />
              </View>
            </Card>
            <Answers
              question={room.question}
              selected={room.myAnswer?.choice}
              reveal={room.phase === "reveal"}
              disabled={
                busy ||
                !participant ||
                room.phase !== "question" ||
                !!room.myAnswer ||
                seconds === 0
              }
              choose={(choice) =>
                void act(() =>
                  arenaService.answer(room.id, room.round!, choice),
                )
              }
            />
            {!!room.myAnswer && room.phase === "question" && (
              <Txt color={colors.green} weight="700">
                Ответ принят. Результат появится после таймера.
              </Txt>
            )}
            {!participant && (
              <Txt color={colors.muted}>Ты наблюдаешь за игрой группы.</Txt>
            )}
            {room.phase === "reveal" && (
              <Card style={{ gap: 8 }}>
                <Txt weight="700">
                  {room.myAnswer
                    ? room.myAnswer.correct
                      ? `Верно! +${room.myAnswer.points} очков`
                      : "В этот раз не получилось"
                    : "Разбор примера"}
                </Txt>
                <Txt>{room.question.explanation}</Txt>
              </Card>
            )}
          </>
        )}
      {room.phase === "finished" && (
        <Card style={{ backgroundColor: colors.light, gap: 14 }}>
          <Icon name="award" size={42} color={colors.green} />
          <Txt size={32} weight="800">
            Игра завершена!
          </Txt>
          <Txt size={24} weight="800">
            {self
              ? `${self.points} очков в копилку группы`
              : "Результаты группы готовы"}
          </Txt>
          <Txt color={colors.muted}>
            Очки сохранены на сервере и доступны с любого устройства.
          </Txt>
          <Button onPress={back}>К рейтингу и новой игре</Button>
        </Card>
      )}
      {room.phase === "closed" && (
        <Card>
          <Txt>Комната закрыта или срок ожидания истёк. Создай новую игру.</Txt>
        </Card>
      )}
      {room.phase !== "closed" && (
        <Card style={{ gap: 14 }}>
          <Txt size={22} weight="800">
            {room.phase === "lobby" ? "Кто уже здесь" : "Счёт матча"}
          </Txt>
          {!room.players.length && (
            <Txt color={colors.muted}>Пока никто не присоединился.</Txt>
          )}
          {room.players.map((p, i) => (
            <View
              key={p.id}
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                paddingVertical: 9,
                borderBottomWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Txt weight="800" color={colors.green}>
                {room.phase === "lobby"
                  ? "✓"
                  : 1 + room.players.filter((x) => x.points > p.points).length}
              </Txt>
              <Txt
                style={{ flex: 1 }}
                weight={p.id === actor.id ? "800" : "500"}
              >
                {p.name}
                {p.id === actor.id ? " · ты" : ""}
              </Txt>
              <Txt weight="800">{p.points}</Txt>
            </View>
          ))}
        </Card>
      )}
      {room.phase === "finished" && participant && room.review && (
        <ReviewList rows={room.review} />
      )}
    </View>
  );
}
