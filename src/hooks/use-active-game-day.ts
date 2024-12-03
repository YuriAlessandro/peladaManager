import useSWR from "swr";
import { api } from "../api";

export const useActiveGameDay = () => useSWR("/sessions/game-day", () => api.getActiveGameDay());