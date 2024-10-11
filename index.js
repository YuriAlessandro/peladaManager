import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { createInitialRating, findBestTeamMatch, updateRatings } from './elo.js';
const LOCAL_STORAGE_ELO_KEY = "players_elo";
const LOCAL_STORAGE_KEY = "matche_days";
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://volei-api.herokuapp.com'

const socket = io(API_URL);
let maxPoints;
let currentMatchMaxPoints;
let playersPerTeam;
let players = [];
let playingTeams = [];
let otherPlayingTeams = [];
let matches = 0;
let currentId = 0;
let autoSwitchTeamsPoints = 0;
let joinCode = '';
let courtId = null
const localStorage = window.localStorage;

socket.on('game-day:updated',  async () => {
    const activeGame = await getActiveGameDay();
    if(!activeGame) {
        currentId = null;
        renderEndGameDay();
        return
    }

    maxPoints = activeGame.maxPoints;
    playersPerTeam = activeGame.playersPerTeam;
    players = activeGame.players;
    playingTeams = activeGame.playingTeams;
    otherPlayingTeams = activeGame.otherPlayingTeams;
    matches = activeGame.matches;
    currentId = activeGame.id;
    joinCode = activeGame.joinCode;
    courtId = activeGame.courtId || null

    if(playingTeams.length === 0) {
        playingTeams = await generateTeams(players);
    }
    
    currentMatchMaxPoints = maxPoints;
    updateCurrentMatch(playingTeams);
    $("#new-match-day").hide();
    $("#new-match-day-form").hide();
    $("#new-match-day-button").hide();
    $("#match").show();
    $("#all-player-list").show();
    $("#end-match-day").show();
})

async function getActiveGameDay() {
    try {
        const response = await fetch(`${API_URL}/sessions/game-day`, {
            credentials: 'include'
        });
        if(!response.ok) {
            return null;
        }
        return await response.json();
    } catch {
        return null
    }
}

async function createNewGameDay(isLive = true) {
    try {
        const newGame = {
            maxPoints,
            playersPerTeam,
            players,
            playingTeams,
            matches,
            isLive,
            autoSwitchTeamsPoints,
            playedOn: new Date(),
        }
        const response = await fetch(`${API_URL}/game-days`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(newGame)
        });
        const data = await response.json();
        newGame.id = data.id;
        currentId = data.id;
        joinCode = data.joinCode;
        return newGame;
    } catch {
        return null
    }
}

async function joinGameDay(joinCode) {
    try {
        const response = await fetch(`http://localhost:4000/game-days/join/${joinCode}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
        });
        if(!response.ok) {
            return false;
        }
        return await response.json();
    } catch {
        return false
    }
}

async function updateGameDay(isLive = true) {
    try {
        const response = await fetch(`http://localhost:4000/sessions/game-day`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                maxPoints,
                playersPerTeam,
                playingTeams,
                players,
                matches,
                isLive,
                autoSwitchTeamsPoints,
                playedOn: new Date()
            })
        })

        if(response.ok){
            socket.emit("game-day:updated", currentId);
        }

        return response.ok;
    } catch {
        return false
    }
}



async function upsertGameDay(isLive = true) {
    if(!currentId) {
        return createNewGameDay(isLive)
    }
    
    return updateGameDay(isLive)
}

async function getGameDays() {
    const response = await fetch(`${API_URL}/game-days`, {
        credentials: 'include'
    });
    return await response.json();
}

async function getRatingsFromStorage(players) {
    const names = players.map(player => player.name).join(',');
    const params = new URLSearchParams();
    params.append('name', names);
    const response = await fetch(`http://localhost:4000/players?${params.toString()}`, {
        credentials: 'include'
    });
    const ratings = await response.json();
    return players.map(player_1 => {
        const rating = ratings.find(rating_1 => rating_1.name === player_1.name);
        return {
            ...player_1,
            ...rating
        };
    });
}

function storeUpdatedRatings([updatedVictory, updatedLosing]) {
    const players = [...updatedVictory, ...updatedLosing]
    .map(player => ({
        name: player.name,
        mu: player.mu,
        sigma: player.sigma
    }));
    
    return fetch(`${API_URL}/players/bulk`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(players)
    })
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

$("#join-code-input").on("input", function search(e) {
    $("#join-code-input").val(e.target.value.toUpperCase());
})

