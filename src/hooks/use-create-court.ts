import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../api";
import { findBestTeamMatch } from "../lib/elo";
import { GameDayPlayer, Player } from "../types";
import { useNavigate } from "react-router";
import { useState } from "react";

const toGameDayPlayer = (player: Player, index: number): GameDayPlayer => ({
  name: player.name,
  matches: 0,
  victories: 0,
  defeats: 0,
  lastPlayedMatch: 0,
  playing: true,
  order: index + 1,
});

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

type FormData = z.infer<typeof schema>;

export const useCreateCourtForm = (first = true) => {
  const navigate = useNavigate();
  const form = useForm<FormData>({
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
        return
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
        return
      }

      if (data.playersPerTeam * 2 > data.players.length) {
        form.setError("players", {
          type: "manual",
          message:
            "O número de jogadores é menor que o número de jogadores por time",
        });
        return
      }

      if (!first) {
        console.log("Handle new courts");
        return;
      }

      const players = data.players.map((player) => player.value);
      const playersToFirstMatch = players.slice(0, data.playersPerTeam * 2);
      const bestMatch = findBestTeamMatch(playersToFirstMatch);

      const gameDay = await api.createGameDay({
        maxPoints: data.maxPoints,
        playersPerTeam: data.playersPerTeam,
        players: players.map((p, i) => ({
          ...toGameDayPlayer(p, i),
          mu: p.mu,
          sigma: p.sigma,
        })),
        playingTeams: [
          bestMatch.teamA.map(toGameDayPlayer),
          bestMatch.teamB.map(toGameDayPlayer),
        ],
        matches: 0,
        isLive: true,
        autoSwitchTeamsPoints: data.autoSwitchTeamsPoints ?? 0,
        playedOn: new Date(),

      });
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
