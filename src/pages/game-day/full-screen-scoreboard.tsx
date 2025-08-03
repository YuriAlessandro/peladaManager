import { FaExpand } from "react-icons/fa"
import Button from "../../components/button"
import { GameDayPlayer } from "../../types";

type Props = {
  teams: GameDayPlayer[][];
  setIsFullScreen: (isFullScreen: boolean) => void;
  scoreA: number;
  scoreB: number;
  incrementScore: (teamIndex: number) => void;
  maxPoints: number;
};


const FullScreenScoreboard = ({
  setIsFullScreen,
  teams,
  scoreA,
  scoreB,
  incrementScore,
  maxPoints,
}: Props) => {
    const scorePoint = (teamIndex: number) => {
      if (teamIndex === 0 && scoreA + 1 < maxPoints) {
        incrementScore(0);
      }
      else if (teamIndex === 1 && scoreB + 1 < maxPoints) {
        incrementScore(1);
      } else {
        setIsFullScreen(false);
      }
    }

    return (
        <div className="tw-flex tw-h-[90vh]">
          <div className="tw-flex tw-flex-col tw-w-[50%] tw-bg-sky-800 tw-justify-center tw-items-center" onClick={() => scorePoint(1)}>
            <h1 
              className="tw-text-[13rem] tw-font-digital"
              style={{
                textShadow: " 0 0 10px rgba(255, 255, 255, 0.3)",
              }}
            >
              {scoreB.toString().padStart(2, "0")}
            </h1>
            <span>Time {teams[0][0]?.name}</span>
          </div>
          <div className="tw-flex tw-flex-col tw-w-[50%] tw-bg-rose-800 tw-justify-center tw-items-center" onClick={() => scorePoint(0)}>
            <h1
              className="tw-text-[13rem] tw-font-digital"
              style={{
                textShadow: " 0 0 10px rgba(255, 255, 255, 0.3)",
              }}
            >{scoreA.toString().padStart(2, "0")}</h1>
            <span>Time {teams[1][0]?.name}</span>
          </div>
          <div className="tw-flex tw-absolute tw-top-0 tw-right-0 tw-p-4">
            <Button className="tw-text-base tw-gap-2" onClick={() => setIsFullScreen(false)}>
              <FaExpand />
            </Button>
          </div>
        </div>
    )
}

export default FullScreenScoreboard;