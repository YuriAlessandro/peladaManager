import { GameDay, GameDayPlayer, PlayerRating } from "../types";

type Props = {
  player: GameDayPlayer & PlayerRating;
  gameDay: GameDay;
  showElo: boolean;
  showPlaying: boolean;
  legend?: boolean;
};

const PlayerLine = ({ gameDay, player, showElo, showPlaying, legend = true }: Props) => {
  const isPlayingHere = gameDay.playingTeams
    ?.flat()
    .some((p) => p.name === player.name);
  const isPlayingSomewhereElse = gameDay.otherPlayingTeams
    ?.flat()
    .some((p) => p.name === player.name);
  const shouldBeOnNextMatch = gameDay.playersToNextGame?.some(
    (p) => p.name === player.name
  );
  const rowClasses = !legend
    ? "tw-text-white"
    : isPlayingHere
    ? "tw-bg-emerald-400 tw-text-stone-800"
    : isPlayingSomewhereElse
    ? "tw-bg-amber-400 tw-text-stone-800"
    : shouldBeOnNextMatch
    ? "tw-bg-sky-400 tw-text-stone-800"
    : "tw-text-white";
  return (
    <tr className={`tw-border tw-border-gray-600  ${rowClasses}`}>
      <td className="tw-p-2">{player.name}</td>
      <td className="tw-p-2">{player.matches}</td>
      <td className="tw-p-2">{player.victories}</td>
      <td className="tw-p-2">{player.defeats}</td>
      <td className="tw-p-2">{player.lastPlayedMatch}</td>
      {showElo && (
        <td className="tw-p-2">
          {player.mu.toFixed(2)}/{player.sigma.toFixed(2)}
        </td>
      )}
      {showPlaying && (
        <td className="tw-p-2">{player.playing ? "Sim" : "Não"}</td>
      )}
    </tr>
  );
};

export default PlayerLine;
