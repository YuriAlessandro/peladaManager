import { useState } from 'react';
import { useGameDays } from '../../hooks/use-game-days'
import { VscLoading } from 'react-icons/vsc';
import { FaRedo } from 'react-icons/fa';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import PlayersTable from '../../components/players-table';
import BackButton from '../../components/back-button';
import Button from '../../components/button';
import { api } from '../../api';


const HistoryMatch = () => {
  const gameDays = useGameDays();
  const params = useParams();
  const [searchParams] = useSearchParams()
  const navigate = useNavigate();
  const [isRestarting, setIsRestarting] = useState(false);

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

  const handleRestartGameDay = async () => {
    const confirm = window.confirm("Deseja recuperar esta pelada?");
    if (!confirm) return;

    setIsRestarting(true);
    try {
      const result = await api.restartGameDay(gameDay.id);
      if (!result) {
        alert("Erro ao recuperar a pelada");
        return;
      }
      navigate('/pelada');
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <>
      <BackButton to={searchParams.get('origin') === 'game-day' ? '/' : '/historico'} />
      <PlayersTable
        gameDay={gameDay}
        legend={false}
        showPlaying={false}
        substitutePlayer={() => {}}
      />
      <Button
        onClick={handleRestartGameDay}
        disabled={isRestarting}
        className="tw-bg-amber-400 tw-gap-2 tw-text-base tw-font-medium"
      >
        {isRestarting ? <VscLoading className="tw-animate-spin" /> : <FaRedo />}
        Recuperar Pelada
      </Button>
    </>
  )
}

export default HistoryMatch