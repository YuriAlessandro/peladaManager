import { createInitialRating, findBestTeamMatch, updateRatings } from './elo.js';

const LOCAL_STORAGE_KEY = "matche_days";
const LOCAL_STORAGE_ELO_KEY = "players_elo";

let maxPoints;
let currentMatchMaxPoints;
let playersPerTeam;
let players = [];
let playingTeams = [];
let matches = 0;
let currentId = 0;
let autoSwitchTeamsPoints = 0;

const localStorage = window.localStorage;


function saveOnLocalStorage(isLive = true) {
    const allGames = getFromLocalStorage();

    // Update current game day
    const currentGameDay = allGames.find(gameDay => gameDay.id === currentId);
    if (currentGameDay) {
        currentGameDay.maxPoints = maxPoints;
        currentGameDay.playersPerTeam = playersPerTeam;
        currentGameDay.players = players;
        currentGameDay.playingTeams = playingTeams;
        currentGameDay.matches = matches;
        currentGameDay.isLive = isLive;
        currentGameDay.autoSwitchTeamsPoints = autoSwitchTeamsPoints;
        currentGameDay.playedOn = new Date().toLocaleDateString();

        // Update all games with new curret game day
        const currentGameIndex = allGames.findIndex(gameDay => gameDay.id === currentId);
        allGames[currentGameIndex] = currentGameDay;
    } else {
        allGames.push({
            id: currentId, 
            maxPoints,
            playersPerTeam,
            players,
            playingTeams,
            matches,
            isLive,
            autoSwitchTeamsPoints,
            playedOn: new Date().toLocaleDateString(),
        });
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allGames));
}

function getFromLocalStorage() {
    const gameDays = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

    return gameDays || [];
}

function getRatingsFromStorage(players) {
    const playersElo = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ELO_KEY));
    return players.map(player => {
        return {
            ...player,
            ...playersElo[player.name]
        }
    });
}

function storeUpdatedRatings([updatedVictory, updatedLosing]) {
    const playersElo = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ELO_KEY));
    updatedVictory.forEach(player => {
        playersElo[player.name] = {
            mu: player.mu,
            sigma: player.sigma
        }
    });
    updatedLosing.forEach(player => {
        playersElo[player.name] = {
            mu: player.mu,
            sigma: player.sigma
        }
    });
    localStorage.setItem(LOCAL_STORAGE_ELO_KEY, JSON.stringify(playersElo));
}

function sortPlayers(a, b) {
    if (a.lastPlayedMatch === b.lastPlayedMatch) {
        if (a.matches < b.matches) return -1;
        if (a.matches > b.matches) return 1;
        return 0;
    }
    
    if (a.lastPlayedMatch < b.lastPlayedMatch) return -1;
    if (a.lastPlayedMatch > b.lastPlayedMatch) return 1;

    return 0;
}

$('#dev-mode').change(function() {
    updatePlayerList();
})

function updatePlayerList() {
    $("#players").empty();
    const playersToList = getRatingsFromStorage(players)
        .sort((a, b) => sortPlayers(a, b))

    const devMode = $("#dev-mode").is(":checked");
    if(devMode) {
        $("#elo-header").show();
    } else {
        $("#elo-header").hide();
    }

    playersToList.forEach(player => {
        const playerIsPlayingNow = playingTeams.flat().some(p => p.name === player.name);
        const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        const elo = devMode ? `${formatter.format(player.mu)}/${formatter.format(player.sigma)}` : '';
        $("#players").append(`
            <tr ${playerIsPlayingNow ? 'class="is-selected"' : ''}>
                <th>${player.name}</th>
                <td>${player.matches}</td>
                <td>${player.victories}</td>
                <td>${player.defeats}</td>
                <td>${player.lastPlayedMatch}</td>
                ${devMode ? `<td>${elo}</td>` : ''}
                <td ${!player.playing ? 'class="is-danger remove-player"' : 'class="remove-player"'} style="cursor: pointer">${player.playing ? 'Sim ' : 'Não'} ${playerIsPlayingNow ? '<i class="fa-solid fa-repeat"></i>' : '<i class="fa-solid fa-volleyball"></i>'}</td>
            </tr>`);
    });
}

