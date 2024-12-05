export type Player = {
  name: string;
  mu: number;
  sigma: number;
};

export type GameDayPlayer = {
  name: string;
  matches: number;
  victories: number;
  defeats: number;
  lastPlayedMatch: number;
  playing: boolean;
  order: number;
};

export type PlayerRating = {
  mu: number;
  sigma: number;
};

export type GameDay = {
  id: string;
  courtId: string;
  maxPoints: number;
  playersPerTeam: number;
  players: (GameDayPlayer & PlayerRating)[];
  isLive: boolean;
  autoSwitchTeamsPoints: number;
  playedOn: Date;
  joinCode: string;
  joinCodeExpiration: Date;
  playersToNextGame: GameDayPlayer[];
  otherPlayingTeams: GameDayPlayer[][];
  matches: number;
  lastMatch: number;
  playingTeams: GameDayPlayer[][];
};
