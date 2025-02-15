import { useGameDays } from '../../hooks/use-game-days'
import { VscLoading } from 'react-icons/vsc';
import { useParams, useSearchParams } from 'react-router';
import PlayersTable from '../../components/players-table';
import BackButton from '../../components/back-button';


const HistoryMatch = () => {
  const gameDays = useGameDays();
  const params = useParams();
  const [searchParams] = useSearchParams()

  if(gameDays.isLoading) {
    return <div className='tw-flex-1 tw-flex tw-justify-center tw-items-center'>
      <VscLoading className='tw-animate-spin tw-text-emerald-400 tw-text-6xl' />
    </div>
  }

  const gameDay = gameDays.data?.find(gameDay => gameDay.id === params.id);

  if(!gameDay) {
    return <div
      className='tw-flex-1 tw-flex tw-justify-center tw-items-center tw-text-red-500 tw-text-2xl'
    >
    <p>
      Pelada não encontrada
    </p>
    </div>
  }

  return (
    <>
      <BackButton to={searchParams.get('origin') === 'game-day' ? '/' : '/historico'} />
      <PlayersTable
        gameDay={gameDay}
        legend={false}
        showPlaying={false}
        substitutePlayer={() => {}}
      />
    </>
  )
}

export default HistoryMatch