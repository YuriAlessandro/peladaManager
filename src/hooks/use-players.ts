import useSWR from "swr";
import { api } from "../api";

export const usePlayers = (filters: {
  names?: string[];
} = {}) => {
  const params = new URLSearchParams();
  if(filters.names) {
    params.append("names", filters.names.join(","));
  }
  return useSWR(
    `/players?${params.toString()}`,
    () => api.getPlayers(params) 
  );
};
