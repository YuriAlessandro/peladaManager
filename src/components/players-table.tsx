import { GameDay } from "../types";
import PlayerLine from "./player-line";

type Props = {
  gameDay: GameDay;
  showElo?: boolean;
  legend?: boolean;
  showPlaying?: boolean;
};

const PlayersTable = ({ showElo = false, legend = true, showPlaying = true, gameDay }: Props) => {
  return (
    <div className="tw-flex tw-flex-col tw-rounded-t-xl">
      <div className="tw-flex tw-justify-between tw-bg-slate-400 tw-p-5 tw-rounded-t-lg">
        <h3 className="tw-text-white tw-text-xl tw-font-semibold">Jogadores</h3>
        {legend && (
          <div className="tw-flex tw-gap-1">
            <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-emerald-400">
              Na partida atual
            </div>
            <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-amber-400">
              Em outra quadra
            </div>
            <div className="tw-flex tw-items-center tw-font-semibold tw-p-1 tw-text-xs tw-bg-sky-400">
              Joga a próx.
            </div>
          </div>
        )}
      </div>
      <table className="tw-bg-stone-900 tw-text-left">
        <thead>
          <tr>
            <th className="tw-p-2">Nome</th>
            <th className="tw-p-2">Partidas</th>
            <th className="tw-p-2">Vitórias</th>
            <th className="tw-p-2">Derrotas</th>
            <th className="tw-p-2">Última partida</th>
            {showElo && <th className="tw-p-2">Elo</th>}
            {showPlaying && <th className="tw-p-2">Jogando</th>}
          </tr>
        </thead>
        <tbody>
          {gameDay.players.map((player) => {
            return (
              <PlayerLine
                key={player.name}
                gameDay={gameDay}
                player={player}
                legend={legend}
                showElo={showElo}
                showPlaying={showPlaying}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PlayersTable;