$("#join-match-day-form").submit(async function(e) {
    e.preventDefault();
    const joinInputVal = $("#join-code-input").val();
    const data = await joinGameDay(joinInputVal);
    if(!data) {
        alert("Código inválido");
        return;
    }
    courtId = data.courtId
    maxPoints = data.maxPoints;
    playersPerTeam = data.playersPerTeam;
    players = data.players;
    playingTeams = data.playingTeams;
    otherPlayingTeams = data.otherPlayingTeams;
    matches = data.matches;
    joinCode = data.joinCode;
    currentId = data.id;
    $('#players-per-team').val(playersPerTeam);
    $('#max-points').val(maxPoints);
    $('#auto-switch-teams-points').val(data.autoSwitchTeamsPoints);
    $('#auto-switch-teams').prop('checked', data.autoSwitchTeamsPoints > 0);
    $("#new-match-day-form").show();
    $("#new-match-day-button").hide();
    players.forEach(player => {
        $("#player-list").append(`<li>${player.name}</li>`);
    })
})

async function updatePlayerList() {
    $("#players").empty();
    const playersToList = (await getRatingsFromStorage(players))
    .sort((a, b) => sortPlayers(a, b))
    const devMode = $("#dev-mode").is(":checked");
    if(devMode) {
        $("#elo-header").show();
    } else {
        $("#elo-header").hide();
    }
    
    const rows = playersToList.map(player => {
        const isPlayingHere = playingTeams.flat().some(p => p.name === player.name);
        const isPlayingSomewhereElse = otherPlayingTeams.flat().some(p => p.name === player.name);
        const rowClass = isPlayingHere ? 'is-selected' : isPlayingSomewhereElse ? 'is-selected is-warning' : '';
        const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        const elo = devMode ? `${formatter.format(player.mu)}/${formatter.format(player.sigma)}` : '';
        const playingClass = isPlayingSomewhereElse
            ? ''
            : player.playing
                ? 'remove-player is-clickable'
                : 'is-danger remove-player is-clickable';
        return `
        <tr class="${rowClass}">
            <th>${player.name}</th>
            <td>${player.matches}</td>
            <td>${player.victories}</td>
            <td>${player.defeats}</td>
            <td>${player.lastPlayedMatch}</td>
            ${devMode ? `<td>${elo}</td>` : ''}
            <td class="${playingClass}">
                ${player.playing 
                    ? 'Sim ' 
                    : 'Não'
                } ${isPlayingSomewhereElse || !isPlayingHere 
                    ? '<i class="fa-solid fa-volleyball"></i>' 
                    : '<i class="fa-solid fa-repeat"></i>' 
                }</td>
        </tr>`
    }).join('');
    
    $("#players").html(rows)
}

$("#all-player-list").on("click", ".remove-player", async function() {
    const playerName = $(this).parent().find("th").text();
    
    // First check if it's a playing player
    const allPlaying = playingTeams.flat().concat(otherPlayingTeams.flat());
    if (allPlaying.some(player => player.name === playerName)) {
        const playerOrder = players.sort((a,b) => sortPlayers(a, b));
        
        // Get all players that are not playing
        const notOnCurrentMatchPlayers = playerOrder
        .filter(player => !allPlaying.some(p => p.name === player.name) && player.playing);
        
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
    
    await updatePlayerList();
    await upsertGameDay();
});

$("#new-match-day").click(function() {
    $("#new-match-day-form").show();
    $("#new-match-day-button").hide();
});

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
    const newPlayer = {
        name: playerName,
        matches: 0,
        victories: 0,
        defeats: 0,
        lastPlayedMatch: 0,
        playing: true,
        order: playerOrder,
    }
    
    players.push(newPlayer);
    
    $("#player-list").append(`<li>${playerName}</li>`);
    
    $("#new-player-name").val("");
    updatePlayerList();
    return fetch(`${API_URL}/players`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            name: playerName,
            ...createInitialRating()
        })
    })
}

$("#add-new-player").click(addNewPlayer);
$("input").on("keydown",function search(e) {
    if(e.keyCode == 13) {
        addNewPlayer();
    }
});

async function generateTeams(players) {
    const playersWithElo = await getRatingsFromStorage(players);
    const bestMatch = findBestTeamMatch(playersWithElo);
    return [
        bestMatch.teamA,
        bestMatch.teamB
    ];
}

async function updateCurrentMatch(teams) {
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

    $("#join-code").text(joinCode);
    $("#match").show();
    
    playingTeams = teams;
    await updatePlayerList();
}

