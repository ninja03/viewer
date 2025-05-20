import { useEffect, useState } from "react";
import { EventSourcePolyfill } from "event-source-polyfill";

import { Game, host, StreamMatchesReq, StreamMatchesRes } from "./apiClient";

export const useGameStream = (req?: StreamMatchesReq, bearerToken?: string) => {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    if (!req) return;
    const url = new URL("/v1/matches/stream", host);
    url.searchParams.append("q", req.q);
    if (req.allowNewGame !== undefined)
      url.searchParams.append("allowNewGame", String(req.allowNewGame));
    if (req.endIndex !== undefined)
      url.searchParams.append("endIndex", String(req.endIndex));
    if (req.startIndex !== undefined)
      url.searchParams.append("startIndex", String(req.startIndex));

    const headers: Record<string, string> = {};
    if (bearerToken) {
      headers["Authorization"] = "Bearer " + bearerToken;
    }

    const res = new EventSourcePolyfill(url.href, { headers });
    res.addEventListener("message", (e) => {
      const data = JSON.parse(e.data) as StreamMatchesRes;

      if (data.type === "initial") {
        setGames(data.games);
      } else if (data.type === "update") {
        setGames((prev) => {
          const games = [...prev];
          const updateGameIndex = games.findIndex((g) => g.id === data.game.id);
          if (updateGameIndex >= 0) games[updateGameIndex] = data.game;
          return games;
        });
      } else if (data.type === "remove") {
        setGames((prev) => {
          const games = [...prev];
          const removeGameIndex = games.findIndex((g) => g.id === data.gameId);
          if (removeGameIndex >= 0) games.splice(removeGameIndex, 1);
          return games;
        });
      } else if (data.type === "add") {
        setGames((prev) => {
          const games = [...prev];
          games.push(data.game);
          if (req?.q.includes("sort:startAtUnixTime-desc")) {
            games.sort((a, b) => {
              const aTime = a.startedAtUnixTime || 10000000000;
              const bTime = b.startedAtUnixTime || 10000000000;
              return bTime - aTime;
            });
          }
          return games;
        });
      }
    });
    res.onerror = (e) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("error", e);
      }
    };
    return () => {
      res.close();
    };
  }, [req, bearerToken]);

  return games;
};
