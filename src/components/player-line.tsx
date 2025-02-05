import { GameDay, GameDayPlayer, PlayerRating } from "../types";

type Props = {
  player: GameDayPlayer & PlayerRating;
  gameDay: GameDay;
  showElo: boolean;
  showPlaying: boolean;
  legend?: boolean;
  substitutePlayer: (playerName: string) => void;
};

const PlayerLine = ({ gameDay, player, showElo, showPlaying, legend = true, substitutePlayer }: Props) => {
  const isPlayingHere = gameDay.playingTeams
    ?.flat()
    .some((p) => p.name === player.name);
  const isPlayingSomewhereElse = gameDay.otherPlayingTeams
    ?.flat()
    .some((p) => p.name === player.name);
  const isOutOfGame = !player.playing
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
    : isOutOfGame
    ? "tw-bg-rose-400 tw-text-stone-800"
    : "tw-text-white";
  return (
    <tr className={`tw-border tw-border-gray-600  ${rowClasses}`}>
      <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">{player.name}</td>
      <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">{player.matches}</td>
      <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">{player.victories}</td>
      <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">{player.defeats}</td>
      <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">{player.lastPlayedMatch}</td>
      {showElo && (
        <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">
          {player.mu.toFixed(2)}/{player.sigma.toFixed(2)}
        </td>
      )}
      {showPlaying && (
        <td className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden tw-cursor-pointer" onClick={() => substitutePlayer(player.name)}>{player.playing ? "Sim" : "Não"}</td>
      )}
    </tr>
  );
};

export default PlayerLine;