$("#all-player-list").on("click", ".remove-player", function() {
    const playerName = $(this).parent().find("th").text();
    
    // First check if it's a playing player
    if (playingTeams.flat().some(player => player.name === playerName)) {
        const playerOrder = players.sort((a,b) => sortPlayers(a, b));

        // Get all players that are not playing
        const notOnCurrentMatchPlayers = playerOrder.filter(player => !playingTeams.flat().some(p => p.name === player.name) && player.playing);

        // Get next player not playing on list
        let nextPlayer = notOnCurrentMatchPlayers.find(player => player.name !== playerName);
        if (!nextPlayer) {
            alert("Não há jogadores reservas para substituir.");
            return;
        }

        const confirm = window.confirm(`${playerName} está jogando, deseja substituí-lo? ${nextPlayer.name} será adicionado ao time.`);

        if (confirm) {   
            nextPlayer.playing = true;

            // Find in witch team the player is playing
            const teamIndex = playingTeams.findIndex(team => team.some(player => player.name === playerName));
            const team = playingTeams[teamIndex];
            
            // Remove player from team
            const playerIndex = team.findIndex(player => player.name === playerName);
            team.splice(playerIndex, 1);
            
            // Add nextPlayer to team
            team.push(nextPlayer);
            
            // Update playingTeams
            playingTeams[teamIndex] = team;
            
            updateCurrentMatch(playingTeams);
            
            alert(`${playerName} foi substituído por ${nextPlayer.name}`);
        } else return;
    }

    const playerIndex = players.findIndex(player => player.name === playerName);
    players[playerIndex].playing = !players[playerIndex].playing;

    updatePlayerList();
    saveOnLocalStorage();
});

$("#new-match-day").click(function() {
    $("#new-match-day-form").show();
    $("#new-match-day").hide();
    $("#new-match-day-button").hide();
});

function addPlayerToEloSystem(player) {
    const playersElo = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ELO_KEY));
    if(playersElo[player.name]) return;
    playersElo[player.name] = createInitialRating();
    localStorage.setItem(LOCAL_STORAGE_ELO_KEY, JSON.stringify(playersElo));
}

function addNewPlayer(){
    const playerName = $("#new-player-name").val();

    if (!playerName) {
        alert("Insira um nome para o jogador.");
        return;
    }

    const playerExists = players.some(player => player.name === playerName);
    if (playerExists) {
        alert("Jogador já cadastrado. Escolha outro nome.");
        return;
    }

    const playerOrder = players.length + 1;
    players.push({
        name: playerName,
        order: playerOrder,
        matches: 0,
        victories: 0,
        defeats: 0,
        lastPlayedMatch: 0,
        playing: true,
    });
    addPlayerToEloSystem({ name: playerName });

    $("#player-list").append(`<li>${playerName}</li>`);

    $("#new-player-name").val("");
    updatePlayerList();
}

$("#add-new-player").click(addNewPlayer);
$("input").on("keydown",function search(e) {
    if(e.keyCode == 13) {
        addNewPlayer();
    }
});

function generateTeams(players) {
    const playersWithElo = getRatingsFromStorage(players);
    const bestMatch = findBestTeamMatch(playersWithElo);
    return [
        bestMatch.teamA,
        bestMatch.teamB
    ];
}

function updateCurrentMatch(teams) {
    $("#team-1-players").empty();
    $("#team-2-players").empty();

    $("#new-match-day-form").hide();

    $("#match-number").text(matches + 1);

    $("#team-1-captain").text(`Time ${teams[0][0].name}`);
    teams[0].forEach(player => {
        $("#team-1-players").append(`<li>${player.name}</li>`);
    });


    $("#team-2-captain").text(`Time ${teams[1][0].name}`);
    teams[1].forEach(player => {
        $("#team-2-players").append(`<li>${player.name}</li>`);
    });

    $("#match").show();

    playingTeams = teams;
    updatePlayerList();
}

$("#start-match-day").click(function() {
    $("#end-match-day").show();
    
    const automaticallySwitchTeams = $("#auto-switch-teams").is(":checked");
    if (automaticallySwitchTeams) {
        autoSwitchTeamsPoints = parseInt($("#auto-switch-teams-points").val());

        if (autoSwitchTeamsPoints <= 0 || autoSwitchTeamsPoints === NaN || !autoSwitchTeamsPoints || autoSwitchTeamsPoints === undefined || autoSwitchTeamsPoints === '') { 
            alert("Insira um valor maior que 0 para a troca automática de times.");
            return;
        }

        if (autoSwitchTeamsPoints >= maxPoints) {
            alert("Insira um valor menor que o máximo de pontos.");
            return;
        }
    }

    maxPoints = parseInt($("#max-points").val());
    currentMatchMaxPoints = maxPoints;
    playersPerTeam = $("#players-per-team").val();
    
    if (playersPerTeam * 2 > players.length) {
        alert("Sem jogadores suficientes para começar a partida.");
        return;
    }
    
    $("#all-player-list").show();
    const firstPlayers = players.slice(0, playersPerTeam * 2);


    saveOnLocalStorage();
    updateCurrentMatch(generateTeams(firstPlayers));
    randomServe();
});

