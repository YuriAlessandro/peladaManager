import { FaExpand } from "react-icons/fa"
import Button from "../../components/button"
import { GameDayPlayer } from "../../types";

type Props = {
  teams: GameDayPlayer[][];
  setIsFullScreen: (isFullScreen: boolean) => void;
  scoreA: number;
  scoreB: number;
  incrementScore: (teamIndex: number) => void;
};


const FullScreenScoreboard = ({
  setIsFullScreen,
  teams,
  scoreA,
  scoreB,
  incrementScore,
}: Props) => {
    return (
        <>
          <div className="tw-flex tw-items-end tw-justify-end">
            <Button className="tw-text-base tw-gap-2" onClick={() => setIsFullScreen(false)}>
              <FaExpand />
            </Button>
          </div>
          <div className="tw-flex tw-justify-center tw-flex-row tw-h-[90vh]">
            <div className="tw-flex tw-justify-center tw-bg-sky-300 tw-bg-rose-400 tw-w-[49vw] tw-h-full" onClick={() => incrementScore(0)}>
              <div className="tw-flex tw-justify-center tw-items-center tw-flex-col tw-h-full tw-gap-10">
                <h3 className="tw-text-xl">Time {teams[0][0]?.name}</h3>
                <h1 className="tw-text-[500px]">{scoreA}</h1>
                <ul className="tw-list-disc">
                  {teams[0].map((player) => (
                    <li key={player.name}>
                      {player.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="tw-flex tw-justify-center tw-bg-rose-400 tw-w-[49vw]" onClick={() => incrementScore(1)}>
              <div className="tw-flex tw-justify-center tw-items-center tw-flex-col tw-h-full tw-gap-10">
                <h3 className="tw-text-xl">Time {teams[1][0]?.name}</h3>
                <h1 className="tw-text-[500px]">{scoreB}</h1>
                <ul className="tw-list-disc">
                  {teams[1].map((player) => (
                    <li key={player.name}>
                      {player.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
    )
}

export default FullScreenScoreboard;