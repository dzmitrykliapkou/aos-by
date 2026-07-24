const EVENTS_URL = "data/events.json";

const calendarWrapper = document.getElementById("calendar-wrapper");
const prevBtn = document.getElementById("calendar-prev");
const nextBtn = document.getElementById("calendar-next");

const modal = document.getElementById("event-modal");
const modalBadge = modal?.querySelector(".event-modal-badge");
const modalTitle = modal?.querySelector(".event-modal-title");
const modalDate = modal?.querySelector(".event-modal-date");
const modalLink = modal?.querySelector(".event-modal-link");
const modalLocation = modal?.querySelector(".event-modal-location span");
const modalOrganizer = modal?.querySelector(".event-modal-organizer span");

const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const monthNamesGenitive = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const weekDays = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const today = new Date();
const todayIso = toIso(today);

fetch(EVENTS_URL)
    .then(r => r.json())
    .then(events => {
        buildCalendar(events);
        setupArrows();
        setupModal();
        scrollToToday();
        fixAnchorScroll();
    })
    .catch(err => console.error("Не удалось загрузить события:", err));

function toIso(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function buildCalendar(events){

    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const MONTHS_BEFORE = 1;
    const MONTHS_AFTER = 4;

    for(let i = -MONTHS_BEFORE; i <= MONTHS_AFTER; i++){
        const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
        calendarWrapper.appendChild(createMonth(monthDate, events));
    }
}

function createMonth(monthDate, events){

    const card = document.createElement("div");
    card.className = "calendar-month";

    const isCurrentMonth =
        monthDate.getFullYear() === today.getFullYear() &&
        monthDate.getMonth() === today.getMonth();

    if(isCurrentMonth) card.classList.add("current-month");

    const title = document.createElement("h3");
    title.textContent = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
    card.appendChild(title);

    const table = document.createElement("table");

    const head = document.createElement("thead");
    const headRow = document.createElement("tr");

    weekDays.forEach(day => {
        const th = document.createElement("th");
        th.textContent = day;
        headRow.appendChild(th);
    });

    head.appendChild(headRow);
    table.appendChild(head);

    const body = document.createElement("tbody");

    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    let weekday = (firstDay.getDay() + 6) % 7;
    let row = document.createElement("tr");

    for(let i = 0; i < weekday; i++){
        row.appendChild(document.createElement("td"));
    }

    for(let day = 1; day <= daysInMonth; day++){

        if(weekday === 7){
            body.appendChild(row);
            row = document.createElement("tr");
            weekday = 0;
        }

        const td = document.createElement("td");

        const iso = `${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayEvents = events.filter(e => e.date === iso);

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = day;
        td.appendChild(dayNumber);

        if(iso === todayIso){
            td.classList.add("today");
        }

        if(dayEvents.length){

            td.classList.add("event-day");
            td.setAttribute("tabindex", "0");
            td.setAttribute("role", "button");
            td.setAttribute(
                "aria-label",
                `${dayEvents[0].title}, ${day} ${monthNamesGenitive[monthDate.getMonth()]}`
            );

            const open = () => openEventModal(dayEvents[0]);

            td.addEventListener("click", open);
            td.addEventListener("keydown", e => {
                if(e.key === "Enter" || e.key === " "){
                    e.preventDefault();
                    open();
                }
            });

            if(dayEvents.length > 1){
                const dot = document.createElement("span");
                dot.className = "event-dot-extra";
                td.appendChild(dot);
            }
        }

        row.appendChild(td);
        weekday++;
    }

    while(weekday < 7){
        row.appendChild(document.createElement("td"));
        weekday++;
    }

    body.appendChild(row);
    table.appendChild(body);
    card.appendChild(table);

    return card;
}

function openEventModal(event){

    if(!modal) return;

    const dateObj = new Date(event.date + "T00:00:00");
    const dateLabel = `${dateObj.getDate()} ${monthNamesGenitive[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    modalBadge.textContent = event.category || "Событие";
    modalTitle.textContent = event.title;
    modalDate.textContent = dateLabel;

    if(event.location){
        modalLocation.textContent = event.location;
        modalLocation.parentElement.style.display = "flex";
    } else {
        modalLocation.parentElement.style.display = "none";
    }

    if(event.organizer){
        modalOrganizer.textContent = event.organizer;
        modalOrganizer.parentElement.style.display = "flex";
    } else {
        modalOrganizer.parentElement.style.display = "none";
    }

    if(event.url){
        modalLink.href = event.url;
        modalLink.style.display = "inline-block";
    } else {
        modalLink.style.display = "none";
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeEventModal(){
    if(!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

function setupModal(){
    if(!modal) return;

    modal.querySelectorAll("[data-close]").forEach(el => {
        el.addEventListener("click", closeEventModal);
    });

    document.addEventListener("keydown", e => {
        if(e.key === "Escape") closeEventModal();
    });
}

function setupArrows(){

    if(!prevBtn || !nextBtn || !calendarWrapper) return;

    const scrollByCard = direction => {
        const card = calendarWrapper.querySelector(".calendar-month");
        if(!card) return;

        const gap = parseInt(getComputedStyle(calendarWrapper).columnGap || "28", 10);
        const distance = card.getBoundingClientRect().width + gap;

        calendarWrapper.scrollBy({ left: distance * direction, behavior: "smooth" });
    };

    prevBtn.addEventListener("click", () => scrollByCard(-1));
    nextBtn.addEventListener("click", () => scrollByCard(1));

    const updateArrows = () => {
        const maxScroll = calendarWrapper.scrollWidth - calendarWrapper.clientWidth - 2;
        prevBtn.classList.toggle("is-disabled", calendarWrapper.scrollLeft <= 0);
        nextBtn.classList.toggle("is-disabled", calendarWrapper.scrollLeft >= maxScroll);
    };

    calendarWrapper.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    updateArrows();
}

function scrollToToday(){
    const currentCard = calendarWrapper.querySelector(".current-month");
    if(currentCard){
        currentCard.scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
    }
}