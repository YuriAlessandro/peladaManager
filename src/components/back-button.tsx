import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router";

type Props = {
  to?: string
}

const BackButton = ({to}: Props) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to ?? -1 as unknown as string)}
      className="tw-flex tw-self-start tw-justify-center tw-items-center tw-gap-2
        tw-py-3 tw-px-5 tw-rounded-xl
      "
    >
      <FaArrowLeft />
      Voltar
    </button>
  );
};

export default BackButton;
