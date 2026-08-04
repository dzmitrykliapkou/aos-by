const LEADERBOARD_URL = "data/community-season.json";

const leaderboard = document.getElementById("cs-leaderboard");

if(leaderboard){
    fetch(LEADERBOARD_URL)
        .then(r => r.json())
        .then(entries => renderLeaderboard(entries))
        .catch(err => {
            console.error("Не удалось загрузить таблицу Community Season:", err);
            leaderboard.innerHTML = "<p class=\"cs-empty\">Не удалось загрузить таблицу.</p>";
        });
}

function renderLeaderboard(entries){

    if(!entries || entries.length === 0){
        leaderboard.innerHTML = `
            <p class="cs-empty">Таблица участников появится здесь, как только будут первые начисления Community Points.</p>
        `;
        return;
    }

    const ranked = [...entries].sort((a, b) => (b.points || 0) - (a.points || 0));

    const rows = ranked.map((entry, i) => `
        <tr>
            <td class="rank">${i + 1}</td>
            <td>${entry.name}</td>
            <td class="points">${entry.points || 0}</td>
        </tr>
    `).join("");

    leaderboard.innerHTML = `
        <table class="bcp-table cs-leaderboard">
            <thead><tr><th>Место</th><th>Участник</th><th>CP</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}