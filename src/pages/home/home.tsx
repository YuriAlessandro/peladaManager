import { Link } from "react-router";
import Button, { buttonClasses } from "../../components/button";
import Input from "../../components/input";
import { FaClock, FaPlus } from "react-icons/fa";
import { FaRightToBracket } from "react-icons/fa6";

const Home = () => {
  return (
    <div className="tw-flex-1 tw-flex tw-flex-col tw-gap-5 tw-justify-center tw-max-w-screen-sm tw-mx-auto">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <Link to="/criar-pelada" className={`${buttonClasses} tw-flex-1`}>
          <FaPlus />
          Criar nova pelada
        </Link>
      </div>
      <form className="tw-flex tw-gap-5 tw-items-end">
        <div className="tw-flex tw-flex-col">
          <label htmlFor="match-day-code">Código de pelada existente:</label>
          <Input required id="match-day-code" />
        </div>
        <Button type="submit" className="tw-bg-emerald-400 tw-flex-1 tw-py-[14px]">
          <FaRightToBracket />
          Entrar
        </Button>
      </form>
      <Link
        to="/historico"
        className={`${buttonClasses} tw-bg-gray-100`}
      >
        <FaClock />
        Histórico
      </Link>
    </div>
  );
};

export default Home;
