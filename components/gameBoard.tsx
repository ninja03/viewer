import { useMemo } from "react";
import Image from "next/image";
import { keyframes, styled } from "@mui/material/styles";
import { useResizeDetector } from "react-resize-detector";

import { type Game } from "../src/apiClient";
import { useGameUsers } from "../src/useGameUsers";

import datas from "./player_datas";

type Props = {
  game: Pick<Game, "nAgent" | "field" | "players" | "log">;
  users: ReturnType<typeof useGameUsers>;
  nextTiles?: ({ x: number; y: number } | null)[];
};

const cellSize = 50;

// conflictのアニメーション
const flash = keyframes({
  "0%,100%": {},
  "50%": { backgroundColor: "#00ff00" },
});

const StyledFieldContainer = styled("div")({
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
});

const StyledField = styled("div")({
  userSelect: "none",
  display: "grid",
  position: "static",
  gridAutoColumns: "50px",
  gridAutoRows: "50px",
  gap: "1px",
  lineHeight: "1",
  fontSize: `15px`,
});

const StyledEdgeCell = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontWeight: "bold",
});

const StyledCell = styled("div")({
  position: "relative",
  aspectRatio: "1",
  outline: "1px solid #555555",
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "end",
  justifyContent: "end",
  padding: "4px",
  "& .is-abs-text": {
    textDecoration: "line-through",
    color: "red",
    fontSize: "80%",
  },
});
const StyledAgent = styled("div")({
  position: "absolute",
  width: cellSize,
  height: cellSize,
  zIndex: 1,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  transitionProperty: "top, left",
  transitionDuration: "0.4s",
});

const StyledAgentIdBadge = styled("div")({
  position: "absolute",
  fontSize: "12px",
  top: "3px",
  left: "3px",
  width: "1em",
  height: "1em",
  borderRadius: "50%",
  backgroundColor: "yellow",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  p: "0.5em",
});

const StyledAgentDetailContainer = styled("div")({
  position: "absolute",
  width: cellSize,
  height: cellSize,
  zIndex: 3,

  "&:hover > *": {
    display: "block",
  },
});

const StyledAgentDetail = styled("div")({
  // agentの詳細を表示するcss
  display: "none",
  position: "absolute",
  backgroundColor: "rgba(0, 0, 0, .7)",
  color: "white",
  top: "50%",
  left: "50%",
  textAlign: "center",
  borderRadius: "10px",
  padding: "4px",
  filter: "drop-shadow(0 0 5px rgba(0, 0, 0, .7))",
  width: "max-content",
  lineHeight: "1.2",
});

const StyledAgentDetailHistoryList = styled("div")({
  width: "13em",
  height: "10em",
  overflowY: "scroll",
});

