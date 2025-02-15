import { GameDayPlayer, Player } from "../types";

export const createGameDayPlayer = (player: Player, index: number): GameDayPlayer => ({
  name: player.name,
  matches: 0,
  victories: 0,
  defeats: 0,
  lastPlayedMatch: 0,
  playing: true,
  order: index + 1,
});