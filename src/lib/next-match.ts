import { GameDay, GameDayPlayer } from "../types";
import { sortPlayers } from "../utils";

function findPlayerByName(players: GameDayPlayer[], name: string) {
  return players.find((player) => player.name === name);
}

function findAvailablePlayers(gameDay: GameDay, winners: GameDayPlayer[] = []) {
  return gameDay.players
    .filter((player) => player.playing)
    .filter((player) => !findPlayerByName(winners, player.name))
    .filter(
      (player) => !findPlayerByName(gameDay.otherPlayingTeams.flat(), player.name)
    );
}

export function findNextMatchPlayers(gameDay: GameDay) {
  const winners = gameDay.playersToNextGame.slice();
  if (winners.length > gameDay.playersPerTeam * 2) {
    return winners
      .sort((a, b) => sortPlayers(a, b))
      .slice(0, gameDay.playersPerTeam * 2);
  }

  if (winners.length === gameDay.playersPerTeam * 2) {
    return winners;
  }

  let nextPlayers = [...winners];

  const availablePlayersToJoin = findAvailablePlayers(gameDay, winners)
    .slice()
    .sort((a, b) => sortPlayers(a, b));

  while (
    nextPlayers.length < gameDay.playersPerTeam * 2 &&
    availablePlayersToJoin.length > 0
  ) {
    const player = availablePlayersToJoin.shift();
    if(!player) break;
    nextPlayers.push(player);
    nextPlayers = nextPlayers.filter(
      (player, index, self) =>
        self.findIndex((p) => p.name === player.name) === index
    );
  }

  return nextPlayers;
}