const StyledNextTileContainer = styled("div")({
  width: cellSize,
  height: cellSize,
  zIndex: 2,
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const StyledNextTile = styled("div")({
  position: "relative",
  borderRadius: "50%",
  border: "1px solid",
  backgroundColor: "yellow",
  backgroundClip: "content-box",
  opacity: 0.8,
  width: "50%",
  height: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

function Cell({
  point,
  i,
  nAgent,
  x,
  y,
  bgColor,
  nConflict,
  isAbs,
}: {
  i: number;
  x: number;
  y: number;
  point: number;
  nAgent: number;
  bgColor: string;
  nConflict: number;
  isAbs: boolean;
}) {
  const animation = useMemo(() => {
    return nConflict > 0
      ? `${flash} ${1 - (0.6 / nAgent) * nConflict}s linear infinite`
      : "";
  }, [nConflict, nAgent]);

  return (
    <StyledCell
      {...{
        // field-editorに必要
        "data-cell": `${i}-${x}-${y}`,
      }}
      style={{
        gridColumn: x + 2,
        gridRow: y + 2,
        backgroundColor: bgColor,
        animation,
      }}
    >
      <div className={isAbs ? "is-abs-text" : ""}>{point}</div>
      {isAbs && <span>{Math.abs(point)}</span>}
    </StyledCell>
  );
}

export default function GameBoard({
  game: { field, players, log, nAgent },
  users,
  nextTiles,
}: Props) {
  const { width, height, ref } = useResizeDetector();

  const scale = useMemo(() => {
    if (!width || !height || !field) return 1;
    const idealWidth = (field.width + 2) * 50 + (field.width + 1) * 1;
    const idealHeight = (field.height + 2) * 50 + (field.height + 1) * 1;
    const scaleX = width / idealWidth;
    const scaleY = height / idealHeight;
    return Math.min(scaleX, scaleY).toFixed(3);
  }, [width, height, field]);

  const edgeCells = useMemo(() => {
    if (!field?.height) return;
    return (
      <>
        {[1, field.height + 2].map((y) => {
          return new Array(field.width).fill(0).map((_, i) => {
            const x = i;
            return (
              <StyledEdgeCell
                key={`index-${x}-${y}`}
                style={{
                  gridColumn: x + 2,
                  gridRow: y,
                }}
              >
                {x}
              </StyledEdgeCell>
            );
          });
        })}
        {[1, field.width + 2].map((x) => {
          return new Array(field.width).fill(0).map((_, i) => {
            const y = i;
            return (
              <StyledEdgeCell
                key={`index-${x}-${y}`}
                style={{
                  gridColumn: x,
                  gridRow: y + 2,
                }}
              >
                {y}
              </StyledEdgeCell>
            );
          });
        })}
      </>
    );
  }, [field?.height, field?.width]);

  const cells = useMemo(() => {
    if (!field) return <></>;

    const lastErrActLog =
      log?.slice(-1)[0]?.players.flatMap((e) => {
        if (e.actions)
          return [...e.actions.filter((a) => a.res > 0 && a.res < 3)];
        else return [];
      }) ?? [];

    return field.points.map((point, i) => {
      const tile = field.tiles[i];
      const y = Math.floor(i / field.width);
      const x = i % field.width;
      const isAbs = point < 0 && tile.player !== null && tile.type === 0;

      const bgColor = () => {
        if (tile.player !== null) {
          return datas[tile.player].colors[tile.type];
        } else if (point < 0) {
          const l = 100 - (Math.abs(point) * 50) / 16;
          return `hsl(0,0%,${l}%)`;
        } else if (point > 0) {
          const l = 100 - (Math.abs(point) * 50) / 16;
          return `hsl(60,100%,${l}%)`;
        } else {
          return "";
        }
      };
      const nConflict = lastErrActLog.filter(
        (a) => a.x === x && a.y === y
      ).length;

      return (
        <Cell
          key={i}
          point={point}
          nAgent={nAgent}
          x={x}
          y={y}
          bgColor={bgColor()}
          nConflict={nConflict}
          i={i}
          isAbs={isAbs}
        />
      );
    });
  }, [field, nAgent, log]);

  const main = useMemo(() => {
    return (
      <>
        {edgeCells}
        {cells}
        {players.map((p, pIdx) => {
          return p.agents.flatMap((a, aIdx) => {
            if (a.x < 0) return [];

            const getAgentTransform = () => {
              if (!field) return;
              const w = field.width;
              const h = field.height;
              const transX = a.x < w / 2 ? "0%" : "-100%";
              const transY = a.y < h / 2 ? "0%" : "-100%";
              return `translate(${transX},${transY})`;
            };

            const top = (a.y + 1) * cellSize + a.y + 1;
            const left = (a.x + 1) * cellSize + a.x + 1;
            const agentData = datas[pIdx];

            const userId = p.id;
            const user = users.get(userId);
            const agentHistory = () => {
              // if (!log) return [];

              const history = [];
              for (let i = 0; i < log.length; i++) {
                const act = log[i].players[pIdx].actions?.find(
                  (e) => e.agentId === aIdx
                );
                let type = "";
                if (act) {
                  if (act.type === 1) type = "配置";
                  else if (act.type === 3) type = "移動";
                  else if (act.type === 4) type = "除去";
                  else type = "停留";
                } else {
                  type = "停留";
                }
                history.push({ ...act, type, turn: i });
              }
              return history.reverse();
            };
            return [
              <StyledAgent style={{ top, left }} key={`agent-${pIdx}-${aIdx}`}>
                <Image
                  src={agentData.agentUrl}
                  width={cellSize * 0.8}
                  height={cellSize * 0.8}
                  alt={`agent player:${pIdx} n:${aIdx}`}
                />
                <StyledAgentIdBadge>{aIdx + 1}</StyledAgentIdBadge>
              </StyledAgent>,
              <StyledAgentDetailContainer
                key={`detail-${pIdx}-${aIdx}`}
                style={{ top, left }}
              >
                <StyledAgentDetail
                  style={{
                    border: `solid 4px ${agentData.colors[1]}`,
                    transform: getAgentTransform(),
                  }}
                >
                  <span>
                    {user ? user.screenName : userId}
                    {" : "}
                    {aIdx + 1}
                  </span>
                  <br />
                  <span>行動履歴</span>
                  <StyledAgentDetailHistoryList>
                    {agentHistory().map((e, i) => {
                      return (
                        <div
                          key={i}
                          style={{
                            textDecoration: e.res ? "line-through" : "none",
                          }}
                        >
                          T{e.turn}：
                          {e.type !== "停留" && `x:${e.x} , y:${e.y}に`}
                          {e.type}
                        </div>
                      );
                    })}
                  </StyledAgentDetailHistoryList>
                </StyledAgentDetail>
              </StyledAgentDetailContainer>,
            ];
          });
        })}
        {nextTiles?.map((tile, aIdx) => {
          if (!tile) return <></>;
          return (
            <StyledNextTileContainer
              key={`tile-${tile.x}-${tile.y}`}
              style={{
                gridRow: tile.y + 2,
                gridColumn: tile.x + 2,
              }}
            >
              <StyledNextTile>{aIdx + 1}</StyledNextTile>
            </StyledNextTileContainer>
          );
        })}
      </>
    );
  }, [cells, edgeCells, field, log, players, users, nextTiles]);

  return (
    <StyledFieldContainer ref={ref}>
      <StyledField
        id="field"
        style={{
          transform: `scale(${scale})`,
        }}
      >
        {main}
      </StyledField>
    </StyledFieldContainer>
  );
}
