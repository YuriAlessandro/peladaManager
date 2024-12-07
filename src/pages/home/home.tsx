import { Link, useNavigate } from "react-router";
import Button, { buttonClasses } from "../../components/button";
import Input from "../../components/input";
import { FaClock, FaPlus } from "react-icons/fa";
import { FaRightToBracket } from "react-icons/fa6";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../api";
import { useState } from "react";
import { VscLoading } from "react-icons/vsc";

const schema = z.object({
  matchDayCode: z.string().min(4),
});

type FormData = z.infer<typeof schema>;

const Home = () => {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);

  const onSubmit = async (data: { matchDayCode: string }) => {
    try {
      setIsJoining(true);
      const gameDay = await api.joinGameDay(data.matchDayCode);
      if (!gameDay) return alert("Não foi possível entrar na partida");
      navigate("/pelada");
    } finally {
      setIsJoining(false);
    }
  };

  const matchDayCodeField = form.register("matchDayCode");

  return (
    <div className="tw-flex-1 tw-flex tw-flex-col tw-gap-5 tw-justify-center tw-max-w-screen-sm tw-mx-auto">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <Link to="/criar-pelada" className={`${buttonClasses} tw-flex-1`}>
          <FaPlus />
          Criar nova pelada
        </Link>
      </div>
      <form
        className="tw-flex tw-gap-5 tw-items-end"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="tw-flex tw-flex-col">
          <label htmlFor="match-day-code">Código de pelada existente:</label>
          <Input
            id="match-day-code"
            {...matchDayCodeField}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
              matchDayCodeField.onChange(e);
            }}
          />
        </div>
        <Button
          type="submit"
          className="tw-bg-emerald-400 tw-flex-1 tw-py-[14px]"
        >
          {isJoining ? (
            <VscLoading className="tw-animate-spin" />
          ) : (
            <FaRightToBracket />
          )}
          Entrar
        </Button>
      </form>
      {form.formState.errors.matchDayCode && (
        <p className="tw-text-red-500 tw-text-sm">Código inválido</p>
      )}
      <Link to="/historico" className={`${buttonClasses} tw-bg-gray-100`}>
        <FaClock />
        Histórico
      </Link>
    </div>
  );
};

export default Home;
