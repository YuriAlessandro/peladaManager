import { GameDay, Player } from "./types";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://plankton-app-xoik3.ondigitalocean.app";

const putPlayer = async (player: Player) => {
  try {
    const res = await fetch(`${API_URL}/players/`, {
      body: JSON.stringify(player),
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      method: "PUT",
    });
    return res.ok;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const updatePlayers = async (players: Player[]) => {
  try {
    const res = await fetch(`${API_URL}/players/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(players),
      credentials: "include",
    });
    return res.ok;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getPlayers = async (params: URLSearchParams) => {
  try {
    const res = await fetch(`${API_URL}/players?${params.toString()}`, {
      credentials: "include",
    });
    const players = (await res.json()) as Player[];
    return players;
  } catch (error) {
    console.error(error);
    return [];
  }
};

type OmitProps =
  | "id"
  | "otherPlayingTeams"
  | "lastMatch"
  | "joinCode"
  | "joinCodeExpiration"
  | 'courtId'
  | "playersToNextGame";

export type CreateGameDayParams =  Omit<GameDay, OmitProps>

const createGameDay = async (gameDay: CreateGameDayParams) => {
  try {
    const res = await fetch(`${API_URL}/game-days`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gameDay),
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id: string;
      courtId: string;
      joinCode: string;
    };
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

type UpdateGameDayOmitProps = 'id' | 'courtId' | 'joinCode' | 'joinCodeExpiration' | 'otherPlayingTeams' | 'lastMatch';

const updateGameDay = async (gameDay: Omit<GameDay, UpdateGameDayOmitProps>) => {
  
  try {
    const res = await fetch(`${API_URL}/sessions/game-day`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gameDay),
      credentials: "include",
    });
    return res.ok;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getActiveGameDay = async () => {
  try {
    const res = await fetch(`${API_URL}/sessions/game-day`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const gameDay = (await res.json()) as GameDay;
    return gameDay;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getGameDays = async () => {
  try {
    const res = await fetch(`${API_URL}/game-days`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const gameDays = (await res.json()) as GameDay[];
    return gameDays;
  } catch (error) {
    console.error(error);
    return [];
  }
};

async function joinGameDay(joinCode: string) {
  try {
    const response = await fetch(`${API_URL}/game-days/join/${joinCode}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (!response.ok) {
      return false;
    }
    return (await response.json()) as GameDay
  } catch {
    return false;
  }
}

async function leaveGameDay() {
  try {
    const response = await fetch(`${API_URL}/sessions/game-day/leave`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function transferGameDay(joinCode: string) {
  try {
    const response = await fetch(`${API_URL}/game-days/transfer/${joinCode}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (!response.ok) {
      return false;
    }
    return (await response.json()) as GameDay
  } catch {
    return false;
  }
}

export const api = {
  getPlayers,
  updatePlayers,
  putPlayer,
  createGameDay,
  getActiveGameDay,
  updateGameDay,
  getGameDays,
  joinGameDay,
  leaveGameDay,
  transferGameDay,
};
