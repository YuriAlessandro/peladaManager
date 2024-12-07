import React, { useCallback, useEffect } from "react";
import { FaCopy, FaFlagCheckered, FaPlay, FaStopCircle } from "react-icons/fa";
import { FaGear, FaRightLeft } from "react-icons/fa6";
import { VscLoading } from "react-icons/vsc";
import { Link, useNavigate } from "react-router";
import { api } from "../../api";
import Button from "../../components/button";
import PlayersTable from "../../components/players-table";  
import { useActiveGameDay } from "../../hooks/use-active-game-day";
import { findBestTeamMatch, updateRatings } from "../../lib/elo";
import { findNextMatchPlayers } from "../../lib/next-match";
import { GameDayPlayer, PlayerRating } from "../../types";
import TeamScoreBoard from "./team-scoreboard";

const GameDay = () => {
  const activeGameDay = useActiveGameDay();
  const [showElo, setShowElo] = React.useState(false);
  const [isStartingNewMatch, setIsStartingNewMatch] = React.useState(false);
  const navigate = useNavigate();
  const [scoreA, setScoreA] = React.useState(0);
  const [scoreB, setScoreB] = React.useState(0);
  const [serveIndex, setServeIndex] = React.useState<number | null>(null);

  const setRandomServeIndex = useCallback(() => {
    if (!activeGameDay.data) return;
    const randomIndex = Math.floor(
      Math.random() * activeGameDay.data.playingTeams.length
    );
    setServeIndex(randomIndex);
  }, [activeGameDay.data]);

  useEffect(() => {
    if (activeGameDay.data && serveIndex === null) {
      setRandomServeIndex();
    }
  }, [setRandomServeIndex, activeGameDay.data, serveIndex]);

  if (activeGameDay.isLoading) {
    return (
      <div className="tw-flex-1 tw-flex tw-justify-center tw-items-center">
        <VscLoading className="tw-animate-spin" />
      </div>
    );
  }

  if (activeGameDay.error || !activeGameDay.data) {
    navigate("/");
    return (
      <div className="tw-flex-1 tw-flex tw-justify-center tw-items-center">
        <p>Erro ao carregar pelada :/</p>
      </div>
    );
  }

  const copyCode = () => {
    if (!activeGameDay.data) return;
    navigator.clipboard.writeText(activeGameDay.data.joinCode);
    alert("Código copiado!");
  };

  const endMatch = async (winner: number, loser: number) => {
    if (!activeGameDay.data) return;
    const winners = activeGameDay.data.players.filter((player) =>
      activeGameDay.data!.playingTeams[winner].some(
        (p) => p.name === player.name
      )
    );

    const losers = activeGameDay.data.players.filter((player) =>
      activeGameDay.data!.playingTeams[loser].some(
        (p) => p.name === player.name
      )
    );

    const [updatedWinners, updatedLosers] = updateRatings(winners, losers);
    await api.updatePlayers([...updatedWinners, ...updatedLosers]);
    await api.updateGameDay({
      ...activeGameDay.data,
      playersToNextGame: activeGameDay.data.playersToNextGame.concat(
        activeGameDay.data.playingTeams[winner]
      ),
      matches: activeGameDay.data.matches + 1,
      playingTeams: [],
      playedOn: new Date(),
      players: activeGameDay.data.players.map((player) => {
        const matchedWinner = updatedWinners.find(
          (p) => p.name === player.name
        );
        const matchedLoser = updatedLosers.find((p) => p.name === player.name);
        if (matchedWinner) {
          return {
            ...player,
            matches: player.matches + 1,
            victories: player.victories + 1,
            lastPlayedMatch: activeGameDay.data!.matches + 1,
            mu: matchedWinner.mu,
            sigma: matchedWinner.sigma,
          };
        }
        if (matchedLoser) {
          return {
            ...player,
            matches: player.matches + 1,
            defeats: player.defeats + 1,
            lastPlayedMatch: activeGameDay.data!.matches + 1,
            mu: matchedLoser.mu,
            sigma: matchedLoser.sigma,
          };
        }
        return player;
      }),
    });
    await activeGameDay.mutate();

    setScoreA(0);
    setScoreB(0);
  };

  const incrementScore = async (index: number) => {
    if (!activeGameDay.data) return;

    const updatedScoreA = index === 0 ? scoreA + 1 : scoreA;
    const updatedScoreB = index === 1 ? scoreB + 1 : scoreB;

    const hasReachedMaxPoints =
      updatedScoreA >= activeGameDay.data.maxPoints ||
      updatedScoreB >= activeGameDay.data.maxPoints;
    const hasDifferenceOfTwo = Math.abs(updatedScoreA - updatedScoreB) >= 2;
    const hasWinner = hasReachedMaxPoints && hasDifferenceOfTwo;

    if (!hasWinner) {
      setScoreA(updatedScoreA);
      setScoreB(updatedScoreB);
      setServeIndex(index);
      return;
    }

    const winner = updatedScoreA > updatedScoreB ? 0 : 1;
    const loser = updatedScoreA > updatedScoreB ? 1 : 0;

    const winnerCaptain = activeGameDay.data.playingTeams[winner][0] ?? {
      name: index + 1,
    };
    const confirm = window.confirm(
      `O time ${winnerCaptain.name} venceu! Deseja finalizar a partida?`
    );

    if (!confirm) {
      return;
    }

    await endMatch(winner, loser);
  };

  const decrementScore = (index: number) => {
    if (!activeGameDay.data) return;
    if (index === 0) {
      setScoreA((s) => Math.max(0, s - 1));
    }
    if (index === 1) {
      setScoreB((s) => Math.max(0, s - 1));
    }
  };

  const startNewMatch = async () => {
    try {
      setIsStartingNewMatch(true);
      if (!activeGameDay.data) return;
      if (
        activeGameDay.data.players.length <
        activeGameDay.data.playersPerTeam * 2
      ) {
        alert("Não há jogadores suficientes para iniciar uma nova partida");
        return;
      }

      const nextMatchPlayers = findNextMatchPlayers(activeGameDay.data);
      const nextMatchPlayersWithRatings = nextMatchPlayers.map<
        GameDayPlayer & PlayerRating
      >((player) => {
        const matchedPlayer = activeGameDay.data!.players.find(
          (p) => p.name === player.name
        );
        return {
          ...player,
          mu: matchedPlayer?.mu ?? 25,
          sigma: matchedPlayer?.sigma ?? 8.333,
        };
      });
      const teams = findBestTeamMatch(nextMatchPlayersWithRatings);

      await api.updateGameDay({
        ...activeGameDay.data,
        playingTeams: [teams.teamA, teams.teamB],
        playersToNextGame: activeGameDay.data.playersToNextGame.filter(
          (player) => !nextMatchPlayers.some((p) => p.name === player.name)
        ),
      });
      await activeGameDay.mutate();
      setRandomServeIndex();
    } finally {
      setIsStartingNewMatch(false);
    }
  };

  const endMatchDay = async () => {
    const confirm = window.confirm("Deseja finalizar a pelada?");
    if (!confirm) {
      return;
    }

    if (!activeGameDay.data) return;
    const ok = await api.updateGameDay({
      ...activeGameDay.data,
      isLive: false,
    });

    if(!ok) {
      return alert('Pelada não pode ser finalizada')
    }

    navigate(`/historico/${activeGameDay.data.id}?origin=game-day`)
  };

  const endCourt = async () => {
    const confirm = window.confirm("Deseja finalizar a quadra?");
    if (!confirm) {
      return;
    }

    if (!activeGameDay.data) return;
    const ok = await api.leaveGameDay()
    if(!ok) {
      return alert('Quadra não pôde ser finalizada')
    }

    navigate('/')
  }

  return (
    <>
      <div className="tw-flex tw-items-center tw-justify-between">
        <h2 className="tw-text-stone-300">
          Partida #{activeGameDay.data.matches + 1} /{" "}
          <span>Quadra #{activeGameDay.data.courtId.slice(-5)}</span>
        </h2>
        <Button className="tw-text-base tw-gap-2" onClick={copyCode}>
          <FaCopy />#{activeGameDay.data.joinCode}
        </Button>
      </div>
      <div className="tw-grid tw-grid-cols-3 tw-gap-5">
        {activeGameDay.data.playingTeams.length === 0 && (
          <>
            <TeamScoreBoard
              score={0}
              index={0}
              incrementScore={() => {}}
              decrementScore={() => {}}
              team={[]}
            />
            <Button
              onClick={startNewMatch}
              disabled={isStartingNewMatch}
              className="tw-self-center tw-bg-rose-400 tw-gap-2 tw-text-base tw-font-medium"
            >
              {isStartingNewMatch ? <VscLoading className="tw-animate-spin" /> : <FaPlay />}
              Iniciar próxima partida
            </Button>
            <TeamScoreBoard
              score={0}
              index={1}
              incrementScore={() => {}}
              decrementScore={() => {}}
              team={[]}
            />
          </>
        )}
        {activeGameDay.data.playingTeams.length === 2 && (
          <>
            <TeamScoreBoard
              score={scoreA}
              serve={serveIndex === 0}
              index={0}
              team={activeGameDay.data.playingTeams[0]}
              decrementScore={() => decrementScore(0)}
              incrementScore={() => incrementScore(0)}
            />
            <div className="tw-flex tw-justify-center tw-text-3xl">
              <p className="tw-text-center tw-font-bold">X</p>
            </div>
            <TeamScoreBoard
              score={scoreB}
              serve={serveIndex === 1}
              index={1}
              team={activeGameDay.data.playingTeams[1]}
              decrementScore={() => decrementScore(1)}
              incrementScore={() => incrementScore(1)}
            />
          </>
        )}
      </div>
      <div className="tw-flex tw-justify-between tw-gap-2">
        <Link to="/pelada/editar">
          <Button className="tw-bg-sky-300 tw-text-base">
            <FaGear /> Configurar Quadra
          </Button>
        </Link>
        <Button className="!tw-bg-amber-400 tw-text-base">
          <FaRightLeft /> Inverter Times
        </Button>
      </div>
      <PlayersTable showElo={showElo} gameDay={activeGameDay.data} />
      <div className="tw-flex tw-gap-2">
        <Button
          className="tw-flex-1 tw-bg-rose-400 tw-text-base tw-font-semibold"
          onClick={endMatchDay}
        >
          <FaFlagCheckered />
          Finalizar Pelada
        </Button>
        <Button className="tw-flex-1 tw-bg-rose-400 tw-text-base tw-font-semibold"
          onClick={endCourt}
        >
          <FaStopCircle />
          Finalizar Quadra
        </Button>
        <div className="tw-flex-1 tw-flex tw-justify-center tw-items-center">
          <input
            type="checkbox"
            id="show-elo"
            onChange={() => setShowElo(!showElo)}
          />
          <label htmlFor="show-elo">v7. Modo Desenvolvedor</label>
        </div>
      </div>
    </>
  );
};

export default GameDay;
