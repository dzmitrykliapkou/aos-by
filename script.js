document.addEventListener('DOMContentLoaded', function() {
    // Плавная прокрутка для якорных ссылок (на главной)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Рендер страницы турнира из data.json
function renderTournament(jsonPath) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('tournament-content');
            if (!container) return;

            let html = `
                <h1>${data.name}</h1>
                <p class="subtitle">${data.date} · ${data.location}</p>
                <p><strong>Организатор:</strong> ${data.organizer}</p>
                <a href="${data.rulesLink}" class="btn-sm" target="_blank"><i class="fas fa-file-pdf"></i> Регламент</a>
                <hr class="divider">
            `;

            html += `<h2>Участники (${data.players.length})</h2>`;
            if (data.players.length === 0) {
                html += '<p>Список участников пока не объявлен.</p>';
            } else {
                let players = [...data.players];
                if (data.finished && players[0].hasOwnProperty('points')) {
                    players.sort((a, b) => b.points - a.points);
                }

                players.forEach((player, index) => {
                    html += `
                        <details class="player-details" data-roster-file="${player.rosterFile || ''}">
                            <summary>
                                <span class="player-name">${index + 1}. ${player.name}</span>
                                <span class="player-army">— ${player.army}</span>
                            </summary>
                            <div class="roster"></div>
                        </details>
                    `;
                });
            }

            if (data.finished && data.players.some(p => p.hasOwnProperty('wins'))) {
                let sortedPlayers = [...data.players].sort((a, b) => b.points - a.points);

                html += `<h2 style="margin-top: 40px;">Результаты</h2>`;
                html += `<table class="bcp-table">
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
                    <tbody>`;

                sortedPlayers.forEach((player, idx) => {
                    html += `<tr>
                        <td class="rank">${idx + 1}</td>
                        <td>${player.name}</td>
                        <td>${player.army}</td>
                        <td class="win">${player.wins || 0}</td>
                        <td class="loss">${player.losses || 0}</td>
                        <td class="draw">${player.draws || 0}</td>
                        <td class="points">${player.points || 0}</td>
                    </tr>`;
                });

                html += `</tbody></table>`;
            }

            container.innerHTML = html;
            document.title = data.name + ' — Age of Sigmar Belarus';
        })
        .catch(err => {
            document.getElementById('tournament-content').innerHTML = '<p>Ошибка загрузки данных турнира.</p>';
            console.error(err);
        });
}

// Ленивая загрузка ростеров из txt при открытии details
document.addEventListener('toggle', function(event) {
    const details = event.target;
    if (!details.open || !details.classList.contains('player-details')) return;
    if (details.dataset.loaded === 'true') return;

    const rosterDiv = details.querySelector('.roster');
    const file = details.dataset.rosterFile;
    if (!file || !rosterDiv) return;

    fetch(file)
        .then(response => {
            if (!response.ok) throw new Error('Файл не найден');
            return response.text();
        })
        .then(text => {
            rosterDiv.innerHTML = `<h4>Ростер:</h4><pre>${escapeHtml(text)}</pre>`;
            details.dataset.loaded = 'true';
        })
        .catch(() => {
            rosterDiv.innerHTML = '<p>Не удалось загрузить ростер.</p>';
            details.dataset.loaded = 'true';
        });
});

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