$("#update-match-day").click(function() {
    maxPoints = parseInt($("#max-points").val());
    playersPerTeam = $("#players-per-team").val();
    
    if ($("#auto-switch-teams").is(":checked")) autoSwitchTeamsPoints = parseInt($("#auto-switch-teams-points").val());
    else autoSwitchTeamsPoints = 0;

    if (playersPerTeam * 2 > players.length) {
        alert("Sem jogadores suficientes para atualizar a partida.");
        return;
    }

    $("#all-player-list").show();
    $("#match").show();
    $("#new-match-day-form").hide();
    $("#player-list").hide();
    updatePlayerList();
    saveOnLocalStorage();
});

function endMatch(victoryTeam) {
    alert(`Time ${playingTeams[victoryTeam][0].name} venceu a partida!`);
    matches += 1;

    const victoryTeamRating = getRatingsFromStorage(playingTeams[victoryTeam])
    const losingTeamRating = getRatingsFromStorage(playingTeams[1 - victoryTeam])

    const updatedRatings = updateRatings(victoryTeamRating, losingTeamRating);
    storeUpdatedRatings(updatedRatings);

    // Add one match to every player and one victory to each player on winning team
    playingTeams[victoryTeam].forEach(player => {
        const playerIndex = players.findIndex(p => p.name === player.name);
        players[playerIndex].lastPlayedMatch = matches;
        players[playerIndex].matches += 1;
        players[playerIndex].victories += 1;
    });

    // Add one match to every player on losing team
    playingTeams[1 - victoryTeam].forEach(player => {
        const playerIndex = players.findIndex(p => p.name === player.name);
        players[playerIndex].lastPlayedMatch = matches;
        players[playerIndex].matches += 1;
        players[playerIndex].defeats += 1;
    });

    updatePlayerList();
    $("#match").hide();
    saveOnLocalStorage();
}

function findPlayerByName(players, name) {
    return players.find(player => player.name === name);
}

function startNewMatch(winningPlayers, losingPlayers) {
    $("#match").show();
    $("#score-team-1").text("0");
    $("#score-team-2").text("0");

    const notPlayingPlayers = players
        .filter(player => !player.playing);
    let newPlayers = [...winningPlayers];
    let playersToPlay = [];
    let playerList = players
        .sort((a, b) => sortPlayers(a, b))
        .filter(player => !findPlayerByName(winningPlayers, player.name)
            && !findPlayerByName(losingPlayers, player.name)
            && !findPlayerByName(notPlayingPlayers, player.name)); 

    // Is there any players that didn't play yet?
    if (players.length > playersPerTeam * 2) {
        // I have substitutes to play
        playersToPlay = playerList.slice(0, playersPerTeam);
        
        if (playersToPlay.length <= playersPerTeam) {
            newPlayers = newPlayers.concat(playersToPlay);
        } else if (playersToPlay.length > playersPerTeam) {
            // Select random players to play
            for (let i = 0; i < playersPerTeam; i++) {
                const playerIndex = Math.floor(Math.random() * playersToPlay.length);
                const player = playersToPlay[playerIndex];
                if (!findPlayerByName(newPlayers, player.name)) {
                    newPlayers.push(player);
                }
            }
        }
    } else {
        // I don't have substitutes to play, let's just keep playing
        updateCurrentMatch(generateTeams(players));
        return;
    }

    // Remove players that are already playing, get players with less matches but that played the longest time ago
    const sortedPlayers = players
        .filter(player => !findPlayerByName(newPlayers, player.name) 
            && !findPlayerByName(winningPlayers, player.name) 
            && !findPlayerByName(playerList, player.name) 
            && !findPlayerByName(notPlayingPlayers, player.name))
        .sort((a, b) => sortPlayers(a, b))
        .slice(0, (playersPerTeam * 2) - newPlayers.length);

    while (newPlayers.length < playersPerTeam * 2) {
        // Just to be sure, remove any duplicates
        newPlayers = newPlayers.filter((player, index, self) => self.findIndex(p => p.name === player.name) === index);

        const playerIndex = Math.floor(Math.random() * sortedPlayers.length);
        const player = sortedPlayers[playerIndex];

        if (!findPlayerByName(newPlayers, player.name)) {
            newPlayers.push(player);
        }
    }

    currentMatchMaxPoints = maxPoints;
    randomServe();
    updateCurrentMatch(generateTeams(newPlayers));
    saveOnLocalStorage();
}

