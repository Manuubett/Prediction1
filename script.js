
// ================== SHIFTING MECHANISM ================== //
function shiftMatches() {
    if (!confirm("Shift matches? This will move Match 5 → 4 → 3 → 2 → 1 and clear Match 5.")) return;
    
    try {
        // Store current values
        const values = [
            document.getElementById('matchInput1').value,
            document.getElementById('matchInput2').value,
            document.getElementById('matchInput3').value,
            document.getElementById('matchInput4').value,
            document.getElementById('matchInput5').value
        ];

        // Perform the shift (5→4, 4→3, 3→2, 2→1)
        document.getElementById('matchInput1').value = values[1]; // Move 2→1
        document.getElementById('matchInput2').value = values[2]; // Move 3→2
        document.getElementById('matchInput3').value = values[3]; // Move 4→3
        document.getElementById('matchInput4').value = values[4]; // Move 5→4
        
        // Clear match5 for new input
        document.getElementById('matchInput5').value = "";
        
        showAlert("Matches shifted successfully! Match 5 is now empty for new data.", "success");
    } catch (error) {
        console.error("Shifting error:", error);
        showAlert("An error occurred during match shifting.", "danger");
    }
}

function showAlert(message, type) {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector(".container");
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.remove("show");
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

// ================== MAIN PREDICTION CODE ================== //
let matchData = [];
const DEFAULT_AVG_FOR = 1.2;
const DEFAULT_AVG_AGAINST = 1.0;
const RECENT_MATCHES_LIMIT = 10;
const MOMENTUM_WEIGHT = 0.3;
const HOME_ADVANTAGE = 0.2;

function parseMatches(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = [];
    for (let i = 0; i <= lines.length - 4; i += 4) {
        const team1 = lines[i];
        const score1 = parseInt(lines[i + 1]);
        const score2 = parseInt(lines[i + 2]);
        const team2 = lines[i + 3];
        if (team1 && team2 && !isNaN(score1) && !isNaN(score2)) {
            parsed.push({ team1, score1, team2, score2, date: new Date() });
        }
    }
    return parsed;
}

function loadAllMatches() {
    matchData = [];
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`matchInput${i}`).value.trim();
        if (input) {
            const newMatches = parseMatches(input);
            matchData.push(...newMatches);
        }
    }

    if (matchData.length === 0) {
        alert("❌ Please paste at least one valid match set.");
        return;
    }

    matchData.sort((a, b) => b.date - a.date);
    updateTeamSelects();
    updateMatchHistory();
    alert(`✅ Loaded ${matchData.length} matches. Select teams to predict.`);
}

function updateTeamSelects() {
    const teams = [...new Set(matchData.flatMap(m => [m.team1, m.team2]))].sort();
    const teamASelect = document.getElementById("teamA");
    const teamBSelect = document.getElementById("teamB");

    teamASelect.innerHTML = teamBSelect.innerHTML = '';
    teams.forEach(team => {
        teamASelect.add(new Option(team, team));
        teamBSelect.add(new Option(team, team));
    });
}

function updateMatchHistory() {
    const historyContainer = document.getElementById("matchHistory");
    historyContainer.innerHTML = '';
    const recentMatches = matchData.slice(0, 15);
    recentMatches.forEach((match, index) => {
        const matchCard = document.createElement("div");
        matchCard.className = "col-md-6 col-lg-4 mb-3";
        matchCard.innerHTML = `
            <div class="card match-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${match.team1} vs ${match.team2}</h6>
                        <small class="text-muted">${match.date.toLocaleTimeString()}</small>
                    </div>
                    <div class="text-center display-5">
                        ${match.score1} - ${match.score2}
                    </div>
                    <div class="text-center small text-muted">
                        Input ${Math.floor(index / 3) + 1} • ${match.date.toLocaleDateString()}
                    </div>
                </div>
            </div>
        `;
        historyContainer.appendChild(matchCard);
    });
}

function getRecentMatches(team, limit = RECENT_MATCHES_LIMIT) {
    return matchData.filter(m => m.team1 === team || m.team2 === team).slice(0, limit);
}

function getStreak(team) {
    const matches = getRecentMatches(team);
    return matches.map(match => {
        if ((match.team1 === team && match.score1 > match.score2) || 
            (match.team2 === team && match.score2 > match.score1)) return 'W';
        if (match.score1 === match.score2) return 'D';
        return 'L';
    });
}

