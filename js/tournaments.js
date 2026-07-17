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

    const registration = upcoming.filter(e => Boolean(e.url));
    const planned = upcoming.filter(e => !e.url);

    const past = tournaments
        .filter(e => e.date < todayIso)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // последний прошедший первым

    if(tournaments.length === 0){
        grid.innerHTML = "<p>Турниров пока не запланировано.</p>";
        return;
    }

    grid.innerHTML = "";

    if(registration.length){
        grid.appendChild(createSectionTitle("Совсем скоро"));
        const registrationGrid = createGrid();
        registration.forEach(e => registrationGrid.appendChild(createCard(e, "registration")));
        grid.appendChild(registrationGrid);
    }

    if(planned.length){
        grid.appendChild(createSectionTitle("В перспективе"));
        const plannedGrid = createGrid();
        planned.forEach(e => plannedGrid.appendChild(createCard(e, "planned")));
        grid.appendChild(plannedGrid);
    }

    if(past.length){
        grid.appendChild(createSectionTitle("Архив результатов"));
        const pastGrid = createGrid();
        past.forEach(e => pastGrid.appendChild(createCard(e, "past")));
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

const STATUS_META = {
    registration: { cardClass: "upcoming registration", badgeClass: "upcoming-badge registration-badge", badgeText: "Подробнее" },
    planned:      { cardClass: "upcoming planned",      badgeClass: "upcoming-badge planned-badge",      badgeText: "Планируется" },
    past:         { cardClass: "",                      badgeClass: "",                                  badgeText: "Результаты" }
};

function createCard(event, status){

    const hasLink = Boolean(event.url);
    const card = document.createElement(hasLink ? "a" : "div");

    const meta = STATUS_META[status];

    card.className = "tournament-card" + (meta.cardClass ? " " + meta.cardClass : "");

    if(hasLink) card.href = event.url;

    card.innerHTML = `
        <span class="tournament-date">${formatDate(event.date)}</span>
        <h3>${event.title}</h3>
        ${event.location ? `<p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>` : ""}
        <span class="badge${meta.badgeClass ? " " + meta.badgeClass : ""}">${meta.badgeText}</span>
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