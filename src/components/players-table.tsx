import { GameDay } from "../types";
import { sortPlayers } from "../utils";
import PlayerLine from "./player-line";

type Props = {
  gameDay: GameDay;
  showElo?: boolean;
  legend?: boolean;
  showPlaying?: boolean;
  substitutePlayer: (playerName: string) => void;
};

const PlayersTable = ({
  showElo = false,
  legend = true,
  showPlaying = true,
  gameDay,
  substitutePlayer
}: Props) => {
  return (
    <div className="tw-flex tw-flex-col tw-rounded-t-xl">
      <div className="tw-flex tw-flex-col md:tw-flex-row tw-gap-2 tw-justify-between tw-bg-slate-400 tw-p-5 tw-rounded-t-lg tw-w-full tw-max-w-full tw-overflow-x-auto">
        <h3 className="tw-text-white tw-text-xl tw-font-semibold">Jogadores</h3>
        {legend && (
          <div className="tw-flex tw-gap-1">
            <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-emerald-400">
              Na partida atual
            </div>
            {/* <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-amber-400">
              Em outra quadra
            </div> */}
            <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-sky-400">
              Joga a próx.
            </div>
            <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-rose-400">
              Fora do jogo
            </div>
          </div>
        )}
      </div>
      <table className="tw-bg-stone-900 tw-self-stretch tw-text-left tw-w-full tw-min-w-full tw-border-collapse tw-table-fixed ">
        <thead>
          <tr>
            <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Nome</th>
            <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Partidas</th>
            <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Vitórias</th>
            <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Derrotas</th>
            <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Última partida</th>
            {showElo && <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Elo</th>}
            {showPlaying && <th className="tw-p-2 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden">Jogando</th>}
          </tr>
        </thead>
        <tbody className="">
          {gameDay.players
            .sort((a, b) => sortPlayers(a, b))
            .map((player) => {
              return (
                <PlayerLine
                  key={player.name}
                  gameDay={gameDay}
                  player={player}
                  legend={legend}
                  showElo={showElo}
                  showPlaying={showPlaying}
                  substitutePlayer={substitutePlayer}
                />
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default PlayersTable;