function getMomentum(team) {
    const streak = getStreak(team);
    let momentum = 0;
    for (let i = 0; i < streak.length; i++) {
        const weight = 1 + (0.2 * (streak.length - i));
        if (streak[i] === 'W') momentum += 2 * weight;
        else if (streak[i] === 'D') momentum -= 1 * weight;
        else if (streak[i] === 'L') momentum -= 2 * weight;
    }
    return momentum / streak.length;
}

function getTeamStats(team) {
    const matches = getRecentMatches(team);
    if (matches.length === 0) {
        return {
            avgFor: DEFAULT_AVG_FOR,
            avgAgainst: DEFAULT_AVG_AGAINST,
            homeStats: { avgFor: DEFAULT_AVG_FOR, avgAgainst: DEFAULT_AVG_AGAINST },
            awayStats: { avgFor: DEFAULT_AVG_FOR, avgAgainst: DEFAULT_AVG_AGAINST }
        };
    }

    let goalsFor = 0, goalsAgainst = 0;
    let homeGames = 0, homeGoalsFor = 0, homeGoalsAgainst = 0;
    let awayGames = 0, awayGoalsFor = 0, awayGoalsAgainst = 0;

    matches.forEach(match => {
        if (match.team1 === team) {
            goalsFor += match.score1;
            goalsAgainst += match.score2;
            homeGames++;
            homeGoalsFor += match.score1;
            homeGoalsAgainst += match.score2;
        } else {
            goalsFor += match.score2;
            goalsAgainst += match.score1;
            awayGames++;
            awayGoalsFor += match.score2;
            awayGoalsAgainst += match.score1;
        }
    });

    return {
        avgFor: Math.max(0.5, goalsFor / matches.length),
        avgAgainst: Math.max(0.5, goalsAgainst / matches.length),
        homeStats: {
            avgFor: homeGames ? Math.max(0.5, homeGoalsFor / homeGames) : DEFAULT_AVG_FOR,
            avgAgainst: homeGames ? Math.max(0.5, homeGoalsAgainst / homeGames) : DEFAULT_AVG_AGAINST
        },
        awayStats: {
            avgFor: awayGames ? Math.max(0.5, awayGoalsFor / awayGames) : DEFAULT_AVG_FOR,
            avgAgainst: awayGames ? Math.max(0.5, awayGoalsAgainst / awayGames) : DEFAULT_AVG_AGAINST
        }
    };
}

