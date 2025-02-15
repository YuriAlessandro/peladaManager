import { FaVolleyball } from "react-icons/fa6";
import { VscLoading } from "react-icons/vsc";
import { api } from "../../api";
import Button from "../../components/button";
import CourtForm, { CourtFormData } from "../../components/court-form";
import { findBestTeamMatch } from "../../lib/elo";
import { createGameDayPlayer } from "../../entities/game-day-player";



const CreateGameDay = () => {
  const onSubmit = async (data: CourtFormData) => {
    try {
      const players = data.players.map((player) => player.value);
      const playersToFirstMatch = players.slice(0, data.playersPerTeam * 2);
      const bestMatch = findBestTeamMatch(playersToFirstMatch);

      await api.createGameDay({
        maxPoints: data.maxPoints,
        playersPerTeam: data.playersPerTeam,
        players: players.map((p, i) => ({
          ...createGameDayPlayer(p, i),
          mu: p.mu,
          sigma: p.sigma,
        })),
        playingTeams: [
          bestMatch.teamA.map(createGameDayPlayer),
          bestMatch.teamB.map(createGameDayPlayer),
        ],
        matches: 0,
        isLive: true,
        autoSwitchTeamsPoints: data.autoSwitchTeamsPoints ?? 0,
        playedOn: new Date(),
      });

      return true;
    } catch {
      return false;
    }
  };
  return (
    <CourtForm
      initialValues={{
        maxPoints: 11,
        playersPerTeam: 4,
        players: [],
      }}
      submitButton={(isSubmitting) => (
        <Button className="tw-gap-2" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <VscLoading className="tw-animate-spin" />
          ) : (
            <FaVolleyball />
          )}{" "}
          Iniciar pelada
        </Button>
      )}
      onSubmit={onSubmit}
    />
  );
};

export default CreateGameDay;
