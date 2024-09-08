const LOCAL_STORAGE_KEY = "matche_days";
let maxPoints;
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

function updatePlayerList() {
    $("#players").empty();
    const playersToList = players.sort((a, b) => sortPlayers(a, b));
    playersToList.forEach(player => {
        const playerIsPlayingNow = playingTeams.flat().some(p => p.name === player.name);
        $("#players").append(`
            <tr ${playerIsPlayingNow ? 'class="is-selected"' : ''}>
                <th>${player.name}</th>
                <td>${player.matches}</td>
                <td>${player.victories}</td>
                <td>${player.defeats}</td>
                <td>${player.lastPlayedMatch}</td>
                <td ${!player.playing ? 'class="is-danger remove-player"' : 'class="remove-player"'} style="cursor: pointer">${player.playing ? 'Sim' : 'Não'}</td>
            </tr>`);
    });
}

$("#all-player-list").on("click", ".remove-player", function() {
    const playerName = $(this).parent().find("th").text();
    if (playingTeams.flat().some(player => player.name === playerName)) {
        alert("Jogador está jogando, não é possível remover.");
        return;
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

function generateRandomTeams(players) {
    const teams = [];
    // Generate two random teams
    for (let i = 0; i < 2; i++) {
        const team = [];
        for (let j = 0; j < playersPerTeam; j++) {
            const playerIndex = Math.floor(Math.random() * players.length);
            const player = players[playerIndex];
            team.push(player);
            players.splice(playerIndex, 1);
        }
        teams.push(team);
    }

    return teams;
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
    playersPerTeam = $("#players-per-team").val();
    
    if (playersPerTeam * 2 > players.length) {
        alert("Sem jogadores suficientes para começar a partida.");
        return;
    }
    
    $("#all-player-list").show();
    const firstPlayers = players.slice(0, playersPerTeam * 2);


    saveOnLocalStorage();
    updateCurrentMatch(generateRandomTeams(firstPlayers));
});

$("#update-match-day").click(function() {
    maxPoints = parseInt($("#max-points").val());
    playersPerTeam = $("#players-per-team").val();

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

function startNewMatch(winningPlayers, losingPlayers) {
    $("#match").show();
    $("#score-team-1").text("0");
    $("#score-team-2").text("0");

    const notPlayingPlayers = players.filter(player => !player.playing);
    let newPlayers = [...winningPlayers];
    let playersToPlay = [];
    let playerList = players.sort((a, b) => sortPlayers(a, b)).filter(player => !winningPlayers.includes(player) && !losingPlayers.includes(player) && !notPlayingPlayers.includes(player));

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
                if (!newPlayers.includes(player)) {
                    newPlayers.push(player);
                }
            }
        }
    } else {
        // I don't have substitutes to play, let's just keep playing
        updateCurrentMatch(generateRandomTeams(players));
        return;
    }

    // Remove players that are already playing, get players with less matches but that played the longest time ago
    const sortedPlayers = players.filter(player => !newPlayers.includes(player) && !winningPlayers.includes(player) && !playerList.includes(player) && !notPlayingPlayers.includes(player)).sort((a, b) => sortPlayers(a, b)).slice(0, (playersPerTeam * 2) - newPlayers.length);

    while (newPlayers.length < playersPerTeam * 2) {
        // Just to be sure, remove any duplicates
        newPlayers = newPlayers.filter((player, index, self) => self.findIndex(p => p.name === player.name) === index);

        const playerIndex = Math.floor(Math.random() * sortedPlayers.length);
        const player = sortedPlayers[playerIndex];

        if (!newPlayers.includes(player)) {
            newPlayers.push(player);
        }
    }

    updateCurrentMatch(generateRandomTeams(newPlayers));
    saveOnLocalStorage();
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
    if (diff >= 2 ) {
        if (team1Score >= maxPoints) {
            endMatch(0);
            startNewMatch(playingTeams[0], playingTeams[1]);
        } else if (team2Score >= maxPoints) {
            endMatch(1);
            startNewMatch(playingTeams[1], playingTeams[0]);
        }
    }

    if (autoSwitchTeamsPoints > 0) {
        const totalPoints = team1Score + team2Score;
        if (totalPoints % autoSwitchTeamsPoints === 0) swapTeams();
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

    const gameDays = getFromLocalStorage();
    $("#historic").empty();
    
    console.log(gameDays);
    gameDays.forEach(gameDay => {
        $("#historic-days").append(`
            <div class='column match-historic' id='${gameDay.id}'>
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

$(document).ready(function (){
    const gameDays = getFromLocalStorage();

    if (gameDays.length > 0) {
        const lastGameDay = gameDays[gameDays.length - 1];

        if (lastGameDay.isLive) {
            maxPoints = lastGameDay.maxPoints;
            playersPerTeam = lastGameDay.playersPerTeam;
            players = lastGameDay.players;
            playingTeams = lastGameDay.playingTeams;
            matches = lastGameDay.matches;
            currentId = lastGameDay.id;
            
            updatePlayerList();
            updateCurrentMatch(playingTeams);
            $("#new-match-day").hide();
            $("#new-match-day-form").hide();
            $("#new-match-day-button").hide();
            $("#match").show();
            $("#all-player-list").show();

            return;
        }
    }

    currentId = gameDays.length + 1;
});