function predictMatch() {
    const teamA = document.getElementById("teamA").value;
    const teamB = document.getElementById("teamB").value;

    if (!teamA || !teamB || teamA === teamB) {
        alert("⚠️ Please select two different teams.");
        return;
    }

    const streakA = getStreak(teamA);
    const streakB = getStreak(teamB);
    const momentumA = getMomentum(teamA);
    const momentumB = getMomentum(teamB);

    const statsA = getTeamStats(teamA);
    const statsB = getTeamStats(teamB);

    const isTeamAHome = matchData.some(m => m.team1 === teamA && m.team2 === teamB);
    const teamAStats = isTeamAHome ? statsA.homeStats : statsA.awayStats;
    const teamBStats = isTeamAHome ? statsB.awayStats : statsB.homeStats;

    let estGoalsA = (teamAStats.avgFor + teamBStats.avgAgainst) / 2;
    let estGoalsB = (teamBStats.avgFor + teamAStats.avgAgainst) / 2;

    estGoalsA += (momentumA * MOMENTUM_WEIGHT / 10);
    estGoalsB += (momentumB * MOMENTUM_WEIGHT / 10);

    if (isTeamAHome) {
        estGoalsA += HOME_ADVANTAGE;
        estGoalsB -= HOME_ADVANTAGE / 2;
    }

    estGoalsA = Math.max(0.5, estGoalsA);
    estGoalsB = Math.max(0.5, estGoalsB);

    const goalA = Math.round(estGoalsA * 10) / 10;
    const goalB = Math.round(estGoalsB * 10) / 10;

    let predictedWinner = "Draw";
    let confidence = "Medium";
    const diff = Math.abs(goalA - goalB);

    if (goalA > goalB) {
        predictedWinner = teamA;
        confidence = diff > 1 ? "High" : (diff > 0.5 ? "Medium" : "Low");
    } else if (goalB > goalA) {
        predictedWinner = teamB;
        confidence = diff > 1 ? "High" : (diff > 0.5 ? "Medium" : "Low");
    }

    const ratingDiff = (statsA.avgFor - statsB.avgFor) * 100;
    const winProbA = (50 + ratingDiff * 0.5).toFixed(1);
    const winProbB = (50 - ratingDiff * 0.5).toFixed(1);
    const drawProb = Math.min(30, (1 - Math.abs(0.5 - (winProbA / 100))) * 60).toFixed(1);

    const goals = matchData.map(m => m.score1 + m.score2);
    const avgGoals = goals.length ? (goals.reduce((a, b) => a + b, 0) / goals.length).toFixed(2) : "0.00";
    const over15 = goals.length ? (goals.filter(g => g > 1.5).length / goals.length * 100).toFixed(1) : "0.0";
    const over25 = goals.length ? (goals.filter(g => g > 2.5).length / goals.length * 100).toFixed(1) : "0.0";
    const ggRatio = matchData.length ? 
        (matchData.filter(m => m.score1 > 0 && m.score2 > 0).length / matchData.length * 100).toFixed(1) : "0.0";

        const formatStreak = (streak) => {
        return streak.map(res => `<span class="streak-${res}">${res}</span>`).join(" ");
    };

    const resultBox = document.getElementById("predictionResult");
    resultBox.classList.remove("d-none");
    resultBox.querySelector('.card-body').innerHTML = `
      <h4 class="mb-3">🔮 Match Prediction</h4>
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h5>${teamA}</h5>
              <div>Streak: ${formatStreak(streakA)}</div>
              <div>Momentum: ${momentumA.toFixed(2)}</div>
              <div>Avg Goals: ${statsA.avgFor.toFixed(2)}</div>
              <div>Avg Conceded: ${statsA.avgAgainst.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h5>${teamB}</h5>
              <div>Streak: ${formatStreak(streakB)}</div>
              <div>Momentum: ${momentumB.toFixed(2)}</div>
              <div>Avg Goals: ${statsB.avgFor.toFixed(2)}</div>
              <div>Avg Conceded: ${statsB.avgAgainst.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="prediction-summary text-center mb-4">
        <h3 class="mb-2">${goalA} - ${goalB}</h3>
        <h5 class="mb-3">Predicted Winner: <strong>${predictedWinner}</strong></h5>
        <div>Confidence: <span class="confidence-${confidence.toLowerCase()}">${confidence}</span></div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <div class="card"><div class="card-body">
            <h5>Win Probabilities</h5>
            <div>${teamA}: ${winProbA}%</div>
            <div>Draw: ${drawProb}%</div>
            <div>${teamB}: ${winProbB}%</div>
          </div></div>
        </div>
        <div class="col-md-6">
          <div class="card"><div class="card-body">
            <h5>Tournament Stats</h5>
            <div>Avg Goals: ${avgGoals}</div>
            <div>Over 1.5: ${over15}%</div>
            <div>Over 2.5: ${over25}%</div>
            <div>Both Score: ${ggRatio}%</div>
          </div></div>
        </div>
      </div>
    `;

    if (document.getElementById("toggleComparison").checked) {
      toggleComparison();
    }
}