$("#start-match-day").click(async function() {
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
    
    const playersInOtherTeams = otherPlayingTeams.flat();
    const firstPlayers = players
    .filter(p => !findPlayerByName(playersInOtherTeams, p.name))
    .slice(0, playersPerTeam * 2);
    if(firstPlayers.length < playersPerTeam * 2) {
        alert("Não há jogadores suficientes para começar a partida.");
        return;
    }
    await upsertGameDay();
    updateCurrentMatch(await generateTeams(firstPlayers));
    await upsertGameDay();
    randomServe();
    socket.emit('join', currentId);
    $("#all-player-list").show();

});

$("#copy-join-code").click(function() {
    const joinCode = $("#join-code").text();
    navigator.clipboard.writeText(joinCode);
    alert("Código copiado para a área de transferência.");
});

$("#update-match-day").click(async function() {
    maxPoints = parseInt($("#max-points").val());
    currentMatchMaxPoints = maxPoints;
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
    await updatePlayerList();
    await upsertGameDay();
});

async function endMatch(victoryTeam) {
    alert(`Time ${playingTeams[victoryTeam][0].name} venceu a partida!`);
    matches += 1;
    
    const victoryTeamRating =  await getRatingsFromStorage(playingTeams[victoryTeam])
    const losingTeamRating = await getRatingsFromStorage(playingTeams[1 - victoryTeam])
    
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
    
    
    $("#match").hide();
}

function findPlayerByName(players, name) {
    return players.find(player => player.name === name);
}

function findAvailablePlayers(winners) {
    return players
    .filter(player => player.playing)
    .filter(player => !findPlayerByName(winners, player.name))
    .filter(player => !findPlayerByName(otherPlayingTeams.flat(), player.name))
}

function findNextMatchPlayers(winners, losers) {
    const notPlayingPlayers = players
    .filter(player => !player.playing);
    let newPlayers = [...winners];
    let playersToPlay = [];
    let playerList = players
    .sort((a, b) => sortPlayers(a, b))
    .filter(player => !findPlayerByName(winners, player.name)
    && !findPlayerByName(losers, player.name)
    && !findPlayerByName(notPlayingPlayers, player.name)
    && !findPlayerByName(otherPlayingTeams.flat(), player.name));
    
    // Is there any players that didn't play yet?
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
    
    // Remove players that are already playing, get players with less matches but that played the longest time ago
    const sortedPlayers = findAvailablePlayers(winners)
        .slice(0, (playersPerTeam * 2) - newPlayers.length);
    
    while (newPlayers.length < playersPerTeam * 2) {
        // Just to be sure, remove any duplicates
        newPlayers = newPlayers.filter((player, index, self) => self.findIndex(p => p.name === player.name) === index);
        
        const playerIndex = Math.floor(Math.random() * sortedPlayers.length);
        if(playerIndex < 0) continue;
        const player = sortedPlayers[playerIndex];
        
        if (!findPlayerByName(newPlayers, player.name)) {
            newPlayers.push(player);
        }
    }
    
    return newPlayers;
}


