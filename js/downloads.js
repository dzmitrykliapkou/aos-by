const DOWNLOADS_URL = "data/downloads.json";

const grid = document.getElementById("downloads-grid");
const tagsBar = document.getElementById("downloads-tags");

let allDownloads = [];
let activeCategory = "all";

if(grid){
    fetch(DOWNLOADS_URL)
        .then(r => r.json())
        .then(downloads => {
            allDownloads = downloads
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            renderTags();
            renderGrid();
        })
        .catch(err => {
            console.error("Не удалось загрузить загрузки:", err);
            grid.innerHTML = "<p>Не удалось загрузить список файлов.</p>";
        });
}

function renderTags(){

    if(!tagsBar) return;

    const uniqueCategories = [...new Set(allDownloads.map(d => d.category))].sort();

    tagsBar.innerHTML = "";

    const allBtn = createTagButton("Все", "all");
    tagsBar.appendChild(allBtn);

    uniqueCategories.forEach(category => {
        tagsBar.appendChild(createTagButton(category, category));
    });
}

function createTagButton(label, value){

    const btn = document.createElement("button");
    btn.className = "tag-filter" + (value === activeCategory ? " active" : "");
    btn.textContent = label;

    btn.addEventListener("click", () => {
        activeCategory = value;
        tagsBar.querySelectorAll(".tag-filter").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderGrid();
    });

    return btn;
}

function renderGrid(){

    const filtered = activeCategory === "all"
        ? allDownloads
        : allDownloads.filter(d => d.category === activeCategory);

    if(filtered.length === 0){
        grid.innerHTML = "<p>Нет файлов в этой категории.</p>";
        return;
    }

    grid.innerHTML = "";

    filtered.forEach(item => {

        const card = document.createElement("a");
        card.href = item.driveLink;
        card.className = "material-card";
        card.target = "_blank";
        card.rel = "noopener";

        card.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <span class="tag-badge">${item.category}</span>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
        `;

        grid.appendChild(card);
    });
}