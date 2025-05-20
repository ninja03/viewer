import { useEffect, useMemo, useState } from "react";
import { Box, Skeleton, Button, Paper } from "@mui/material";

import dynamic from "next/dynamic";

const GameBoard = dynamic(() => import("./gameBoard"));
const PointsGraph = dynamic(() => import("./pointsGraph"), { ssr: false });
import datas from "./player_datas";

import { Game } from "../src/apiClient";
import { useGameUsers } from "../src/useGameUsers";
import Link, { getUserHref, getVRGameHref } from "../src/link";
import Turn from "./Turn";

/**
 * 次のターンまでの時間をカウントダウンするコンポーネント
 * requestAnimationFrameを使って負荷低減
 */
function Countdown({ targetUnixTime }: { targetUnixTime: number }) {
  const [diff, setDiff] = useState("0.0");
  const [seconds, milliseconds] = useMemo(() => {
    const [seconds, milliseconds] = diff.split(".");
    return [seconds, milliseconds];
  }, [diff]);

  useEffect(() => {
    let ref: number;
    const countDown = () => {
      const d = (targetUnixTime - Date.now()) / 1000;
      if (d < 0) {
        setDiff("0.0");
        return;
      }
      const str = d.toFixed(1);
      setDiff(str);

      ref = requestAnimationFrame(countDown);
    };
    ref = requestAnimationFrame(countDown);

    return () => cancelAnimationFrame(ref);
  }, [targetUnixTime]);

  return (
    <>
      <span>{seconds}</span>.
      <span style={{ fontSize: "0.7em" }}>{milliseconds}</span>
      <span style={{ fontSize: "0.5em" }}>秒</span>
    </>
  );
}

export default function GamePanel({
  game,
  users,
  ...other
}: {
  game: Game;
  users: ReturnType<typeof useGameUsers>;
} & Pick<React.ComponentProps<typeof GameBoard>, "nextTiles">) {
  const nextTurnTime = useMemo(() => {
    if (game.startedAtUnixTime) {
      const nextTurnAtUnixTime =
        game.startedAtUnixTime +
        (game.operationSec + game.transitionSec) * game.turn;
      return nextTurnAtUnixTime * 1000;
    }
    return;
  }, [
    game.operationSec,
    game.startedAtUnixTime,
    game.transitionSec,
    game.turn,
  ]);

  const status = useMemo(() => {
    if (game.status === "ended") return { label: "終了", color: "red" };
    else if (game.status === "gaming")
      return { label: "ゲーム中", color: "green" };
    else return { label: "待機中", color: "yellow" };
  }, [game.status]);

  return (
    <Box
      sx={{
        display: "grid",
        maxHeight: {
          sm: "calc(100vh - 64px)",
          xs: undefined,
        },
        gridTemplateColumns: {
          sm: "minmax(auto,2fr) 1fr 1fr", // PC用
          xs: "1fr 1fr", // Mobile用
        },
        gridTemplateRows: {
          sm: "2em max-content 1fr minmax(100px,1.4fr)",
          xs: "2em max-content minmax(max-content,2fr) minmax(max-content,1fr) max-content",
        },
        gridTemplateAreas: {
          sm: [
            `"header header header"`,
            `"board timer turn"`,
            `"board lank lank"`,
            `"board graph graph"`,
          ].join(""),
          xs: [
            `"header header"`,
            `"timer turn"`,
            `"board board"`,
            `"graph graph"`,
            `"lank lank"`,
          ].join(""),
        },
        gap: 1,
        width: "100%",
        height: "100%",
      }}
    >
      <Box
        sx={{
          gridArea: "header",
          gridColumn: "1 / -1",
          gridRow: "1",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {status && (
          <Box
            sx={{
              backgroundColor: status.color,
              py: 0.2,
              px: 1,
              borderRadius: "1em",
              boxShadow: "0px 0px 3px gray",
              width: "fit-content",
              whiteSpace: "nowrap",
            }}
          >
            {status.label}
          </Box>
        )}

        <Box
          sx={{
            flexGrow: "1",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {game.name ?? "UnTitle"}
        </Box>
        <Box
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          ID : {game.id}
        </Box>
        <Box>
          <Button size="small" href={getVRGameHref(game.id)}>
            VR
          </Button>
        </Box>
      </Box>
      <Paper
        elevation={2}
        sx={{
          gridArea: "board",
          overflow: "hidden",
          height: "100%",
          width: "100%",
          aspectRatio: game.field
            ? `${game.field.width} / ${game.field.height}`
            : "1",
          p: 1,
        }}
      >
        {game.field ? (
          <GameBoard game={game} users={users} {...other} />
        ) : (
          <Skeleton variant="rectangular" width="inherit" height="inherit" />
        )}
      </Paper>
      <Paper elevation={2} sx={{ gridArea: "graph", p: 1 }}>
        {game.field ? (
          <PointsGraph game={game} users={users} />
        ) : (
          <Skeleton variant="rectangular" width="100%" height="100%" />
        )}
      </Paper>
      <Paper
        sx={{
          gridArea: "lank",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          p: 1,
        }}
      >
        <Box>
          {game ? (
            game.players
              .map((player, i) => {
                const totalPoint =
                  player.point.areaPoint + player.point.wallPoint;
                return { ...player, totalPoint, index: i };
              })
              ?.sort((a, b) => {
                if (a.totalPoint !== b.totalPoint)
                  return b.totalPoint - a.totalPoint;
                else if (a.point.wallPoint !== b.point.wallPoint)
                  return b.point.wallPoint - a.point.wallPoint;
                else return b.point.areaPoint - a.point.areaPoint;
              })
              .map((player, i) => {
                return (
                  <Box
                    key={i}
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns:
                        "max-content max-content 1fr max-content",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    <Box
                      sx={{
                        gridColumn: "1",
                      }}
                    >
                      <Box component="span" sx={{ fontSize: "1.5em" }}>
                        {i + 1}
                      </Box>
                      <Box component="span">位</Box>
                    </Box>
                    <Box
                      sx={{
                        width: "10px",
                        backgroundColor: datas[player.index].colors[1],
                      }}
                    />
                    <Box
                      sx={{
                        my: "auto",
                        textAlign: "left",
                        width: "90%",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflowX: "hidden",
                        fontSize: "0.8em",
                      }}
                    >
                      {(() => {
                        const user = users.get(player.id);
                        if (user) {
                          return (
                            <Link
                              href={getUserHref(user.name)}
                              color="inherit"
                              underline="none"
                            >
                              {user.screenName}
                            </Link>
                          );
                        } else return player.id;
                      })()}
                    </Box>
                    <Box
                      sx={{
                        my: "auto",
                        textAlign: "right",
                        fontSize: "1.3em",
                      }}
                    >
                      {player.totalPoint}
                    </Box>
                  </Box>
                );
              })
          ) : (
            <Skeleton variant="rectangular" width="100%" height="5em" />
          )}
        </Box>
      </Paper>
      <Paper
        sx={{
          gridArea: "turn",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Turn game={game} />
      </Paper>
      <Paper
        sx={{
          gridArea: "timer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ fontSize: "0.8em" }}>次のターンまで</Box>
        <Box sx={{ fontSize: "3em" }}>
          {nextTurnTime ? <Countdown targetUnixTime={nextTurnTime} /> : "-"}
        </Box>
      </Paper>
    </Box>
  );
}
