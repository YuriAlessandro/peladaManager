import React, { useCallback, useEffect } from "react";
import { FaFlagCheckered, FaPlay, FaExpand, FaCopy } from "react-icons/fa";
import { FaGear, FaRightLeft } from "react-icons/fa6";
import { VscLoading } from "react-icons/vsc";
import { Link, useNavigate } from "react-router";
import { api } from "../../api";
import { socketManager } from "../../lib/socket";
import Button from "../../components/button";
import PlayersTable from "../../components/players-table";
import { useActiveGameDay } from "../../hooks/use-active-game-day";
import { findBestTeamMatch, updateRatings } from "../../lib/elo";
import { findNextMatchPlayers } from "../../lib/next-match";
import { GameDayPlayer, PlayerRating } from "../../types";
import TeamScoreBoard from "./team-scoreboard";
import FullScreenScoreboard from "./full-screen-scoreboard";
import { sortPlayers } from "../../utils";

const GameDay = () => {
  const activeGameDay = useActiveGameDay();
  // const [showElo, setShowElo] = React.useState(false);
  const [isStartingNewMatch, setIsStartingNewMatch] = React.useState(false);
  const navigate = useNavigate();
  const [scoreA, setScoreA] = React.useState(0);
  const [scoreB, setScoreB] = React.useState(0);
  const [serveIndex, setServeIndex] = React.useState<number | null>(null);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

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

  // Handle socket connection for real-time updates
  useEffect(() => {
    if (!activeGameDay.data?.id) return;

    const onTransfer = () => {
      alert('⚠️ A pelada foi transferida para outro dispositivo. Você será redirecionado.');
      navigate('/');
    };

    const onUpdate = () => {
      activeGameDay.mutate();
    };

    // Try to connect to socket, but don't break if it fails
    try {
      socketManager.connect(activeGameDay.data.id, onTransfer, onUpdate);
    } catch (error) {
      console.warn('Socket connection failed, continuing without real-time updates:', error);
    }

    // Fallback: poll for updates every 10 seconds if socket is not connected
    const pollInterval = setInterval(() => {
      if (!socketManager.isConnected()) {
        activeGameDay.mutate();
      }
    }, 10000);

    return () => {
      socketManager.disconnect();
      clearInterval(pollInterval);
    };
  }, [activeGameDay.data?.id, activeGameDay.mutate, navigate]);

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

      if (activeGameDay.data.autoSwitchTeamsPoints > 0) {
        const totalPoints = updatedScoreA + updatedScoreB;
        if (totalPoints % activeGameDay.data.autoSwitchTeamsPoints === 0) {
          await switchCurrentTeams(updatedScoreA, updatedScoreB);
        }
      }

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

    // Existe full screen
    if (isFullScreen) setIsFullScreen(false);
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

    if (!ok) {
      return alert("Pelada não pode ser finalizada");
    }

    navigate(`/historico/${activeGameDay.data.id}?origin=game-day`);
  };

  const switchCurrentTeams = async (
    newScoreA: number,
    newScoreB: number,
    showAlert = true
  ) => {
    if (!activeGameDay.data) return;
    await api.updateGameDay({
      ...activeGameDay.data,
      playingTeams: [
        activeGameDay.data.playingTeams[1],
        activeGameDay.data.playingTeams[0],
      ],
    });
    await activeGameDay.mutate();

    setScoreA(newScoreB);
    setScoreB(newScoreA);

    if (showAlert) alert("Times invertidos!");
  };

  const switchFullScreen = (isFullScreen: boolean) => {
    // Need to invert teams when put on full screen
    setIsFullScreen(isFullScreen);
    switchCurrentTeams(scoreB, scoreA, false);
  };

  const substitutePlayer = async (player: string) => {
    const allPlaying = activeGameDay.data?.playingTeams.flat();
    if (allPlaying?.some((p) => p.name === player)) {
      const playerOrder = activeGameDay?.data?.players.sort((a, b) =>
        sortPlayers(a, b)
      );

      if (playerOrder) {
        // Get all players that are not playing
        const notOnCurrentMatchPlayers = playerOrder.filter(
          (player) =>
            !allPlaying.some((p) => p.name === player.name) && player.playing
        );

        // Get next player not playing on list
        const nextPlayer = notOnCurrentMatchPlayers.find(
          (p) => p.name !== player
        );
        if (!nextPlayer) {
          alert("Não há jogadores reservas para substituir.");
          return;
        }

        const confirm = window.confirm(
          `${player} está jogando, deseja substituí-lo? ${nextPlayer.name} será adicionado ao time.`
        );

        if (confirm) {
          nextPlayer.playing = true;

          // Find in witch team the player is playing
          const teamIndex = activeGameDay?.data?.playingTeams.findIndex(
            (team) => team.some((p) => p.name === player)
          );

          if (teamIndex === 0 || teamIndex === 1) {
            const team = activeGameDay?.data?.playingTeams[teamIndex];

            // Remove player from team
            const playerIndex = team?.findIndex((p) => p.name === player);
            if (playerIndex !== -1) team?.splice(playerIndex, 1);

            // Add nextPlayer to team
            team?.push(nextPlayer);

            if (
              activeGameDay?.data &&
              activeGameDay.data.playingTeams &&
              team
            ) {
              // Update playingTeams
              const playingTeams = activeGameDay.data.playingTeams;
              playingTeams[teamIndex] = team;

              await api.updateGameDay({
                ...activeGameDay.data,
                playingTeams: playingTeams,
              });
            }

            alert(`${player} foi substituído por ${nextPlayer.name}`);
          }
        } else return;
      }
    }

    if (activeGameDay?.data?.players) {
      const playerIndex = activeGameDay.data.players.findIndex(
        (p) => p.name === player
      );
      const players = activeGameDay.data.players;
      players[playerIndex].playing = !players[playerIndex].playing;

      const playersToNextGame = activeGameDay.data.playersToNextGame;

      await api.updateGameDay({
        ...activeGameDay.data,
        players: players,
        playersToNextGame: playersToNextGame.filter(
          (nextGamePlayer) => nextGamePlayer.name !== player
        ),
      });
    }
    await activeGameDay.mutate();
  };

  const nextMatchButton = () => (
    <Button
      onClick={startNewMatch}
      disabled={isStartingNewMatch}
      className="tw-bg-rose-400 tw-gap-2 tw-text-base tw-font-medium"
    >
      {isStartingNewMatch ? (
        <VscLoading className="tw-animate-spin" />
      ) : (
        <FaPlay />
      )}
      Iniciar próxima partida
    </Button>
  );

  return (
    <>
      {!isFullScreen && (
        <>
          <div className="tw-flex tw-flex-col md:tw-flex-row tw-gap-2 tw-items-center tw-justify-between">
            <h2 className="tw-text-stone-300">
              Partida #{activeGameDay.data.matches + 1}
              {/* <span>Quadra #{activeGameDay.data.courtId.slice(-5)}</span> */}
            </h2>
            <div className="tw-flex tw-gap-2">
              <Button className="tw-text-base tw-gap-2" onClick={copyCode}>
                <FaCopy />#{activeGameDay.data.joinCode}
              </Button>
              {!(activeGameDay.data.playingTeams.length === 0) && (
                <Button
                  className="tw-text-base tw-gap-2"
                  onClick={() => switchFullScreen(true)}
                >
                  <FaExpand />
                </Button>
              )}
            </div>
          </div>
          {activeGameDay.data.playingTeams.length === 0 && (
            <div className="tw-grid tw-grid-cols-2 tw-gap-5">
              <TeamScoreBoard
                score={0}
                index={0}
                incrementScore={() => {}}
                decrementScore={() => {}}
                team={[]}
              />
              <TeamScoreBoard
                score={0}
                index={1}
                incrementScore={() => {}}
                decrementScore={() => {}}
                team={[]}
              />
            </div>
          )}
          {activeGameDay.data.playingTeams.length === 2 && (
            <div className="tw-grid tw-grid-cols-2 tw-gap-2  sm:tw-grid-cols-3 sm:tw-gap-5">
              <TeamScoreBoard
                score={scoreA}
                serve={serveIndex === 0}
                index={0}
                team={activeGameDay.data.playingTeams[0]}
                decrementScore={() => decrementScore(0)}
                incrementScore={() => incrementScore(0)}
              />
              <div className="tw-justify-center tw-text-3xl tw-items-center tw-hidden sm:tw-flex">
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
            </div>
          )}
          <div className="tw-flex tw-flex-col md:tw-flex-row tw-justify-center tw-gap-2">
            {activeGameDay.data.playingTeams.length === 0 && nextMatchButton()}
            <Link to="/pelada/editar" className=" tw-self-stretch tw-flex">
              <Button className="tw-bg-sky-300 tw-text-base tw-flex-1">
                <FaGear /> Configurar Quadra
              </Button>
            </Link>
            <Button
              onClick={() => switchCurrentTeams(scoreA, scoreB)}
              className="!tw-bg-amber-400 tw-text-base tw-self-stretch"
            >
              <FaRightLeft /> Inverter Times
            </Button>
          </div>
          <PlayersTable
            showElo={false}
            gameDay={activeGameDay.data}
            substitutePlayer={substitutePlayer}
          />
          <div className="tw-flex tw-gap-2">
            <Button
              className="tw-flex-1 tw-bg-rose-400 tw-text-base tw-font-semibold"
              onClick={endMatchDay}
            >
              <FaFlagCheckered />
              Finalizar Pelada
            </Button>
            {/* <Button className="tw-flex-1 tw-bg-rose-400 tw-text-base tw-font-semibold"
              onClick={endCourt}
              disabled
            >
              <FaStopCircle />
              Finalizar Quadra
            </Button> */}
            {/* <div className="tw-flex-1 tw-flex tw-justify-center tw-items-center">
              <input
                type="checkbox"
                id="show-elo"
                onChange={() => setShowElo(!showElo)}
              />
              <label htmlFor="show-elo">v8. Modo Desenvolvedor</label>
            </div> */}
          </div>
        </>
      )}
      {isFullScreen && (
        <FullScreenScoreboard
          setIsFullScreen={switchFullScreen}
          teams={activeGameDay.data.playingTeams}
          scoreA={scoreA}
          scoreB={scoreB}
          incrementScore={incrementScore}
          maxPoints={activeGameDay.data.maxPoints}
        />
      )}
    </>
  );
};

export default GameDay;
