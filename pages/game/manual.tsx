import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { NextPage } from "next";
import Head from "next/head";
import {
  TextField,
  Box,
  MenuItem,
  Button,
  Paper,
  Dialog,
  DialogTitle,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import TuneIcon from "@mui/icons-material/Tune";

import {
  apiClient,
  Game,
  JoinMatchRes,
  ApiRes,
  StreamMatchesReq,
  JoinMatchReqBase,
} from "../../src/apiClient";
import { useGameUsers } from "../../src/useGameUsers";
import { useGameStream } from "../../src/useGameStream";

import datas from "../../components/player_datas";
import GamePanel from "../../components/gamePanel";
import MatchTypeTab, { MatchType } from "../../components/matchTypeTab";
import { useStateWithStorage } from "../../src/useStateWithStorage";
import { getGameHref } from "../../src/link";

type NextActionType = [-1 | 0 | 1, -1 | 0 | 1];
const NextActions: Record<
  | "UP"
  | "LEFT"
  | "RIGHT"
  | "DOWN"
  | "UPRIGHT"
  | "UPLEFT"
  | "DOWNRIGHT"
  | "DOWNLEFT"
  | "NONE",
  NextActionType
> = {
  UP: [0, -1],
  LEFT: [-1, 0],
  RIGHT: [1, 0],
  DOWN: [0, 1],
  UPRIGHT: [1, -1],
  UPLEFT: [-1, -1],
  DOWNRIGHT: [1, 1],
  DOWNLEFT: [-1, 1],
  NONE: [0, 0],
};

type AgentData = { index: number; nextAction: NextActionType };

type Gamepads = ReturnType<(typeof navigator)["getGamepads"]>;
type Controller = { label: string; helperText?: string; agentId: number };

const ManualAgent = ({
  playerIndex,
  agentData,
  enable,
}: {
  playerIndex: number;
  agentData: AgentData;
  enable: boolean;
}) => {
  const playerData = datas[playerIndex];
  const na = agentData.nextAction;
  return (
    <Box
      sx={{
        border: "3px solid",
        borderColor: playerData.colors[1],
        borderRadius: 2,
        backgroundColor: enable ? "" : "#eee",
        p: 1,
      }}
    >
      <Box component="h5" sx={{ my: 0 }}>
        Agent {agentData.index + 1}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(25px, 1fr))",
          gap: "1px",
          "&>div": {
            outline: "1px solid #333",
            aspectRatio: "1 / 1",
          },
        }}
      >
        {[-1, 0, 1].map((y) => {
          return [-1, 0, 1].map((x) => {
            const gridColumn = x + 2;
            const gridRow = y + 2;
            if (x === 0 && y === 0) {
              return (
                <Box
                  key={`${x}-${y}`}
                  sx={{
                    gridColumn,
                    gridRow,
                    backgroundSize: "80%",
                    backgroundPosition: "0% 50%",
                    backgroundRepeat: "no-repeat",
                    backgroundImage: `url(${playerData.agentUrl})`,
                    backgroundColor: playerData.colors[1],
                    boxSizing: "content-box",
                  }}
                />
              );
            } else {
              const backgroundColor =
                na[0] === x && na[1] === y ? playerData.colors[0] : "";
              return (
                <Box
                  key={`${x}-${y}`}
                  sx={{
                    gridColumn,
                    gridRow,
                    backgroundColor,
                  }}
                />
              );
            }
          });
        })}
      </Box>
    </Box>
  );
};

function useKeyDirection(useKey: {
  up: string;
  down: string;
  left: string;
  right: string;
}) {
  const [direction, setDirection] = useState<NextActionType>(NextActions.NONE);
  const rawDirection = useRef<NextActionType>(NextActions.NONE);
  const changeTime = useRef<number>();

  const changeDirection = useCallback((dir: NextActionType) => {
    rawDirection.current = dir;

    if (changeTime.current === undefined) {
      changeTime.current = Date.now();
      setTimeout(() => {
        changeTime.current = undefined;

        setDirection((prev) => {
          const curr = rawDirection.current;
          if (curr[0] === prev[0] && curr[1] === prev[1]) return prev;
          else return curr;
        });
      }, 20);
    }
  }, []);

  const onKeyChange = useCallback(
    (e: KeyboardEvent) => {
      const dir: NextActionType = [...rawDirection.current];
      const isKeyDown = e.type === "keydown";
      if (e.key === useKey.up) dir[1] = isKeyDown ? -1 : 0;
      else if (e.key === useKey.down) dir[1] = isKeyDown ? 1 : 0;
      else if (e.key === useKey.left) dir[0] = isKeyDown ? -1 : 0;
      else if (e.key === useKey.right) dir[0] = isKeyDown ? 1 : 0;
      else return;
      e.preventDefault(); // 該当するキーが押されたらキーイベントをキャンセル
      if (e.repeat) return;

      changeDirection(dir);
    },
    [changeDirection, useKey]
  );
  useEffect(() => {
    document.addEventListener("keydown", onKeyChange, false);
    document.addEventListener("keyup", onKeyChange, false);
    return () => {
      document.removeEventListener("keydown", onKeyChange, false);
      document.removeEventListener("keyup", onKeyChange, false);
    };
  }, [onKeyChange]);

  return direction;
}

