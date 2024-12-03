import { FaPlay, FaUndo } from "react-icons/fa";
import Button from "../../components/button";
import { GameDayPlayer } from "../../types";

type Props = {
  index: number;
  score: number;
  serve?: boolean;
  incrementScore: () => void;
  decrementScore: () => void;
  team: GameDayPlayer[];
};

const colors = [
  { container: "tw-bg-rose-800", serve: "tw-bg-rose-400" },
  { container: "tw-bg-sky-800", serve: "tw-bg-sky-300" },
  { container: "tw-bg-emerald-800", serve: "tw-bg-emerald-600" },
  { container: "tw-bg-amber-800", serve: "tw-bg-amber-600" },
];

const TeamScoreBoard = ({
  team,
  index,
  score,
  serve,
  decrementScore,
  incrementScore,
}: Props) => {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
      <h2 className="tw-text-3xl tw-font-bold">Time {team[0]?.name ?? index + 1}</h2>
      <Button
        className="tw-bg-rose-400 tw-px-6"
        onClick={() => decrementScore()}
      >
        <FaUndo />
      </Button>
      <button
        type="button"
        onClick={() => incrementScore()}
        className={`score-container tw-rounded-lg tw-bg-opacity-50 ${colors[index].container}`}
      >
        <div
          className={`${colors[index].serve} tw-p-3 tw-rounded-t-lg tw-h-11`}
        >
          {serve && <FaPlay className="tw-text-white tw-text-lg" />}
        </div>
        <h3
          style={{
            textShadow: " 0 0 10px rgba(255, 255, 255, 0.3)",
          }}
          className="tw-text-9xl tw-p-10 tw-font-digital
            tw-flex tw-items-center
          "
        >
          {score.toString().padStart(2, "0")}
        </h3>
      </button>
      <ul>
        {team.map((player, index) => {
          return <li key={index}>{player.name}</li>;
        })}
      </ul>
    </div>
  );
};

export default TeamScoreBoard;
