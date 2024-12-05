import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

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
    }),
    {
      message: "Informe pelo menos um jogador",
    }
  ),
});

export type CreateCourtFormData = z.infer<typeof schema>;

export const useCreateCourtForm = (
  onSubmit: (data: CreateCourtFormData) => Promise<{
    id: string;
    courtId: string;
    joinCode: string;
  } | null>
) => {
  const navigate = useNavigate();
  const form = useForm<CreateCourtFormData>({
    resolver: zodResolver(schema),
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setIsCreating(true);
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
    } finally {
      setIsCreating(false);
    }
  });

  return { form, handleSubmit, isCreating };
};