function randomServe() {
    // Choose a random team to start serve
    const teamIndex = Math.floor(Math.random() * 2);
    if (teamIndex === 0) {
        $("#serving-1").show();
        $("#serving-2").hide();
    } else {
        $("#serving-1").hide();
        $("#serving-2").show();
    }
}

$(".score-point").click(function() {
    const teamIndex = $(this).attr("id");
    
    let team1Score = parseInt($("#score-team-1").text());
    let team2Score = parseInt($("#score-team-2").text());

    if (teamIndex === "score-1") {
        team1Score += 1;
        $("#score-team-1").text(team1Score);
        $("#serving-1").show();
        $("#serving-2").hide();
    } else if (teamIndex === "score-2") {
        team2Score += 1;
        $("#score-team-2").text(team2Score);
        $("#serving-1").hide();
        $("#serving-2").show();
    }

    const diff = Math.abs(team1Score - team2Score);

    if ((team1Score === currentMatchMaxPoints || team2Score === currentMatchMaxPoints) && diff < 2) {
        currentMatchMaxPoints += 1;
    }
    
    if (team1Score >= currentMatchMaxPoints && diff >= 2) {
        endMatch(0);
        startNewMatch(playingTeams[0], playingTeams[1]);
    } else if (team2Score >= currentMatchMaxPoints && diff >= 2) {
        endMatch(1);
        startNewMatch(playingTeams[1], playingTeams[0]);
    }

    if (autoSwitchTeamsPoints > 0) {
        const totalPoints = team1Score + team2Score;
        if (totalPoints % autoSwitchTeamsPoints === 0) swapTeams();
    }

    saveOnLocalStorage();
});

$(".undo-point").click(function() {
    const teamIndex = $(this).attr("id");
    
    let team1Score = parseInt($("#score-team-1").text());
    let team2Score = parseInt($("#score-team-2").text());

    if (teamIndex === "undo-1") {
        team1Score -= 1;
        $("#score-team-1").text(team1Score >= 0 ? team1Score : 0);
    } else if (teamIndex === "undo-2") {
        team2Score -= 1;
        $("#score-team-2").text(team2Score >= 0 ? team2Score : 0);
    }

    saveOnLocalStorage();
});

function getPlayersByWinPercentage() {
    return players.sort((a, b) => {
        const aPercentage = a.victories / a.matches;
        const bPercentage = b.victories / b.matches;

        if (aPercentage < bPercentage) return 1;
        if (aPercentage > bPercentage) return -1;
        return 0;
    });
}

function showFinalPlayerList(playersToDisplay) {
    $("#playing").hide();
    $("#players").empty();
    playersToDisplay.forEach(player => {
        $("#players").append(`
            <tr>
                <th>${player.name}</th>
                <td>${player.matches}</td>
                <td>${player.victories}</td>
                <td>${player.defeats}</td>
                <td>${player.lastPlayedMatch}</td>
            </tr>`);
    });
}

$("#end-match-day").click(function() {
    const confirm = window.confirm("Deseja realmente encerrar o dia de jogos?");

    if (confirm) {
        saveOnLocalStorage(false);
        $("#new-match-day").hide();
        $("#new-match-day-form").hide();
        $("#match").hide();
        $(this).hide();
        const playersByWinPercentage = getPlayersByWinPercentage();
        showFinalPlayerList(playersByWinPercentage);
    }

});

$("#change-match-day").click(function() {
    $("#player-list").empty();
    $("#new-match-day-form").show();
    $("#player-list").show();
    $("#new-match-day").hide();
    $("#match").hide();
    $("#all-player-list").hide();
    $("#start-match-day").hide();
    $("#update-match-day").show();

    players.forEach(player => {
        $("#player-list").append(`<li>${player.name}</li>`);
    });

    $("#players-per-team").val(playersPerTeam);
    $("#max-points").val(maxPoints);
});