const useGamepads = () => {
  const [gamepads, setGamepads] = useState<Gamepads>([null, null, null, null]);

  useEffect(() => {
    let requestId: number | undefined;
    const updateGamepads = () => {
      const gps = navigator.getGamepads();
      setGamepads((prev) => {
        const isUpdate = !gps.every((gp, i) => gp === prev[i]);
        return isUpdate ? gps : prev;
      });
      requestId = requestAnimationFrame(updateGamepads);
    };
    updateGamepads();
    return () => {
      if (requestId) {
        cancelAnimationFrame(requestId);
      }
    };
  }, []);

  return gamepads;
};

const localStorageKey = "controllerSettings";

const Page: NextPage = () => {
  const [matchType, setMatchType] = useState<MatchType>();
  const [matchRes, setMatchRes] = useStateWithStorage<JoinMatchRes | undefined>(
    "game/manual:matchRes",
    undefined
  );
  const query = useMemo<StreamMatchesReq | undefined>(() => {
    if (!matchRes) {
      if (matchType?.type === "free") {
        return {
          q: "sort:startAtUnixTime-desc type:normal is:waiting",
          allowNewGame: true,
        };
      }
    } else {
      return { q: `id:${matchRes.gameId}` };
    }
  }, [matchRes, matchType]);
  const selectedGame = useGameStream(query);
  const game = useMemo<Game | undefined>(() => selectedGame[0], [selectedGame]);
  const playerIds = useMemo(() => game?.players.map((p) => p.id) || [], [game]);
  const users = useGameUsers(playerIds);
  const [controllerList, setControllerList] = useState<Controller[]>([
    { label: "WSADキー", agentId: 0 },
    { label: "Arrowキー", agentId: 1 },
    { label: "GamePad 1", agentId: 2 },
    { label: "GamePad 2", agentId: 3 },
    { label: "GamePad 3", agentId: 4 },
    { label: "GamePad 4", agentId: 5 },
  ]);
  const [axisList, setAxisList] = useState<NextActionType[]>([
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
  const readControllerSettings = useCallback(() => {
    const dataStr = localStorage.getItem(localStorageKey);
    setControllerList((prev) => {
      const indexList = dataStr ? JSON.parse(dataStr) : [];
      return prev.map((c, i) => ({ ...c, agentId: indexList[i] ?? i }));
    });
  }, []);
  useEffect(() => {
    readControllerSettings();
  }, [readControllerSettings]);
  const resetControllerSettings = useCallback(() => {
    localStorage.removeItem(localStorageKey);
    readControllerSettings();
  }, [readControllerSettings]);
  useEffect(() => {
    console.log("change controllerList", controllerList);
    const list = controllerList.map(({ agentId }) => agentId);
    localStorage.setItem(localStorageKey, JSON.stringify(list));
  }, [controllerList]);

  const dirWSAD = useKeyDirection({
    up: "w",
    down: "s",
    left: "a",
    right: "d",
  });
  const dirArrow = useKeyDirection({
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
  });

  const gamepads = useGamepads();
  const rawGamepadAxis = useRef<[number, number][]>([
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
  const gamepadChangeTime = useRef<(number | undefined)[]>([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);

  useEffect(() => {
    if (dirWSAD[0] === 0 && dirWSAD[1] === 0) return;
    const index = controllerList[0].agentId;
    if (index < 0) return;
    setAxisList((prev) => {
      if (prev[index] === dirWSAD) return prev;
      const list = [...prev];
      list[index] = dirWSAD;
      return list;
    });
  }, [dirWSAD, controllerList]);

  useEffect(() => {
    if (dirArrow[0] === 0 && dirArrow[1] === 0) return;
    const index = controllerList[1].agentId;
    if (index < 0) return;
    setAxisList((prev) => {
      if (prev[index] === dirArrow) return prev;
      const list = [...prev];
      list[index] = dirArrow;
      return list;
    });
  }, [dirArrow, controllerList]);

  const changeController = useCallback(
    (i: number, dir: NextActionType) => {
      rawGamepadAxis.current[i] = dir;
      const axisListIndex = controllerList[i + 2].agentId;
      if (axisListIndex < 0) return;

      if (gamepadChangeTime.current[i] === undefined) {
        gamepadChangeTime.current[i] = Date.now();
        setTimeout(() => {
          gamepadChangeTime.current[i] = undefined;

          setAxisList((prev) => {
            const list = [...prev];
            const c = list[axisListIndex];
            const axis = rawGamepadAxis.current[i];
            if (
              (axis[0] === c[0] && axis[1] === c[1]) ||
              (axis[0] === 0 && axis[1] === 0)
            ) {
              return prev;
            } else {
              list[axisListIndex] = axis as NextActionType;
              return list;
            }
          });
        }, 50);
      }
    },
    [controllerList]
  );

  useEffect(() => {
    setControllerList((prev) => {
      const list = structuredClone(prev);
      let isUpdate = false;
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        const c = list[i + 2];
        const helperText = gp?.id || "未接続";
        if (c.helperText !== helperText) {
          c.helperText = helperText;
          isUpdate = true;
        }
      }
      if (isUpdate) return list;
      else return prev;
    });
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      const axis =
        (gp?.axes.map((a) => Math.round(a)) as NextActionType) ||
        NextActions.NONE;
      changeController(i, axis);
    }
  }, [gamepads, changeController]);

  useEffect(() => {
    if (!matchRes || !game || game.status !== "gaming") return;
    const field = game.field;
    if (!field) return;

    const agents = game.players[matchRes.index].agents;

    const enableAgents = controllerList
      .filter((c) => c.agentId >= 0 && agents.length > c.agentId)
      .map((c) => c.agentId);

    const actions = enableAgents.map((agentId, i) => {
      const agent = agents[agentId];
      if (agent.x < 0) {
        // エージェントが配置されていない場合は既定の場所に配置
        const playerIndex = matchRes.index;
        let x = playerIndex === 0 ? 1 : field.width - 2;
        let y = Math.floor(
          ((field.height - 1) / (enableAgents.length - 1)) * i
        );

        const hasAgent = (xx: number, yy: number) =>
          game.players.some((p) =>
            p.agents.some((a) => a.x === xx && a.y === yy)
          );

        const canPut = (xx: number, yy: number) => {
          if (xx < 0 || yy < 0 || xx >= field.width || yy >= field.height)
            return false;
          const tile = field.tiles[yy * field.width + xx];
          if (!tile) return false;
          if (tile.type === 1 && tile.player !== null && tile.player !== playerIndex)
            return false;
          if (hasAgent(xx, yy)) return false;
          return true;
        };

        if (!canPut(x, y)) {
          let found = false;
          outer: for (let yy = 0; yy < field.height; yy++) {
            for (let xx = 0; xx < field.width; xx++) {
              if (canPut(xx, yy)) {
                x = xx;
                y = yy;
                found = true;
                break outer;
              }
            }
          }
          if (!found) return { agentId, type: "NONE" } as const;
        }

        const action = { agentId, x, y, type: "PUT" } as const;
        return action;
      } else {
        // エージェントが配置済みの場合は移動
        const axis = axisList[agentId];
        const x = agent.x + axis[0];
        const y = agent.y + axis[1];
        const nextTile = field.tiles[y * field.width + x];
        if (!nextTile) return { agentId, type: "NONE" } as const;
        const type =
          nextTile.player !== matchRes.index && nextTile.type === 1
            ? "REMOVE"
            : "MOVE";
        return { agentId, x, y, type } as const;
      }
    });
    apiClient.setAction(game.id, { actions }, matchRes.pic);
  }, [controllerList, game, matchRes, axisList]);

  useEffect(() => {
    if (!game) return;
    if (!matchRes) return;
    // 配置されているエージェントのAxisを初期化
    const agents = game.players[matchRes.index].agents;
    if (game.status === "gaming") {
      setAxisList((prev) => {
        const axies = new Array(6).fill(0).map((_, i) => {
          // 配置されていたら初期化
          if (agents[i]?.x >= 0) return NextActions.NONE;
          // 配置されていなかったらもう一度PUTを試みる
          else return prev[i];
        });
        return axies;
      });
    }
  }, [game, matchRes]);

  const joinGame = useCallback(async () => {
    const req: JoinMatchReqBase = { guestName: "guest" };
    let matchRes: ApiRes<JoinMatchRes>;
    if (matchType?.type === "gameId") {
      matchRes = await apiClient.joinGameIdMatch(matchType.gameId, req);
    } else if (matchType?.type === "ai") {
      matchRes = await apiClient.joinAiMatch({
        ...req,
        aiName: matchType.aiName,
        boardName: matchType.boardName,
      });
    } else {
      matchRes = await apiClient.joinFreeMatch(req);
    }
    if (matchRes.success) {
      setMatchRes(matchRes.data);
    }
  }, [matchType, setMatchRes]);

  const changeAgentController = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      agentId: number
    ) => {
      setControllerList((prev) => {
        const list = [...prev];

        const oldController = list.find((c) => c.agentId === agentId);
        const newControllerIndex = parseInt(e.target.value);

        if (newControllerIndex >= 0) {
          const newController = list[newControllerIndex];
          if (oldController) {
            oldController.agentId = newController.agentId;
          }
          newController.agentId = agentId;
        } else if (oldController) {
          oldController.agentId = -1;
        }
        return list;
      });
    },
    []
  );

  const nextTiles = useMemo(() => {
    if (!game || !matchRes) return;
    return axisList.map((axis, agentId) => {
      const agents = game.players[matchRes.index].agents;
      if (agents.length <= agentId) return null;
      const agent = agents[agentId];
      const x = agent.x + axis[0];
      const y = agent.y + axis[1];
      return { x, y };
    });
  }, [game, matchRes, axisList]);

  const participateButton = useMemo(() => {
    let disableJoin = false;
    if (matchRes) disableJoin = true;
    // ゲームIDが入力されていない場合は参加ボタンを無効化
    else if (matchType?.type === "gameId" && !matchType.gameId)
      disableJoin = true;

    const disableQuit = matchRes === undefined;

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Button onClick={joinGame} disabled={disableJoin}>
          参加する
        </Button>
        <Button
          color="error"
          disabled={disableQuit}
          onClick={() => {
            setMatchRes(undefined);
          }}
        >
          参加をやめる
        </Button>

        <Button
          startIcon={<SportsEsportsIcon />}
          color="primary"
          disabled={matchRes === undefined}
          href={getGameHref(matchRes?.gameId)}
          target="_blank"
        >
          ゲーム詳細へ
        </Button>
      </Box>
    );
  }, [matchType, joinGame, matchRes, setMatchRes]);

  const [controllerSettingDialogOpened, setControllerSettingDialogOpened] =
    useState<boolean>(false);

  const controllerSetting = useMemo(() => {
    return (
      <Box>
        <Button
          color="primary"
          sx={{ height: "100%" }}
          startIcon={<TuneIcon />}
          onClick={() => {
            setControllerSettingDialogOpened(true);
          }}
        >
          コントローラ設定
        </Button>
        <Dialog
          open={controllerSettingDialogOpened}
          onClose={() => {
            setControllerSettingDialogOpened(false);
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box>コントローラ設定</Box>
            <Button
              onClick={resetControllerSettings}
              startIcon={<RestartAltIcon />}
            >
              初期設定に戻す
            </Button>
          </DialogTitle>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              p: 2,
              gap: 2,
            }}
          >
            {new Array(6).fill(0).map((_, i) => {
              const controllerIndex = controllerList.findIndex(
                (c) => c.agentId === i
              );
              return (
                <TextField
                  key={i}
                  select
                  value={controllerIndex}
                  label={`Agent ${i + 1}`}
                  size="small"
                  onChange={(e) => changeAgentController(e, i)}
                >
                  <MenuItem key={-1} value={-1}>
                    None
                  </MenuItem>
                  {controllerList.map((c, j) => (
                    <MenuItem key={j} value={j}>
                      {c.label}{" "}
                      <Box sx={{ fontSize: "0.8em", display: "inline" }}>
                        {c.helperText && `[${c.helperText}]`}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              );
            })}
          </Box>
        </Dialog>
      </Box>
    );
  }, [
    controllerList,
    changeAgentController,
    resetControllerSettings,
    controllerSettingDialogOpened,
  ]);

  const agentViewer = useMemo(() => {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        {axisList.map((axis, i) => {
          const c = controllerList.find((c) => c.agentId === i);
          return (
            <ManualAgent
              key={i}
              playerIndex={matchRes?.index || 0}
              agentData={{
                index: i,
                nextAction: axis || NextActions.NONE,
              }}
              enable={Boolean(c)}
            />
          );
        })}
      </Box>
    );
  }, [controllerList, matchRes?.index, axisList]);

  const gamePanel = useMemo(() => {
    if (query && game) {
      return <GamePanel game={game} users={users} nextTiles={nextTiles} />;
    } else return;
  }, [game, users, query, nextTiles]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, m: 1 }}>
      <Head>
        <title>手動ゲーム参加 - 囲みマス</title>
      </Head>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr max-content max-content",
          gap: 1,
        }}
      >
        <Paper>
          <MatchTypeTab disabled={Boolean(matchRes)} onChange={setMatchType} />
        </Paper>
        <Paper sx={{ display: "flex", gap: 1, p: 1 }}>
          {controllerSetting}
          {participateButton}
        </Paper>
      </Box>
      {agentViewer}
      {gamePanel}
    </Box>
  );
};

export default Page;
