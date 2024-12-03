import useSWR from "swr";
import { api } from "../api";

export const useGameDays = () => useSWR("/game-days", api.getGameDays);
