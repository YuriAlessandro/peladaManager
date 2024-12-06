import { FaSync } from "react-icons/fa";
import { VscLoading } from "react-icons/vsc";
import Button from "../../../components/button";
import CourtForm, { CourtFormData } from "../../../components/court-form";
import { useActiveGameDay } from "../../../hooks/use-active-game-day";
import { api } from "../../../api";
import { createGameDayPlayer } from "../../../entities/game-day-player";

const EditGameDay = () => {
  const gameDay = useActiveGameDay();

  if (gameDay.isLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <VscLoading className="tw-animate-spin tw-text-5xl" />
      </div>
    );
  }

  if (!gameDay.data) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <div className="tw-text-3xl">Pelada não encontrada</div>
      </div>
    );
  }

  const onSubmit = async (data: CourtFormData) => {
    if(!gameDay.data) return false;

    const players = data.players
      .map((player) => player.value)
      .map((player, index) => {
        const playerInGame = gameDay.data?.players.find(
          (p) => p.name === player.name,
        );
        
        if(!playerInGame) return {
          ...createGameDayPlayer(player, index),
          mu: player.mu,
          sigma: player.sigma,
        };
        return playerInGame;
      })

    await api.updateGameDay({
      autoSwitchTeamsPoints: data.autoSwitchTeams && data.autoSwitchTeamsPoints ? data.autoSwitchTeamsPoints : 0,
      maxPoints: data.maxPoints,
      isLive: true,
      matches: gameDay.data?.matches,
      playedOn: new Date(),
      playersPerTeam: data.playersPerTeam,
      playingTeams: gameDay.data.playingTeams,
      playersToNextGame: gameDay.data.playersToNextGame,
      players,
    })

    await gameDay.mutate();

    return false;
  };

  return (
    <div>
      <CourtForm
        onSubmit={onSubmit}
        submitButton={(isSubmitting) => (
          <Button className="tw-gap-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <VscLoading className="tw-animate-spin" />
            ) : (
              <FaSync />
            )}{" "}
            Atualizar pelada
          </Button>
        )}
        initialValues={{
          maxPoints: gameDay.data.maxPoints,
          players: gameDay.data.players.map((player) => ({
            value: player,
            label: player.name,
            isFixed: true,
          })),
          playersPerTeam: gameDay.data.playersPerTeam,
          autoSwitchTeams: Boolean(
            gameDay.data.autoSwitchTeamsPoints &&
              gameDay.data.autoSwitchTeamsPoints > 0
          ),
          autoSwitchTeamsPoints: gameDay.data.autoSwitchTeamsPoints,
        }}
      />
    </div>
  );
};

export default EditGameDay;
