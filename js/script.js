document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href^="#"]:not(.event-modal-link)').forEach(anchor => {
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

function fixAnchorScroll(){
    if(!location.hash) return;
    const target = document.querySelector(location.hash);
    if(target) target.scrollIntoView();
}

window.addEventListener('load', fixAnchorScroll);

document.addEventListener("DOMContentLoaded", () => {
    const banner = document.getElementById("dev-banner");
    const closeBtn = document.getElementById("close-banner");

    if (!banner || !closeBtn) return;

    const storageKey = "devBannerClosed";

    if (localStorage.getItem(storageKey) === "true") {
        banner.classList.add("hidden");
    } else {
        document.body.classList.add("banner-visible");
    }

    closeBtn.addEventListener("click", () => {
        banner.classList.add("hidden");
        document.body.classList.remove("banner-visible");
        localStorage.setItem(storageKey, "true");
    });
});