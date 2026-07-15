const ARTICLES_URL = "data/articles.json";

const container = document.getElementById("article-content");

const monthNamesGenitive = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

if(container){
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if(!slug){
        container.innerHTML = "<p>Статья не найдена.</p>";
    } else {
        loadArticle(slug);
    }
}

async function loadArticle(slug){

    try{

        const articles = await fetch(ARTICLES_URL).then(r => r.json());
        const article = articles.find(a => a.slug === slug);

        if(!article){
            container.innerHTML = "<p>Статья не найдена.</p>";
            return;
        }

        document.title = `${article.title} — Age of Sigmar Belarus`;
        document.getElementById("page-title").textContent = article.title;

        const mdText = await fetch(article.mdFile).then(r => {
            if(!r.ok) throw new Error("Не удалось загрузить текст статьи");
            return r.text();
        });

        const bodyHtml = marked.parse(mdText);

        container.innerHTML = `
            ${article.cover ? `<img src="${article.cover}" alt="${article.title}" class="article-cover" onerror="this.style.display='none'">` : ""}

            <div class="article-tags">
                ${article.tags.map(t => `<span class="tag-badge">${t}</span>`).join("")}
            </div>

            <h1>${article.title}</h1>

            <p class="article-meta">
                ${formatDate(article.date)} · ${article.author}
            </p>

            <div class="article-body">
                ${bodyHtml}
            </div>
        `;

    } catch(err){
        console.error(err);
        container.innerHTML = "<p>Не удалось загрузить статью.</p>";
    }
}

function formatDate(iso){
    const d = new Date(iso + "T00:00:00");
    return `${d.getDate()} ${monthNamesGenitive[d.getMonth()]} ${d.getFullYear()}`;
}