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

  function* combinations(arr, k, start = 0) {
    if (k === 0) {
      yield [];
      return;
    }
    for (let i = start; i <= arr.length - k; i++) {
      for (const combo of combinations(arr, k - 1, i + 1)) {
        yield [arr[i], ...combo];
      }
    }
  }

  const teamPairs = [];
  const seenCombinations = new Set(); // Armazena as combinações vistas

  for (const teamA of combinations(players, halfSize)) {
    const teamB = players.filter(p => !teamA.includes(p));

    // Cria uma chave única ordenando os dois times internamente e comparando-os em conjunto
    const sortedTeams = [teamA.map(p => p.name).sort(), teamB.map(p => p.name).sort()].sort();
    const key = JSON.stringify(sortedTeams);

    if (!seenCombinations.has(key)) {
      teamPairs.push([teamA, teamB]);
      seenCombinations.add(key); // Armazena a combinação única
    }
  }

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