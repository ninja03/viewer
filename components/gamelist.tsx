import React, { useMemo } from "react";
import { useTheme, styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableFooter from "@mui/material/TableFooter";
import TablePagination from "@mui/material/TablePagination";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import FirstPage from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPage from "@mui/icons-material/LastPage";

import Link, { getGameHref, getUserHref } from "../src/link";
import { Game, Player } from "../src/apiClient";
import { useGameUsers } from "../src/useGameUsers";

const StatusCircle = ({ className }: { className?: string }) => {
  return <span className={className}>●</span>;
};

const Waiting = styled(StatusCircle)({ color: "yellow" });
const Gaming = styled(StatusCircle)({ color: "green" });
const Ending = styled(StatusCircle)({ color: "red" });
const PlayerDiv = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "row",
});
const GameName = styled("div")({
  maxWidth: "30em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
const GameId = styled("div")({ fontSize: "0.8em" });

const GameList = (props: {
  games: Game[];
  pagination?: boolean;
  hover?: boolean;
}) => {
  const pagination = props.pagination ?? true;
  const hover = props.hover ?? true;
  const games = props.games;

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const playerIds = useMemo(
    () =>
      games.flatMap((game) => {
        return game.players.map((p) => p.id);
      }),
    [games]
  );
  const users = useGameUsers(playerIds);

  const getStatusClass = (game: Game) => {
    if (game.status === "ended") return <Ending />;
    else if (game.status === "gaming") return <Gaming />;
    else return <Waiting />;
  };

  const getStartTime = (startedAtUnixTime: number | null) => {
    if (startedAtUnixTime === null) return "-";
    else {
      return new Date(startedAtUnixTime * 1000).toLocaleString();
    }
  };

  const getPoint = (player: Player) => {
    return player.point.areaPoint + player.point.wallPoint;
  };

  const getPlacedAgentStr = (game: Game, i: number) => {
    let num = 0;
    const total = game.players[i].agents.length;
    game.players[i].agents.forEach((agent) => {
      if (agent.x !== -1) num++;
    });
    return `(${num} / ${total})`;
  };

  return (
    <div>
      <div>
        <Waiting />
        ：ユーザ参加待ち
        <Gaming />
        ：ゲーム中
        <Ending />
        ：終了
      </div>
      <TableContainer component={Paper}>
        <Table sx={{ "& td,& th": { p: 1 } }}>
          <TableHead>
            <TableRow>
              <TableCell style={{ minWidth: "8em" }}>
                <div>ステータス</div>
                <div>ターン</div>
              </TableCell>
              <TableCell>
                <div>プレイヤー名(配置済みAgent数)</div>
                <div>ポイント</div>
              </TableCell>
              <TableCell>
                <GameName>ゲーム名</GameName>
                <GameId>ゲームID</GameId>
              </TableCell>
              <TableCell>開始時間</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rowsPerPage > 0
              ? games.slice(
                  page * rowsPerPage,
                  page * rowsPerPage + rowsPerPage
                )
              : games
            ).map((game) => (
              <TableRow key={game.id} hover={hover}>
                <TableCell align="center">
                  {getStatusClass(game)}
                  <div>
                    {game.turn}/{game.totalTurn}
                  </div>
                </TableCell>
                <TableCell>
                  <PlayerDiv>
                    {game.players.map((player, i) => {
                      return (
                        <PlayerDiv
                          key={i}
                          style={{ margin: "0 0.5em", width: "max-content" }}
                        >
                          {i !== 0 && (
                            <div style={{ margin: "0 0.5em" }}>vs</div>
                          )}
                          <div>
                            {(() => {
                              const user = users.get(player.id);
                              return (
                                <Box
                                  component="span"
                                  sx={{
                                    display: "inline-block",
                                    maxWidth: "7em",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                    mr: 0.5,
                                    color: user ? "" : "gray",
                                  }}
                                >
                                  {user ? (
                                    <Link
                                      href={getUserHref(user.name)}
                                      underline="none"
                                      sx={{
                                        color: "black",
                                        "&:hover": {
                                          color: (t) =>
                                            t.palette.secondary.main,
                                        },
                                      }}
                                    >
                                      {user.screenName}
                                    </Link>
                                  ) : (
                                    <>{player.id}</>
                                  )}
                                </Box>
                              );
                            })()}
                            <Box component="span">
                              {getPlacedAgentStr(game, i)}
                            </Box>
                            <br />
                            {getPoint(player)}
                          </div>
                        </PlayerDiv>
                      );
                    })}
                  </PlayerDiv>
                </TableCell>
                <TableCell>
                  <Link
                    href={getGameHref(game.id)}
                    underline="none"
                    sx={{
                      width: "fit-content",
                      "&:hover": { color: (t) => t.palette.secondary.main },
                      color: game.name ? "black" : "gray",
                    }}
                  >
                    {game.name || "Untitled"}
                  </Link>
                  <GameId>{game.id}</GameId>
                </TableCell>
                <TableCell>{getStartTime(game.startedAtUnixTime)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {pagination && (
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[
                    10,
                    20,
                    30,
                    { label: "すべて", value: -1 },
                  ]}
                  colSpan={4}
                  count={games.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  SelectProps={{
                    inputProps: {
                      "aria-label": "1ページあたりの行数",
                    },
                    native: true,
                  }}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(
                    event: React.ChangeEvent<{ value: string }>
                  ) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  ActionsComponent={TablePaginationActions}
                />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </div>
  );
};

function TablePaginationActions(props: {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number
  ) => void;
}) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === "rtl" ? <LastPage /> : <FirstPage />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === "rtl" ? <FirstPage /> : <LastPage />}
      </IconButton>
    </Box>
  );
}

export default GameList;