$("#end-current-match").click(function() {
    let team1Score = parseInt($("#score-team-1").text());
    let team2Score = parseInt($("#score-team-2").text());

    if (team1Score === team2Score) {
        alert("Partida empatada, não é possível encerrar. Decida um vencedor.");
        return;
    }

    const winningTeam = team1Score > team2Score ? 0 : 1;
    const losingTeam = 1 - winningTeam;
    
    const confirm = window.confirm("Deseja realmente encerrar a partida?");
    if (confirm) {
        startNewMatch(playingTeams[winningTeam], playingTeams[losingTeam]);
    }

    saveOnLocalStorage();
});

function swapTeams() {
    const temp = playingTeams[0];
    playingTeams[0] = playingTeams[1];
    playingTeams[1] = temp;

    // Revert scores
    const team1Score = $("#score-team-1").text();
    const team2Score = $("#score-team-2").text();
    $("#score-team-1").text(team2Score);
    $("#score-team-2").text(team1Score);

    if ($("#score-1").hasClass('is-info')) {
        $("#score-1").removeClass('is-info').addClass('is-danger');
        $("#score-2").removeClass('is-danger').addClass('is-info');
    } else {
        $("#score-1").removeClass('is-danger').addClass('is-info');
        $("#score-2").removeClass('is-info').addClass('is-danger');
    }

    alert('Times invertidos!');
    updateCurrentMatch(playingTeams);
    saveOnLocalStorage();
}

$("#swap-current-match").click(function() {
    swapTeams();
});

$("#auto-switch-teams").click(function() {
    const checked = $(this).is(":checked");

    if (checked) {
        $("#auto-switch-teams-points").removeAttr('disabled');
    } else {
        $("#auto-switch-teams-points").attr('disabled','disabled');
    }
});

$("#show-historic").click(function() {
    $("#history-container").show();
    $("#new-match-day-button").hide();

    const gameDays = getFromLocalStorage().sort((a, b) => b.id - a.id);
    $("#historic").empty();
    
    gameDays.forEach(gameDay => {
        $("#historic-days").append(`
            <div class='cell match-historic' id='${gameDay.id}'>
                <button class='button is-large'>[${gameDay.id}] Jogo de ${gameDay.playedOn || new Date("2024-09-07").toLocaleString()}</button>
            </div>`);
    });
});

$("#historic-days").on("click", ".match-historic", function() {
    const gameId = $(this).attr("id");
    const gameDays = getFromLocalStorage();
    const gameDay = gameDays.find(gameDay => gameDay.id == gameId);

    maxPoints = gameDay.maxPoints;
    playersPerTeam = gameDay.playersPerTeam;
    players = gameDay.players;
    playingTeams = gameDay.playingTeams;
    matches = gameDay.matches;
    currentId = gameDay.id;

    updatePlayerList();

    const playersByWinPercentage = getPlayersByWinPercentage();

    $("#history-container").hide();
    $("#all-player-list").show();
    showFinalPlayerList(playersByWinPercentage);
});

function initEloSystem(players) {
    const playersElo = {}
    players.forEach(player => {
        const rating = createInitialRating();
        playersElo[player.name] = rating;
    })
    localStorage.setItem(LOCAL_STORAGE_ELO_KEY, JSON.stringify(playersElo));
}

$(document).ready(function (){
    const gameDays = getFromLocalStorage();
    const hasElo = localStorage.getItem(LOCAL_STORAGE_ELO_KEY);

    if(!hasElo) {
        initEloSystem(gameDays.flatMap(gameDay => gameDay.players));
    }

    if (gameDays.length > 0) {
        const lastGameDay = gameDays[gameDays.length - 1];

        if (lastGameDay.isLive) {
            maxPoints = lastGameDay.maxPoints;
            playersPerTeam = lastGameDay.playersPerTeam;
            players = lastGameDay.players;
            playingTeams = lastGameDay.playingTeams;
            matches = lastGameDay.matches;
            currentId = lastGameDay.id;
            
            currentMatchMaxPoints = maxPoints;
            updatePlayerList();
            updateCurrentMatch(playingTeams);
            $("#new-match-day").hide();
            $("#new-match-day-form").hide();
            $("#new-match-day-button").hide();
            $("#match").show();
            $("#all-player-list").show();
            $("#end-match-day").show();

            return;
        }
    }

    currentId = gameDays.length + 1;
});
