import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { createInitialRating, findBestTeamMatch, updateRatings } from './elo.js';
const LOCAL_STORAGE_ELO_KEY = "players_elo";
const LOCAL_STORAGE_KEY = "matche_days";
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://plankton-app-xoik3.ondigitalocean.app'

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
let lastGameDayMatch = 0;
let courtId = null;
const localStorage = window.localStorage;
let playersToNextGame = [];
let selectionOrder = [];

const createSpinner = (id) => {
    const wrapper = document.createElement('span');
    wrapper.id = id ?? 'spinner';
    wrapper.classList.add('icon');
    const i = document.createElement('i');
    i.classList.add('fa-pulse',  'fa-solid', 'fa-spinner', 'fa-lg');
    wrapper.appendChild(i);
    return wrapper;
}

const findOrCreatePlayer = async (name, rating) => {
    try {
        const response = await fetch(`${API_URL}/players`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name,
                rating,
            })
        })
        
        return response.ok
    } catch {
        return false
    }
}

const getPlayers = async () => {
    try {
        const response = await fetch(`${API_URL}/players`, {
            credentials: 'include'
        });
        return await response.json();
    } catch {
        return []
    }
}

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
    lastGameDayMatch = activeGame.lastMatch;
    currentId = activeGame.id;
    joinCode = activeGame.joinCode;
    courtId = activeGame.courtId || null;
    playersToNextGame = activeGame.playersToNextGame || [];

    // await upsertGameDay();
    
    $('#add-new-player-select').empty();
    getPlayers()
        .then(p => {
            const filteredPlayers = p.filter(player => !players.some(p => p.name === player.name));
            initPlayersSelect(filteredPlayers.sort((a, b) => a.name.localeCompare(b.name)));
        })

    currentMatchMaxPoints = maxPoints;
    updatePlayerList();
    $("#new-match-day").hide();
    $("#new-match-day-form").hide();
    $("#new-match-day-button").hide();
    $("#match").show();
    $("#all-player-list").show();
    $("#end-match-day").show();
    if(courtId){
        $('#end-court').show()
    }
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
        courtId = data.courtId;
        joinCode = data.joinCode;
        return newGame;
    } catch {
        return null
    }
}

// put /sessions/game-day/leave
async function endCourt() {
    try {
        const response = await fetch(`${API_URL}/sessions/game-day/leave`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
        });
        if(!response.ok) {
            return false;
        }
        socket.emit("game-day:updated", currentId);
        
        return await response.json();
    } catch {
        return false
    }
}

