const FACTION_STATS_URL = "data/faction-stats.json";

const tabsBar = document.getElementById("stats-tabs");
const panel = document.getElementById("stats-panel");

let statsData = null;

if(panel){
    fetch(FACTION_STATS_URL)
        .then(r => r.json())
        .then(data => {
            statsData = data;
            renderActiveTab();
        })
        .catch(err => {
            console.error("Не удалось загрузить статистику турниров:", err);
            panel.innerHTML = "<p>Не удалось загрузить статистику.</p>";
        });

    tabsBar.querySelectorAll(".stats-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            tabsBar.querySelectorAll(".stats-tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderActiveTab(btn.dataset.tab);
        });
    });
}

function renderActiveTab(tab){

    if(!statsData) return;

    const activeTab = tab || tabsBar.querySelector(".stats-tab.active").dataset.tab;

    panel.innerHTML = "";

    if(activeTab === "pickRate") panel.appendChild(renderPickRate(statsData));
    else if(activeTab === "winRate") panel.appendChild(renderWinRate(statsData));
    else if(activeTab === "tournamentWins") panel.appendChild(renderTournamentWins(statsData));
}

function renderPickRate(data){

    if(!data.pickRate.length){
        return emptyMessage("Пока нет данных о выборе фракций.");
    }

    return renderBars(data.pickRate.map(i => ({
        label: i.faction,
        value: i.percent,
        valueText: `${i.percent}% (${i.count})`,
    })));
}

function renderWinRate(data){

    if(!data.winRate.length){
        return emptyMessage(`Показаны фракции минимум с ${data.minGamesForWinrate} играми — пока таких нет.`);
    }

    return renderBars(data.winRate.map(i => ({
        label: i.faction,
        value: i.percent,
        valueText: `${i.percent}% (${i.wins}-${i.losses}-${i.draws})`,
    })));
}

function renderTournamentWins(data){

    if(!data.tournamentWins.length){
        return emptyMessage("Пока нет завершённых турниров с результатами.");
    }

    const max = Math.max(...data.tournamentWins.map(i => i.count));

    return renderBars(data.tournamentWins.map(i => ({
        label: i.faction,
        value: (i.count / max) * 100,
        valueText: `${i.count}`,
    })));
}

function renderBars(rows){

    const wrap = document.createElement("div");
    wrap.className = "stats-bars";

    rows.forEach(row => {
        const rowEl = document.createElement("div");
        rowEl.className = "stat-bar-row";
        rowEl.innerHTML = `
            <span class="stat-bar-label">${row.label}</span>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${row.value}%"></div></div>
            <span class="stat-bar-value">${row.valueText}</span>
        `;
        wrap.appendChild(rowEl);
    });

    return wrap;
}

function emptyMessage(text){
    const p = document.createElement("p");
    p.textContent = text;
    return p;
}