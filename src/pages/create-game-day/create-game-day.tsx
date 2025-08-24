import { FaVolleyball } from "react-icons/fa6";
import { VscLoading } from "react-icons/vsc";
import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { api } from "../../api";
import Button from "../../components/button";
import CourtForm, { CourtFormData } from "../../components/court-form";
import { findBestTeamMatch } from "../../lib/elo";
import { createGameDayPlayer } from "../../entities/game-day-player";

const CreateGameDay = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Handle joining with a code
  useEffect(() => {
    const joinCode = params.id;
    if (joinCode) {
      const joinGameDay = async () => {
        try {
          setIsJoining(true);
          setJoinError(null);
          
          // Show confirmation dialog for transfer
          const confirmed = window.confirm(
            "⚠️ ATENÇÃO: Ao transferir a pelada, todos os outros clientes conectados serão desconectados. Deseja continuar?"
          );
          
          if (!confirmed) {
            setJoinError("Transferência cancelada");
            setIsJoining(false);
            return;
          }
          
          const gameDay = await api.transferGameDay(joinCode);
          if (!gameDay) {
            setJoinError("Código inválido ou pelada não encontrada");
            return;
          }
          navigate("/pelada");
        } catch (error) {
          setJoinError("Erro ao transferir a pelada");
        } finally {
          setIsJoining(false);
        }
      };
      joinGameDay();
    }
  }, [params.id, navigate]);

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

  // Show loading state when joining
  if (isJoining) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <VscLoading className="tw-animate-spin tw-text-5xl" />
          <p className="tw-text-xl">Transferindo a pelada...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (joinError) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <p className="tw-text-xl tw-text-red-500">{joinError}</p>
          <Button onClick={() => navigate("/")}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

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
