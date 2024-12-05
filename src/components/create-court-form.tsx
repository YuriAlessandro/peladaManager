import { useState } from "react";
import { Controller } from "react-hook-form";
import { FaVolleyball } from "react-icons/fa6";
import { VscLoading } from "react-icons/vsc";
import { api } from "../api";
import {
  CreateCourtFormData,
  useCreateCourtForm,
} from "../hooks/use-create-court";
import { usePlayers } from "../hooks/use-players";
import { createInitialRating } from "../lib/elo";
import BackButton from "./back-button";
import Button from "./button";
import Input from "./input";
import Select from "./select";

type Props = {
  onSubmit: (data: CreateCourtFormData) => Promise<{
    id: string;
    courtId: string;
    joinCode: string;
  } | null>;
};

const CreateCourtForm = ({ onSubmit }: Props) => {
  const players = usePlayers();
  const { form, handleSubmit, isCreating } = useCreateCourtForm(onSubmit);
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

  console.log('errors', form.formState.errors)

  const autoSwitchTeams = form.watch("autoSwitchTeams");
  return (
    <form className="tw-flex tw-flex-col tw-gap-5" onSubmit={handleSubmit}>
      <BackButton />
      <div className="tw-flex tw-gap-2">
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
      <div className="tw-flex tw-gap-2">
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

      <Button className="tw-gap-2" disabled={isCreating} type="submit">
        {isCreating ? (
          <VscLoading className="tw-animate-spin" />
        ) : (
          <FaVolleyball />
        )}{" "}
        Iniciar pelada
      </Button>
    </form>
  );
};

export default CreateCourtForm;
