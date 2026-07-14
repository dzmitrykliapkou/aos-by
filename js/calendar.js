const EVENTS_URL = "data/events.json";

const calendarContainer = document.getElementById("events-calendar");

const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
];

const weekDays = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

fetch(EVENTS_URL)
    .then(r => r.json())
    .then(events => buildCalendar(events));

function buildCalendar(events){

    const today = new Date();

    const currentMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    for(let i=0;i<4;i++){

        const monthDate = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth()+i,
            1
        );

        calendarContainer.appendChild(
            createMonth(monthDate,events)
        );

    }

}

function createMonth(monthDate,events){

    const card=document.createElement("div");
    card.className="calendar-month";

    const title=document.createElement("h3");

    title.textContent=
        `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

    card.appendChild(title);

    const table=document.createElement("table");

    const head=document.createElement("thead");
    const hr=document.createElement("tr");

    weekDays.forEach(day=>{
        const th=document.createElement("th");
        th.textContent=day;
        hr.appendChild(th);
    });

    head.appendChild(hr);

    table.appendChild(head);

    const body=document.createElement("tbody");

    const firstDay=new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
    );

    const daysInMonth=new Date(
        monthDate.getFullYear(),
        monthDate.getMonth()+1,
        0
    ).getDate();

    let weekday=(firstDay.getDay()+6)%7;

    let row=document.createElement("tr");

    for(let i=0;i<weekday;i++){
        row.appendChild(document.createElement("td"));
    }

    for(let day=1;day<=daysInMonth;day++){

        if(weekday===7){
            body.appendChild(row);
            row=document.createElement("tr");
            weekday=0;
        }

        const td=document.createElement("td");

        td.textContent=day;

        const iso=
            `${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

        const event=events.find(e=>e.date===iso);

        if(event){

            td.classList.add("event-day");

            td.title=event.title;

            td.onclick=()=>{
                location.href=event.url;
            };

        }

        row.appendChild(td);

        weekday++;

    }

    while(weekday<7){
        row.appendChild(document.createElement("td"));
        weekday++;
    }

    body.appendChild(row);

    table.appendChild(body);

    card.appendChild(table);

    return card;

}
