const NEWS_ARTICLES_URL = "data/articles.json";

const newsGrid = document.getElementById("news-grid");

const newsMonthNamesGenitive = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

if(newsGrid){
    fetch(NEWS_ARTICLES_URL)
        .then(r => r.json())
        .then(articles => renderNews(articles))
        .catch(err => {
            console.error("Не удалось загрузить новости:", err);
            newsGrid.innerHTML = "<p>Не удалось загрузить новости.</p>";
        });
}

function renderNews(articles){

    const news = articles
        .filter(a => a.tags.includes("новость"))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if(news.length === 0){
        newsGrid.innerHTML = "<p>Новостей пока нет.</p>";
        return;
    }

    newsGrid.innerHTML = "";

    news.forEach(article => {

        const card = document.createElement("a");
        card.href = `article.html?slug=${encodeURIComponent(article.slug)}`;
        card.className = "news-card";

        card.innerHTML = `
            <div class="news-date">${formatDate(article.date)}</div>
            <h3>${article.title}</h3>
            <p>${article.excerpt}</p>
            <span class="read-more">Читать дальше <i class="fas fa-arrow-right"></i></span>
        `;

        newsGrid.appendChild(card);
    });
}

function formatDate(iso){
    const d = new Date(iso + "T00:00:00");
    return `${d.getDate()} ${newsMonthNamesGenitive[d.getMonth()]} ${d.getFullYear()}`;
}