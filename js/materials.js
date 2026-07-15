const ARTICLES_URL = "data/articles.json";

const grid = document.getElementById("materials-grid");
const tagsBar = document.getElementById("materials-tags");

let allArticles = [];
let activeTag = "all";

if(grid){
    fetch(ARTICLES_URL)
        .then(r => r.json())
        .then(articles => {
            allArticles = articles
                .filter(a => !a.tags.includes("новость"))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            renderTags();
            renderGrid();
        })
        .catch(err => {
            console.error("Не удалось загрузить материалы:", err);
            grid.innerHTML = "<p>Не удалось загрузить материалы.</p>";
        });
}

function renderTags(){

    if(!tagsBar) return;

    const uniqueTags = [...new Set(allArticles.flatMap(a => a.tags))].sort();

    tagsBar.innerHTML = "";

    const allBtn = createTagButton("Все", "all");
    tagsBar.appendChild(allBtn);

    uniqueTags.forEach(tag => {
        tagsBar.appendChild(createTagButton(tag, tag));
    });
}

function createTagButton(label, value){

    const btn = document.createElement("button");
    btn.className = "tag-filter" + (value === activeTag ? " active" : "");
    btn.textContent = label;

    btn.addEventListener("click", () => {
        activeTag = value;
        tagsBar.querySelectorAll(".tag-filter").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderGrid();
    });

    return btn;
}

function renderGrid(){

    const filtered = activeTag === "all"
        ? allArticles
        : allArticles.filter(a => a.tags.includes(activeTag));

    if(filtered.length === 0){
        grid.innerHTML = "<p>Нет материалов с этим тегом.</p>";
        return;
    }

    grid.innerHTML = "";

    filtered.forEach(article => {

        const card = document.createElement("a");
        card.href = `article.html?slug=${encodeURIComponent(article.slug)}`;
        card.className = "material-card";

        card.innerHTML = `
            ${article.cover ? `<img src="${article.cover}" alt="${article.title}" class="material-card-image" onerror="this.style.display='none'">` : ""}
            <div class="article-tags">
                ${article.tags.map(t => `<span class="tag-badge">${t}</span>`).join("")}
            </div>
            <h3>${article.title}</h3>
            <p>${article.excerpt}</p>
        `;

        grid.appendChild(card);
    });
}