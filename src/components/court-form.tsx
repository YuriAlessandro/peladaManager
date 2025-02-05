import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { api } from "../api";
import { usePlayers } from "../hooks/use-players";
import { createInitialRating } from "../lib/elo";
import BackButton from "./back-button";
import Input from "./input";
import Select from "./select";

const schema = z.object({
  playersPerTeam: z
    .number({ coerce: true, message: "Informe um número maior que 0" })
    .min(1, { message: "Informe um número maior que 0" }),
  maxPoints: z
    .number({ coerce: true, message: "Informe um número maior que 0" })
    .min(1, { message: "Informe um número maior que 0" }),
  autoSwitchTeams: z.boolean().optional(),
  autoSwitchTeamsPoints: z.number({ coerce: true }).optional(),
  players: z.array(
    z.object({
      value: z.object({ name: z.string(), mu: z.number(), sigma: z.number() }),
      label: z.string(),
      __isNew__: z.boolean().optional(),
      isFixed: z.boolean().optional(),
    }),
    {
      message: "Informe pelo menos um jogador",
    }
  ),
});

export type CourtFormData = z.infer<typeof schema>;

type Props = {
  onSubmit: (data: CourtFormData) => Promise<boolean>;
  submitButton: (isSubmitting: boolean) => React.ReactNode;
  initialValues?: CourtFormData;
};

const CourtForm = ({ onSubmit, submitButton, initialValues }: Props) => {
  const players = usePlayers();
  const navigate = useNavigate();
  const form = useForm<CourtFormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      if (data.autoSwitchTeams && !data.autoSwitchTeamsPoints) {
        form.setError("autoSwitchTeamsPoints", {
          type: "manual",
          message: "Informe o número de pontos para trocar de time",
        });
        return;
      }

      if (
        data.autoSwitchTeamsPoints &&
        data.autoSwitchTeamsPoints >= data.maxPoints
      ) {
        form.setError("autoSwitchTeamsPoints", {
          type: "manual",
          message:
            "O número de pontos para trocar de time deve ser menor que o máximo de pontos",
        });
        return;
      }

      if (data.playersPerTeam * 2 > data.players.length) {
        form.setError("players", {
          type: "manual",
          message:
            "O número de jogadores é menor que o número de jogadores por time",
        });
        return;
      }

      const gameDay = await onSubmit(data);

      if (!gameDay) {
        form.setError("root", {
          type: "manual",
          message: "Erro ao criar jogo",
        });
      }

      navigate("/pelada");
    } catch (e) {
      console.error(e);
    }
  });

  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const options =
    players.data
      ?.map((player) => ({
        value: player,
        label: player.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];
  const selectedPlayers = form.watch("players");

  const onCreateOption = async (name: string) => {
    try {
      form.clearErrors("players");
      setIsCreatingPlayer(true);
      const newPlayer = { name, ...createInitialRating() };
      const ok = await api.putPlayer(newPlayer);
      if (!ok) {
        form.setError("players", {
          type: "manual",
          message: `Erro ao criar jogador ${name}`,
        });
        return;
      }
      await players.mutate();
      form.setValue("players", [
        ...(selectedPlayers ?? []),
        { value: newPlayer, label: newPlayer.name },
      ]);
    } finally {
      setIsCreatingPlayer(false);
    }
  };

  const autoSwitchTeams = form.watch("autoSwitchTeams");

  return (
    <form className="tw-flex tw-flex-col tw-gap-5" onSubmit={handleSubmit}>
      <BackButton />
      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-2">
        <div className="tw-flex-1 tw-flex tw-flex-col">
          <label htmlFor="playersPerTeam">Jogadores por time:</label>
          <Input
            id="playersPerTeam"
            type="number"
            {...form.register("playersPerTeam")}
          />
          {form.formState.errors.playersPerTeam && (
            <span className="tw-text-red-500">
              {form.formState.errors.playersPerTeam.message}
            </span>
          )}
        </div>
        <div className="tw-flex-1 tw-flex tw-flex-col">
          <label htmlFor="maxPoints">Pontos máximos:</label>
          <Input id="maxPoints" type="number" {...form.register("maxPoints")} />
          {form.formState.errors.maxPoints && (
            <span className="tw-text-red-500">
              {form.formState.errors.maxPoints.message}
            </span>
          )}
        </div>
      </div>
      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-2">
        <div className="tw-flex-1 tw-flex tw-items-center tw-gap-2">
          <Input
            id="autoSwitchTeams"
            type="checkbox"
            className="tw-w-6 tw-h-6"
            {...form.register("autoSwitchTeams")}
          />
          <label htmlFor="autoSwitchTeams" className="tw-text-2xl">
            Trocar times automaticamente:
          </label>
          {form.formState.errors.autoSwitchTeams && (
            <span className="tw-text-red-500">
              {form.formState.errors.autoSwitchTeams.message}
            </span>
          )}
        </div>
        <div className="tw-flex-1 tw-flex tw-flex-col">
          <label htmlFor="autoSwitchTeamsPoints">
            Trocar times a cada x pontos:
          </label>
          <Input
            id="autoSwitchTeamsPoints"
            type="number"
            disabled={!autoSwitchTeams}
            {...form.register("autoSwitchTeamsPoints")}
          />
          {form.formState.errors.autoSwitchTeamsPoints && (
            <span className="tw-text-red-500">
              {form.formState.errors.autoSwitchTeamsPoints.message}
            </span>
          )}
        </div>
      </div>
      <div className="tw-flex">
        <div className="tw-flex-1">
          <label>Selecione os jogadores</label>
          <Controller
            render={({ field }) => (
              <Select
                {...field}
                onCreateOption={onCreateOption}
                onChange={(value) => {
                  field.onChange(value);
                  form.clearErrors("players");
                }}
                options={options}
                isDisabled={isCreatingPlayer}
                getOptionValue={(option) =>
                  (option as { value: { name: string } }).value.name
                }
                isMulti
                isSearchable
                closeMenuOnSelect={false}
                isClearable
                placeholder="Selecione os jogadores"
                noOptionsMessage={() => "Digite para criar novo jogador"}
              />
            )}
            name="players"
            control={form.control}
          />
          {form.formState.errors.players && (
            <span className="tw-text-red-500">
              {form.formState.errors.players.message}
            </span>
          )}
        </div>
      </div>
      {submitButton(form.formState.isSubmitting)}
    </form>
  );
};

export default CourtForm;
