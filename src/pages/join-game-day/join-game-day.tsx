// import { useParams } from "react-router";
// import CreateCourtForm from "../../components/create-court-form";
// import { CreateCourtFormData } from "../../hooks/use-create-court";
// import { findBestTeamMatch } from "../../lib/elo";
// import { useActiveGameDay } from "../../hooks/use-active-game-day";

// const JoinGameDay = () => {
//     const gameDay = useActiveGameDay()

//     const onSubmit = async (data: CreateCourtFormData) => {
//     const players = data.players.map((player) => player.value);
//     const playersToFirstMatch = players.slice(0, data.playersPerTeam * 2);
//     const bestMatch = findBestTeamMatch(playersToFirstMatch);

//     const gameDay = await api.createGameDay({
//       maxPoints: data.maxPoints,
//       playersPerTeam: data.playersPerTeam,
//       players: players.map((p, i) => ({
//         ...toGameDayPlayer(p, i),
//         mu: p.mu,
//         sigma: p.sigma,
//       })),
//       playingTeams: [
//         bestMatch.teamA.map(toGameDayPlayer),
//         bestMatch.teamB.map(toGameDayPlayer),
//       ],
//       matches: 0,
//       isLive: true,
//       autoSwitchTeamsPoints: data.autoSwitchTeamsPoints ?? 0,
//       playedOn: new Date(),
//     });


//   return <CreateCourtForm />
// };

// export default JoinGameDay;