async function joinGameDay(joinCode) {
    try {
        const response = await fetch(`${API_URL}/game-days/join/${joinCode}`, {
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
        const response = await fetch(`${API_URL}/sessions/game-day`, {
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
                playedOn: new Date(),
                playersToNextGame,
            })
        });
        
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
    const response = await fetch(`${API_URL}/players?${params.toString()}`, {
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
    const all = [...updatedVictory, ...updatedLosing]
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
        body: JSON.stringify(all)
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
    lastGameDayMatch = data.lastMatch;
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

function updatePlayerList() {
    $("#players").empty();
    const playersToList = players.slice().sort((a, b) => sortPlayers(a, b))
    const devMode = $("#dev-mode").is(":checked");
    if(devMode) {
        $("#elo-header").show();
    } else {
        $("#elo-header").hide();
    }
    
    const rows = playersToList.map(player => {
        const isPlayingHere = playingTeams.flat().some(p => p.name === player.name);
        const isPlayingSomewhereElse = otherPlayingTeams.flat().some(p => p.name === player.name);
        const shouldBeOnNextMatch = playersToNextGame.some(p => p.name === player.name);
        const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        const elo = devMode ? `${formatter.format(player.mu)}/${formatter.format(player.sigma)}` : '';
        const playingClass = isPlayingSomewhereElse
        ? ''
        : player.playing
        ? 'remove-player is-clickable'
        : 'is-danger remove-player is-clickable';

        let rowClass = '';
        if (isPlayingHere) {
            rowClass = 'is-selected';
        } else if (isPlayingSomewhereElse) {
            rowClass = 'is-selected is-warning';
        } else if (shouldBeOnNextMatch) {
            rowClass = 'is-info';
        } else {
            rowClass = player.playing ? 'remove-player is-clickable' : 'is-danger remove-player is-clickable';
        }

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

    // Remove this player from next match
    playersToNextGame = playersToNextGame.filter(player => player.name !== playerName);
    
    await upsertGameDay();
    updatePlayerList();
});

$("#new-match-day").click(function() {
    $("#new-match-day-form").show();
    $("#new-match-day-button").hide();
});

$('#add-new-player-select').on('select2:select', function (e) {
    selectionOrder.push(e.params.data.text);
});

$('#add-new-player-select').on('select2:unselect', function (e) {
    const index = selectionOrder.indexOf(e.params.data.text);
    selectionOrder.splice(index, 1);
})

async function addNewPlayer(){
    try {
         const selectedPlayers = selectionOrder;

        if(selectedPlayers.length === 0) {
            alert("Selecione ao menos um jogador.");
            return;
        }

        const repeatedPlayers = selectedPlayers.filter(player => players.some(p => p.name === player));

        if(repeatedPlayers.length > 0) {
            alert(`Os jogadores ${repeatedPlayers.join(', ')} já estão cadastrados.`);
            return;
        }

        const spinner = createSpinner('add-new-player-spinner');
        $("#add-new-player-wrapper").append(spinner);
        $("#add-new-player").attr('disabled', 'disabled');

        const playerOrder = players.length + 1;
        const rating = createInitialRating();

        await Promise.all(selectedPlayers.map(async playerName => {
            try {
                await findOrCreatePlayer(playerName, rating);
            } catch {
                alert(`Erro ao criar jogador ${playerName}`);
            }
        }));

        selectedPlayers.forEach(playerName => {
            players.push({
                name: playerName,
                matches: 0,
                victories: 0,
                defeats: 0,
                lastPlayedMatch: 0,
                playing: true,
                order: playerOrder,
                ...rating
            });
            $("#player-list").append(`<li>${playerName}</li>`);
        })

        selectionOrder = [];
        $("#add-new-player-select").val(null).trigger('change');

        getPlayers()
            .then(p => {
                const filteredPlayers = p.filter(player => !players.some(p => p.name === player.name));
                $('#add-new-player-select').empty();
                initPlayersSelect(filteredPlayers.sort((a, b) => a.name.localeCompare(b.name)));
            })
        updatePlayerList();
    } finally {
        $("#add-new-player").removeAttr('disabled');
        $('#add-new-player-spinner').remove();
    }
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

    if(teams[0]) {
        const captain1 = teams[0].length > 0 ? teams[0][0].name : '';
        $("#team-1-captain").text(`Time ${captain1}`);
        teams[0].forEach(player => {
            $("#team-1-players").append(`<li>${player.name}</li>`);
        });
    }

    if (teams[1]) {
        const captain2 = teams[1].length > 0 ? teams[1][0].name : '';
        $("#team-2-captain").text(`Time ${captain2}`);
        teams[1].forEach(player => {
            $("#team-2-players").append(`<li>${player.name}</li>`);
        });
    }
    
    
    $("#join-code").text(joinCode);
    $("#match").show();
    
    playingTeams = teams;
    updatePlayerList();
}

$("#start-match-day").click(async function() {
    const startMatchDaySpinner = createSpinner('start-match-day-spinner');
    const button = document.getElementById('start-match-day');
    button.insertAdjacentElement('afterend', startMatchDaySpinner);
    button.setAttribute('disabled', 'disabled');
    try {
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
        .filter(p => p.playing)
        .slice(0, playersPerTeam * 2);
        if(firstPlayers.length < playersPerTeam * 2) {
            alert("Não há jogadores suficientes para começar a partida nesta quadra agora.");

            return;
        }
        playingTeams = await generateTeams(firstPlayers);
        await upsertGameDay();
        await updateCurrentMatch(playingTeams);
        randomServe();
        $("#end-match-day").show();
        if(courtId) $('#end-court').show()
            socket.emit('join', currentId);
        $("#all-player-list").show();
    } finally {
        startMatchDaySpinner.remove();
        button.removeAttribute('disabled');
    }
    
});

$("#copy-join-code").click(function() {
    const joinCode = $("#join-code").text();
    navigator.clipboard.writeText(joinCode);
    alert("Código copiado para a área de transferência.");
});

$("#update-match-day").click(async function() {
    const availablePlayers = findAvailablePlayers();

    if ($("#players-per-team").val() * 2 > availablePlayers.length) {
        alert("Sem jogadores suficientes para atualizar a partida.");
        return;
    }
    maxPoints = parseInt($("#max-points").val());
    currentMatchMaxPoints = maxPoints;
    playersPerTeam = $("#players-per-team").val();
    
    if ($("#auto-switch-teams").is(":checked")) autoSwitchTeamsPoints = parseInt($("#auto-switch-teams-points").val());
    else autoSwitchTeamsPoints = 0;
    
    
    $("#all-player-list").show();
    $("#match").show();
    $("#new-match-day-form").hide();
    $("#player-list").hide();
    await upsertGameDay();
    updatePlayerList();
});

async function endMatch(victoryTeam) {
    alert(`Time ${playingTeams[victoryTeam][0].name} venceu a partida!`);
    matches = lastGameDayMatch + 1;
    lastGameDayMatch += 1;

    const winners = playingTeams[victoryTeam];
    const losers = playingTeams[1 - victoryTeam];
    
    const updatedRatings = updateRatings(winners, losers);
    await storeUpdatedRatings(updatedRatings);
    const [updatedWinners, updatedLosers] = updatedRatings;
    
    // Add one match to every player and one victory to each player on winning team
    updatedWinners.forEach(player => {
        const playerIndex = players.findIndex(p => p.name === player.name);
        players[playerIndex].lastPlayedMatch = matches;
        players[playerIndex].matches += 1;
        players[playerIndex].victories += 1;
        players[playerIndex].mu = player.mu;
        players[playerIndex].sigma = player.sigma;
    });
    
    // Add one match to every player on losing team
    updatedLosers.forEach(player => {
        const playerIndex = players.findIndex(p => p.name === player.name);
        players[playerIndex].lastPlayedMatch = matches;
        players[playerIndex].matches += 1;
        players[playerIndex].defeats += 1;
        players[playerIndex].mu = player.mu;
        players[playerIndex].sigma = player.sigma;
    });
    
    // Match is ended, no one is playing
    playingTeams = [];
    
    $("#team-1-captain").text("");
    $("#team-2-captain").text("");
    $("#team-1-players").empty();
    $("#team-2-players").empty();
    $("#score-team-1").text("00");
    $("#score-team-2").text("00");

    updatePlayerList();

}

function findPlayerByName(players, name) {
    return players.find(player => player.name === name);
}

function findAvailablePlayers(winners = []) {
    return players
    .filter(player => player.playing)
    .filter(player => !findPlayerByName(winners, player.name))
    .filter(player => !findPlayerByName(otherPlayingTeams.flat(), player.name))
}

function findNextMatchPlayers(winners = []) {
    if(winners.length > playersPerTeam * 2) {
        return winners
            .sort((a, b) => sortPlayers(a, b))
            .slice(0, playersPerTeam * 2);
    }

    if(winners.length === playersPerTeam * 2) {
        return winners;
    }
    
    let nextPlayers = [
        ...winners,
    ];

    
    const availablePlayersToJoin = findAvailablePlayers(winners)
        .slice()
        .sort((a, b) => sortPlayers(a, b))
    
    while (nextPlayers.length < playersPerTeam * 2 && availablePlayersToJoin.length > 0) {
        const player = availablePlayersToJoin.shift();
        nextPlayers.push(player);
        nextPlayers = nextPlayers.filter((player, index, self) => self.findIndex(p => p.name === player.name) === index);
    }

    return nextPlayers;
}


async function startNewMatch(winningPlayers) {
    $("#start-next-match").hide();
    $("#match").show();
    $("#score-team-1").text("00");
    $("#score-team-2").text("00");
    
    if(players.length < playersPerTeam * 2) {
        alert("Não há jogadores suficientes para começar uma nova partida");
        return;
    }
    
    const nextMatchPlayers = findNextMatchPlayers(winningPlayers);
    currentMatchMaxPoints = maxPoints;
    
    // Remove players from this match from players next game
    playersToNextGame = playersToNextGame.filter(player => !findPlayerByName(nextMatchPlayers, player.name));

    randomServe();
    await updateCurrentMatch(await generateTeams(nextMatchPlayers));
    await upsertGameDay();
    updatePlayerList();
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
    if (!playingTeams.length) {
        return;
    }
    
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
        let confirmEndGame = window.confirm(`Time ${playingTeams[0][0].name} venceu a partida? Confirmar para encerrar.`);
        
        if (confirmEndGame) {
            $("#start-next-match").show();
            playersToNextGame = playersToNextGame.concat(playingTeams[0]);
            await endMatch(0);
            await upsertGameDay();
        }
    } else if (team2Score >= currentMatchMaxPoints && diff >= 2) {
        let confirmEndGame = window.confirm(`Time ${playingTeams[1][0].name} venceu a partida? Confirmar para encerrar.`);
        
        if (confirmEndGame) {
            $("#start-next-match").show();
            playersToNextGame = playersToNextGame.concat(playingTeams[1]);
            await endMatch(1);
            await upsertGameDay();
        }
    }

    if (autoSwitchTeamsPoints > 0) {
        const totalPoints = team1Score + team2Score;
        if (totalPoints % autoSwitchTeamsPoints === 0) swapTeams();
    }
});

$("#start-next-match").click(async function() {
    await startNewMatch(playersToNextGame);
});

$(".undo-point").click(function() {
    const teamIndex = $(this).attr("id");
    
    let team1Score = parseInt($("#score-team-1").text());
    let team2Score = parseInt($("#score-team-2").text());
    
    if (teamIndex === "undo-1") {
        team1Score -= 1;
        const value = team1Score >= 0 ? team1Score : 0;
        $("#score-team-1").text(value.toString().padStart(2, 0));
    } else if (teamIndex === "undo-2") {
        team2Score -= 1;
        const value = team2Score >= 0 ? team2Score : 0;
        $("#score-team-2").text(value.toString().padStart(2, 0));
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
    $("#end-court").hide();
    const playersByWinPercentage = getPlayersByWinPercentage();
    showFinalPlayerList(playersByWinPercentage);
}

$("#end-match-day").click(async function() {
    const confirm = window.confirm("Deseja realmente encerrar o dia de jogos?");
    
    if (confirm) {
        const button = document.getElementById('end-match-day');
        const spinner = createSpinner('end-match-day-spinner');
        button.insertAdjacentElement('afterend', spinner);
        button.setAttribute('disabled', 'disabled');
        try {
            await upsertGameDay(false);
            renderEndGameDay();
        } finally {
            spinner.remove();
            button.removeAttribute('disabled');
        }
    }
    
});

$("#end-court").click(async function() {
    const confirm = window.confirm("Deseja realmente encerrar essa quadra?");
    if (confirm) {
        const button = document.getElementById('end-court');
        const spinner = createSpinner('end-court-spinner');
        button.insertAdjacentElement('afterend', spinner);
        button.setAttribute('disabled', 'disabled');
        try {
            await endCourt();
            window.location.reload();
        } finally {
            spinner.remove();
            button.removeAttribute('disabled');
        }
    }
})  

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

async function swapTeams() {
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
    await updateCurrentMatch(playingTeams);
    await upsertGameDay();
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
                <button class='button is-large'>Jogo de ${new Date(gameDay.playedOn).toLocaleDateString()}</button>
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
    playingTeams = gameDay.playingTeams ?? []
    matches = gameDay.matches;
    currentId = gameDay.id;
    
    updatePlayerList();
    
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

function initPlayersSelect(players) {
    $("#add-new-player-select").select2({
        tags: true,
        allowClear: true,
        multiple: true,
        closeOnSelect: false,
        placeholder: "Selecione os jogadores",
        language: {
            noResults: function() {
                return "Nenhum jogador encontrado. Adicione um novo jogador.";
            }
        },
        data: players.map(player => ({
            id: player.name,
            text: player.name
        }))
    })
    selectionOrder = [];
}

$(document).ready(async function (){
    const hasMigratedToDatabase = localStorage.getItem("migrated_to_database");
    const localStoragePlayers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ELO_KEY));
    const localStorageGameDays = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    
    if(!hasMigratedToDatabase && (localStorageGameDays || localStoragePlayers)) {
        const ok = await migrateToDatabase(localStoragePlayers, localStorageGameDays);
        console.log('migrateToDatabase', ok)
        if(ok) {
            localStorage.setItem("migrated_to_database", true);
        }
    }

    const allPlayers = await getPlayers();
    
    
    const activeGame = await getActiveGameDay();
    if(!activeGame) {
        initPlayersSelect(allPlayers.sort((a, b) => a.name.localeCompare(b.name)));
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
        lastGameDayMatch = activeGame.lastMatch;
        joinCode = activeGame.joinCode;
        courtId = activeGame.courtId || null

        initPlayersSelect(allPlayers
            .filter(player => !players.some(p => p.name === player.name))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        
        if(playingTeams.length === 0) {
            const playersToTeam = findNextMatchPlayers()
            if(playersToTeam.length > 0) {
                playingTeams = await generateTeams(playersToTeam);
                await upsertGameDay();
            }
        }
        
        currentMatchMaxPoints = maxPoints;
        await updateCurrentMatch(playingTeams);
        $("#new-match-day").hide();
        $("#new-match-day-form").hide();
        $("#new-match-day-button").hide();
        $("#match").show();
        $("#all-player-list").show();
        $("#end-match-day").show();
        if(courtId){
            $('#end-court').show()
        }
        socket.emit('join', currentId);
    }
});

history.pushState(null, null, window.top.location.pathname + window.top.location.search);
window.addEventListener('popstate', (e) => {
    e.preventDefault();
    // Insert Your Logic Here, You Can Do Whatever You Want
    history.pushState(null, null, window.top.location.pathname + window.top.location.search);
});