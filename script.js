document.addEventListener('DOMContentLoaded', function () {
    // Плавная прокрутка для якорей
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// =====================
// Страница турнира
// =====================

function renderTournament(jsonPath) {
    fetch(jsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error("Не удалось загрузить data.json");
            }
            return response.json();
        })
        .then(data => {

            const container = document.getElementById('tournament-content');
            if (!container) return;

            let html = `
                <h1>${data.name}</h1>
                <p class="subtitle">${data.date} · ${data.location}</p>

                <p><strong>Организатор:</strong> ${data.organizer}</p>

                <a href="${data.rulesLink}" class="btn-sm" target="_blank">
                    <i class="fas fa-file-alt"></i>
                    Регламент
                </a>

                <hr class="divider">
            `;

            html += `<h2>Участники (${data.players.length})</h2>`;

            if (data.players.length === 0) {

                html += `<p>Список участников пока не объявлен.</p>`;

            } else {

                let players = [...data.players];

                if (data.finished && players[0]?.points !== undefined) {
                    players.sort((a, b) => b.points - a.points);
                }

                players.forEach((player, index) => {

                    html += `
                        <details class="player-details"
                                 data-roster-file="${player.rosterFile || ""}">

                            <summary>
                                <span class="player-name">
                                    ${index + 1}. ${player.name}
                                </span>

                                <span class="player-army">
                                    — ${player.army}
                                </span>
                            </summary>

                            <div class="roster"></div>

                        </details>
                    `;
                });
            }

            // Таблица результатов

            if (data.finished && data.players.some(p => p.points !== undefined)) {

                let sortedPlayers = [...data.players].sort((a, b) => b.points - a.points);

                html += `
                    <h2 style="margin-top:40px;">Результаты</h2>

                    <table class="bcp-table">
                        <thead>
                            <tr>
                                <th>Место</th>
                                <th>Игрок</th>
                                <th>Армия</th>
                                <th class="result-cell">W</th>
                                <th class="result-cell">L</th>
                                <th class="result-cell">D</th>
                                <th>Очки</th>
                            </tr>
                        </thead>

                        <tbody>
                `;

                sortedPlayers.forEach((player, index) => {

                    html += `
                        <tr>

                            <td class="rank">${index + 1}</td>

                            <td>${player.name}</td>

                            <td>${player.army}</td>

                            <td class="win">${player.wins || 0}</td>

                            <td class="loss">${player.losses || 0}</td>

                            <td class="draw">${player.draws || 0}</td>

                            <td class="points">${player.points || 0}</td>

                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;
            }

            container.innerHTML = html;

            document.title = `${data.name} — Age of Sigmar Belarus`;

            // ==========================
            // Подключаем загрузку ростеров
            // ==========================

            container.querySelectorAll(".player-details").forEach(details => {
                details.addEventListener("toggle", handleRosterToggle);
            });

        })
        .catch(err => {

            console.error(err);

            const container = document.getElementById("tournament-content");

            if (container) {
                container.innerHTML = "<p>Ошибка загрузки данных турнира.</p>";
            }

        });
}

// =========================
// Загрузка ростеров
// =========================

async function handleRosterToggle() {

    if (!this.open) return;

    if (this.dataset.loaded === "true") return;

    const rosterDiv = this.querySelector(".roster");

    const file = this.dataset.rosterFile;

    if (!file || !rosterDiv) return;

    console.log("Loading roster:", file);

    try {

        const response = await fetch(file);

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }

        const text = await response.text();

        rosterDiv.innerHTML = `
            <h4>Ростер</h4>
            <pre>${escapeHtml(text)}</pre>
        `;

        this.dataset.loaded = "true";

    } catch (err) {

        console.error(err);

        rosterDiv.innerHTML = `
            <p>Не удалось загрузить ростер.</p>
        `;
    }
}

// =========================
// Защита HTML
// =========================

function escapeHtml(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