async function startNewMatch(winningPlayers, losingPlayers) {
    $("#match").show();
    $("#score-team-1").text("00");
    $("#score-team-2").text("00");
    
    if(players.length < playersPerTeam * 2) {
        alert("Não há jogadores suficientes para começar uma nova partida");
        return;
    }

    const availablePlayers = findAvailablePlayers(winningPlayers);

    const nextMatchPlayers = availablePlayers.length === playersPerTeam * 2
        ? await generateTeams(availablePlayers)
        : findNextMatchPlayers(winningPlayers, losingPlayers);

    currentMatchMaxPoints = maxPoints;
    randomServe();
    updateCurrentMatch(await generateTeams(nextMatchPlayers));
    await upsertGameDay();
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

const formatScore = (score) => String(score).padStart(2, 0)

$(".score-point").click(async function() {
    const teamIndex = $(this).attr("id");
    
    let team1Score = parseInt($("#score-team-1").text());
    let team2Score = parseInt($("#score-team-2").text());
    
    if (teamIndex === "score-1") {
        team1Score += 1;
        $("#score-team-1").text(formatScore(team1Score));
        $("#serving-1").show();
        $("#serving-2").hide();
    } else if (teamIndex === "score-2") {
        team2Score += 1;
        $("#score-team-2").text(formatScore(team2Score));
        $("#serving-1").hide();
        $("#serving-2").show();
    }
    
    const diff = Math.abs(team1Score - team2Score);
    
    if ((team1Score === currentMatchMaxPoints || team2Score === currentMatchMaxPoints) && diff < 2) {
        currentMatchMaxPoints += 1;
    }
    
    if (team1Score >= currentMatchMaxPoints && diff >= 2) {
        await endMatch(0);
        await startNewMatch(playingTeams[0], playingTeams[1]);
    } else if (team2Score >= currentMatchMaxPoints && diff >= 2) {
        await endMatch(1);
        await startNewMatch(playingTeams[1], playingTeams[0]);
    }
    
    if (autoSwitchTeamsPoints > 0) {
        const totalPoints = team1Score + team2Score;
        if (totalPoints % autoSwitchTeamsPoints === 0) swapTeams();
    }
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
    
    upsertGameDay();
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
            </tr>`
        );
    });
}

function renderEndGameDay() {
    $("#new-match-day").hide();
    $("#new-match-day-form").hide();
    $("#match").hide();
    $("#end-match-day").hide();
    const playersByWinPercentage = getPlayersByWinPercentage();
    showFinalPlayerList(playersByWinPercentage);
}

$("#end-match-day").click(async function() {
    const confirm = window.confirm("Deseja realmente encerrar o dia de jogos?");
    
    if (confirm) {
        await upsertGameDay(false);
        renderEndGameDay();
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
    
    $("#player-list").append(`<p>${players.length} jogadores cadastrados</p>`);
    
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
    
    upsertGameDay();
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
    upsertGameDay();
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

$("#show-historic").click(async function() {
    $("#history-container").show();
    $("#new-match-day-button").hide();
    
    const gameDays = await getGameDays()
    $("#historic").empty();
    
    gameDays.forEach(gameDay => {
        $("#historic-days").append(`
            <div class='cell match-historic' id='${gameDay.id}'>
                <button class='button is-large'>Jogo de ${new Date(gameDay.playedOn).toDateString()}</button>
            </div>`
        );
    });
});

$("#historic-days").on("click", ".match-historic", async function() {
    const gameId = $(this).attr("id");
    const gameDays = await getGameDays();
    const gameDay = gameDays.find(gameDay => gameDay.id == gameId);
    
    maxPoints = gameDay.maxPoints;
    playersPerTeam = gameDay.playersPerTeam;
    players = gameDay.players;
    playingTeams = gameDay.playingTeams;
    matches = gameDay.matches;
    currentId = gameDay.id;
    
    await updatePlayerList();
    
    const playersByWinPercentage = getPlayersByWinPercentage();
    
    $("#history-container").hide();
    $("#all-player-list").show();
    showFinalPlayerList(playersByWinPercentage);
});


async function migrateToDatabase(players, gameDays) {
    try {
        const response = await fetch(`${API_URL}/migrations/to-database`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({players, gameDays})
        });
        return response.ok;
    } catch {
        return false
    }
}

$(document).ready(async function (){
    const hasMigratedToDatabase = localStorage.getItem("migrated_to_database");
    const localStoragePlayers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ELO_KEY));
    const localStorageGameDays = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

    if(!hasMigratedToDatabase && (localStorageGameDays || localStoragePlayers)) {
        console.log('localStoragePlayers', localStoragePlayers)
        console.log('KEY', LOCAL_STORAGE_KEY)
        console.log(localStorage.getItem(LOCAL_STORAGE_KEY))
        console.log('localStorageGameDays', localStorageGameDays)
        const ok = await migrateToDatabase(localStoragePlayers, localStorageGameDays);
        console.log('migrateToDatabase', ok)
        if(ok) {
            localStorage.setItem("migrated_to_database", true);
        }
    }

    const activeGame = await getActiveGameDay();
    if(!activeGame) {
        currentId = null;
        return
    }

    if (activeGame.isLive) {
        maxPoints = activeGame.maxPoints;
        playersPerTeam = activeGame.playersPerTeam;
        players = activeGame.players;
        playingTeams = activeGame.playingTeams;
        otherPlayingTeams = activeGame.otherPlayingTeams;
        matches = activeGame.matches;
        currentId = activeGame.id;
        joinCode = activeGame.joinCode;
        courtId = activeGame.courtId || null

        if(playingTeams.length === 0) {
            playingTeams = await generateTeams(players);
        }
        
        currentMatchMaxPoints = maxPoints;
        await updatePlayerList();
        updateCurrentMatch(playingTeams);
        $("#new-match-day").hide();
        $("#new-match-day-form").hide();
        $("#new-match-day-button").hide();
        $("#match").show();
        $("#all-player-list").show();
        $("#end-match-day").show();
        socket.emit('join', currentId);
    }
});
