import { api } from "../../api";
import CreateCourtForm from "../../components/create-court-form";
import { CreateCourtFormData } from "../../hooks/use-create-court";
import { findBestTeamMatch } from "../../lib/elo";
import { GameDayPlayer, Player } from "../../types";

const toGameDayPlayer = (player: Player, index: number): GameDayPlayer => ({
  name: player.name,
  matches: 0,
  victories: 0,
  defeats: 0,
  lastPlayedMatch: 0,
  playing: true,
  order: index + 1,
});

const CreateGameDay = () => {
  const onSubmit = async (data: CreateCourtFormData) => {
    const players = data.players.map((player) => player.value);
    const playersToFirstMatch = players.slice(0, data.playersPerTeam * 2);
    const bestMatch = findBestTeamMatch(playersToFirstMatch);

    const gameDay = await api.createGameDay({
      maxPoints: data.maxPoints,
      playersPerTeam: data.playersPerTeam,
      players: players.map((p, i) => ({
        ...toGameDayPlayer(p, i),
        mu: p.mu,
        sigma: p.sigma,
      })),
      playingTeams: [
        bestMatch.teamA.map(toGameDayPlayer),
        bestMatch.teamB.map(toGameDayPlayer),
      ],
      matches: 0,
      isLive: true,
      autoSwitchTeamsPoints: data.autoSwitchTeamsPoints ?? 0,
      playedOn: new Date(),
    });

    return gameDay;
  };
  return <CreateCourtForm onSubmit={onSubmit} />;
};

export default CreateGameDay;
