const EVENTS_URL = "data/events.json";
const TOURNAMENT_CATEGORY = "Турнир";

const grid = document.getElementById("tournaments-grid");

const monthNamesGenitive = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

if(grid){
    fetch(EVENTS_URL)
        .then(r => r.json())
        .then(events => renderTournaments(events))
        .catch(err => {
            console.error("Не удалось загрузить турниры:", err);
            grid.innerHTML = "<p>Не удалось загрузить список турниров.</p>";
        });
}

function renderTournaments(events){

    const todayIso = toIso(new Date());

    const tournaments = events.filter(e => e.category === TOURNAMENT_CATEGORY);

    const upcoming = tournaments
        .filter(e => e.date >= todayIso)
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // ближайший первым

    const past = tournaments
        .filter(e => e.date < todayIso)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // последний прошедший первым

    if(tournaments.length === 0){
        grid.innerHTML = "<p>Турниров пока не запланировано.</p>";
        return;
    }

    grid.innerHTML = "";

    if(upcoming.length){
        grid.appendChild(createSectionTitle("Ближайшие турниры"));
        const upcomingGrid = createGrid();
        upcoming.forEach(e => upcomingGrid.appendChild(createCard(e, true)));
        grid.appendChild(upcomingGrid);
    }

    if(past.length){
        grid.appendChild(createSectionTitle("Архив результатов"));
        const pastGrid = createGrid();
        past.forEach(e => pastGrid.appendChild(createCard(e, false)));
        grid.appendChild(pastGrid);
    }
}

function createSectionTitle(text){
    const h3 = document.createElement("h3");
    h3.className = "tournaments-section-title";
    h3.textContent = text;
    return h3;
}

function createGrid(){
    const div = document.createElement("div");
    div.className = "tournaments-grid";
    return div;
}

function createCard(event, isUpcoming){

    const hasLink = Boolean(event.url);
    const card = document.createElement(hasLink ? "a" : "div");

    card.className = "tournament-card" + (isUpcoming ? " upcoming" : "");

    if(hasLink) card.href = event.url;

    card.innerHTML = `
        <span class="tournament-date">${formatDate(event.date)}</span>
        <h3>${event.title}</h3>
        ${event.location ? `<p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>` : ""}
        <span class="badge ${isUpcoming ? "upcoming-badge" : ""}">${isUpcoming ? "Скоро" : "Результаты"}</span>
    `;

    return card;
}

function toIso(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatDate(iso){
    const d = new Date(iso + "T00:00:00");
    return `${d.getDate()} ${monthNamesGenitive[d.getMonth()]} ${d.getFullYear()}`;
}
