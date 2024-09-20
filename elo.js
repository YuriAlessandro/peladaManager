import { Rating, quality, rate } from './lib/true-skill/bundle.js';

const createInitialRating = () => {
  const r = new Rating()
  return {
    mu: r.mu,
    sigma: r.sigma
  }
}

function calculateMatchQuality(teamA, teamB) {
  // Extract players' ratings (mu, sigma) from each team
  const ratingsA = teamA.map(player => new Rating(player.mu, player.sigma));
  const ratingsB = teamB.map(player => new Rating(player.mu, player.sigma));

  // Calculate the match quality
  return quality([ratingsA, ratingsB]);
}

function getAllTeamCombinations(players) {
  const halfSize = Math.floor(players.length / 2);
  
  function* combinations(arr, k) {
    if (k === 0) {
      yield [];
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(i + 1);
      for (const combo of combinations(rest, k - 1)) {
        yield [arr[i], ...combo];
      }
    }
  }

  const allCombinations = Array.from(combinations(players, halfSize));
  const teamPairs = allCombinations.map(teamA => {
    const teamB = players.filter(p => !teamA.includes(p));
    return [teamA, teamB];
  });

  return teamPairs;
}

function findBestTeamMatch(players) {
  const teamCombinations = getAllTeamCombinations(players);
  
  const combinationsWithQuality = teamCombinations.map(([teamA, teamB]) => {
    const matchQuality = calculateMatchQuality(teamA, teamB);
    return { teamA, teamB, matchQuality };
  })

  const sortedCombinations = combinationsWithQuality.sort((a, b) => b.matchQuality - a.matchQuality);
  return sortedCombinations[0];
}

const updateRatings = (victoryTeam, defeatTeam) => {
  const victoryTeamRatings = victoryTeam.map(player => new Rating(player.mu, player.sigma));
  const defeatTeamRatings = defeatTeam.map(player => new Rating(player.mu, player.sigma));
  const [
    victoryTeamRatingsUpdated, 
    defeatTeamRatingsUpdated
  ] = rate([victoryTeamRatings, defeatTeamRatings]);

  return [
    victoryTeam.map((player, i) => ({
      ...player,
      mu: victoryTeamRatingsUpdated[i].mu,
      sigma: victoryTeamRatingsUpdated[i].sigma
    })),
    defeatTeam.map((player, i) => ({
      ...player,
      mu: defeatTeamRatingsUpdated[i].mu,
      sigma: defeatTeamRatingsUpdated[i].sigma
    }))
  ]
}


export { createInitialRating, findBestTeamMatch, updateRatings };