function analyzeExtraMarkets() {
    const teamA = document.getElementById("teamA").value;
    const teamB = document.getElementById("teamB").value;
    if (!teamA || !teamB || teamA === teamB) return alert("⚠️ Choose two different teams.");

    const recent = matchData.filter(
        m => (m.team1 === teamA || m.team2 === teamA || m.team1 === teamB || m.team2 === teamB)
    ).slice(-10); // Last 10 matches

    let ggCount = 0, o15Count = 0, csA = 0, csB = 0;
    let winA = 0, draw = 0, winB = 0;

    for (const match of recent) {
        const { team1, score1, team2, score2 } = match;
        const teams = [team1, team2];
        const scores = [score1, score2];
        
        if (teams.includes(teamA) && teams.includes(teamB)) {
            if (score1 > 0 && score2 > 0) ggCount++;
            if (score1 + score2 > 1) o15Count++;

            if ((team1 === teamA && score2 === 0) || (team2 === teamA && score1 === 0)) csA++;
            if ((team1 === teamB && score2 === 0) || (team2 === teamB && score1 === 0)) csB++;

            if ((team1 === teamA && score1 > score2) || (team2 === teamA && score2 > score1)) winA++;
            else if ((team1 === teamB && score1 > score2) || (team2 === teamB && score2 > score1)) winB++;
            else draw++;
        }
    }

    const total = recent.length || 1;
    const resultBox = document.getElementById("predictionResult");
    if (resultBox.classList.contains("d-none")) {
        resultBox.classList.remove("d-none");
        resultBox.querySelector('.card-body').innerHTML = '';
    }
    
    const marketHTML = `
      <hr>
      <h5>📈 Extra Market Predictions</h5>
      <div class="row">
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h6>✅ GG (Both Teams to Score)</h6>
              <div class="progress" style="height: 20px">
                <div class="progress-bar bg-success" style="width: ${(ggCount/total)*100}%">
                  ${Math.round((ggCount/total)*100)}%
                </div>
              </div>
              <small>${ggCount}/${total} matches</small>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h6>🔥 Over 1.5 Goals</h6>
              <div class="progress" style="height: 20px">
                <div class="progress-bar bg-warning" style="width: ${(o15Count/total)*100}%">
                  ${Math.round((o15Count/total)*100)}%
                </div>
              </div>
              <small>${o15Count}/${total} matches</small>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h6>🧤 Clean Sheets</h6>
              <div>${teamA}: ${csA} (${Math.round((csA/total)*100)}%)</div>
              <div>${teamB}: ${csB} (${Math.round((csB/total)*100)}%)</div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h6>🎲 Double Chance Prediction</h6>
              <div class="fw-bold">
                ${winA >= winB && winA >= draw ? `${teamA} or Draw (1X)` :
                  winB >= winA && winB >= draw ? `${teamB} or Draw (X2)` : 'Either Team (12)'}
              </div>
              <small>Based on recent H2H results</small>
            </div>
          </div>
        </div>
      </div>
    `;

    resultBox.querySelector('.card-body').insertAdjacentHTML('beforeend', marketHTML);
}

function toggleComparison() {
    const teamA = document.getElementById("teamA").value;
    const teamB = document.getElementById("teamB").value;
    const box = document.getElementById("comparisonBox");

    if (!teamA || !teamB || teamA === teamB) {
        box.classList.add("d-none");
        return;
    }

    const statsA = getTeamStats(teamA);
    const statsB = getTeamStats(teamB);

    document.getElementById("comparisonContent").innerHTML = `
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h5>${teamA}</h5>
            <div class="mb-2">
              <strong>Overall:</strong>
              <div>Avg Goals: ${statsA.avgFor.toFixed(2)}</div>
              <div>Avg Conceded: ${statsA.avgAgainst.toFixed(2)}</div>
            </div>
            <div class="mb-2">
              <strong>Home:</strong>
              <div>Goals: ${statsA.homeStats.avgFor.toFixed(2)}</div>
              <div>Conceded: ${statsA.homeStats.avgAgainst.toFixed(2)}</div>
            </div>
            <div>
              <strong>Away:</strong>
              <div>Goals: ${statsA.awayStats.avgFor.toFixed(2)}</div>
              <div>Conceded: ${statsA.awayStats.avgAgainst.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <h5>${teamB}</h5>
            <div class="mb-2">
              <strong>Overall:</strong>
              <div>Avg Goals: ${statsB.avgFor.toFixed(2)}</div>
              <div>Avg Conceded: ${statsB.avgAgainst.toFixed(2)}</div>
            </div>
            <div class="mb-2">
              <strong>Home:</strong>
              <div>Goals: ${statsB.homeStats.avgFor.toFixed(2)}</div>
              <div>Conceded: ${statsB.homeStats.avgAgainst.toFixed(2)}</div>
            </div>
            <div>
              <strong>Away:</strong>
              <div>Goals: ${statsB.awayStats.avgFor.toFixed(2)}</div>
              <div>Conceded: ${statsB.awayStats.avgAgainst.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    box.classList.remove("d-none");
}

function resetSystem() {
    matchData = [];
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`matchInput${i}`).value = "";
    }
    document.getElementById("teamA").innerHTML = "";
    document.getElementById("teamB").innerHTML = "";
    document.getElementById("matchHistory").innerHTML = "";
    document.getElementById("predictionResult").classList.add("d-none");
    document.getElementById("comparisonBox").classList.add("d-none");
    alert("System has been reset. Ready for new match data.");
}

// Initialize Bootstrap tooltips
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
