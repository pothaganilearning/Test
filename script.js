const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

let holidays = [];
let stockData = {};

// Fetch holiday data
function fetchHolidayData() {
    return fetch('holidays.json')
        .then(response => response.json())
        .then(data => {
            holidays = data.map(dateStr => new Date(dateStr.split('-').reverse().join('-')));
        });
}

// Fetch stock data
function fetchStockData() {
    return fetch('stockData.json')
        .then(response => response.json())
        .then(data => {
            stockData = data.Dates.reduce((acc, entry) => {
                acc[entry.PostDate] = {
                    stockNames: entry.StockNames.length > 0 ? entry.StockNames.join(', ') : 'N/A',
                    nextPostDate: entry.PostDateNext || 'N/A'
                };
                return acc;
            }, {});
        });
}

// Initialize calendar rendering and fetch data
document.addEventListener('DOMContentLoaded', () => {
    Promise.all([fetchHolidayData(), fetchStockData()]).then(() => {
        renderCalendar();
        makeDatesClickable();
    });
});

function generateCalendar(month, year) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    let calendar = `<div class="calendar"><div class="month">${monthNames[month]} ${year}</div><div class="days">`;

    for (let i = 0; i < firstDay; i++) {
        calendar += '<div class="empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const isHoliday = holidays.some(holiday => holiday.toDateString() === dateObj.toDateString());
        const isSat = dayOfWeek === 'Sat';
        const isSun = dayOfWeek === 'Sun';

        let className = '';
        if (isHoliday) {
            className = 'holiday';
        } else if (isSat) {
            className = 'saturday';
        } else if (isSun) {
            className = 'sunday';
        }

        const formattedDate = formatDate(dateObj);
        calendar += `<div class="${className}" data-date="${formattedDate}">${day}</div>`;
    }

    calendar += '</div></div>';
    return calendar;
}

function renderCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    let calendarHTML = '';

    for (let month = 0; month < 12; month++) {
        calendarHTML += generateCalendar(month, 2024);
    }

    calendarContainer.innerHTML = calendarHTML;
}

function makeDatesClickable() {
    const dates = document.querySelectorAll('.days div');
    dates.forEach(date => {
        if (date.innerText.trim() !== '') {
            date.addEventListener('click', function () {
                const clickedDate = this.dataset.date;
                document.getElementById('dateInput').value = clickedDate.split('-').reverse().join('-'); // Set date in YYYY-MM-DD format
                searchData();
            });
        }
    });
}

function searchData(event) {
    if (event) event.preventDefault(); // Prevent form submission

    const selectedDate = document.getElementById('dateInput').value;
    const formattedDate = formatDateForDisplay(new Date(selectedDate));
    const stockInfo = stockData[formattedDate] || { stockNames: 'N/A', nextPostDate: 'N/A' };

    // Logic for "Pre-Post Days" table
    const prePostDays = getPrePostDays(new Date(selectedDate));

    // Logic for "Both Matched" table
    const bothMatched = getMatchingDates(new Date(selectedDate).getDate(), new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }));

    // Logic for "SAT Matched" table
    const satMatched = getSatMatchedDates(new Date(selectedDate).getDate());

    // Logic for "Sun Matched" table
    const sunMatched = getMatchingDates(new Date(selectedDate).getDate(), 'Sun');

    // Logic for "Holly Days Matched" table
    const hollyDaysMatched = getHollyDaysMatched(new Date(selectedDate).getDate());

    // Display results
    displayPrePostDays('.result-search-1', prePostDays);
    displayStockData('.result-search-2', stockInfo, formattedDate);
    displayMatchedDates('.result-search-3', bothMatched);
    displayMatchedDates('.result-search-4', satMatched);
    displayMatchedDates('.result-search-5', sunMatched);
    displayMatchedHolidays('.result-search-6', hollyDaysMatched);
}

function getPrePostDays(selectedDate) {
    const prePostDays = [];
    const selectedDay = selectedDate.getDate();
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();

    for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();

        let preDay = new Date(selectedYear, month, selectedDay - 1);
        while (preDay.getDate() !== selectedDay - 1 && preDay.getMonth() === month) {
            preDay.setDate(preDay.getDate() - 1);
        }
        if (preDay.getDate() !== selectedDay - 1 || holidays.some(holiday => holiday.toDateString() === preDay.toDateString()) || preDay.getDay() === 0 || preDay.getDay() === 6) {
            preDay = findPreviousWorkingDay(preDay, month);
        }
        
        let postDay = new Date(selectedYear, month, selectedDay + 1);
        while (postDay.getDate() !== selectedDay + 1 && postDay.getMonth() === month) {
            postDay.setDate(postDay.getDate() + 1);
        }
        if (postDay.getDate() !== selectedDay + 1 || holidays.some(holiday => holiday.toDateString() === postDay.toDateString()) || postDay.getDay() === 0 || postDay.getDay() === 6) {
            postDay = findNextWorkingDay(postDay, month);
        }

        prePostDays.push({
            preDay: formatDate(preDay),
            postDay: formatDate(postDay)
        });
    }
    return prePostDays;
}

function findPreviousWorkingDay(date, month) {
    while (date.getMonth() === month && (holidays.some(holiday => holiday.toDateString() === date.toDateString()) || date.getDay() === 0 || date.getDay() === 6)) {
        date.setDate(date.getDate() - 1);
    }
    return date;
}

function findNextWorkingDay(date, month) {
    while (date.getMonth() === month && (holidays.some(holiday => holiday.toDateString() === date.toDateString()) || date.getDay() === 0 || date.getDay() === 6)) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

function formatDate(date) {
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} (${date.toLocaleDateString('en-US', { weekday: 'short' })})`;
}

function formatDateForDisplay(date) {
    return formatDate(date);
}

function getMatchingDates(day, weekday) {
    const matchedDates = [];
    for (let month = 0; month < 12; month++) {
        const monthDays = new Date(2024, month + 1, 0).getDate();
        for (let date = 1; date <= monthDays; date++) {
            const dateObj = new Date(2024, month, date);
            if (date === day && dateObj.toLocaleDateString('en-US', { weekday: 'short' }) === weekday) {
                matchedDates.push(dateObj);
            }
        }
    }
    return matchedDates;
}

function getSatMatchedDates(day) {
    const matchedDates = [];
    for (let month = 0; month < 12; month++) {
        const monthDays = new Date(2024, month + 1, 0).getDate();
        for (let date = 1; date <= monthDays; date++) {
            const dateObj = new Date(2024, month, date);
            if (date === day && dateObj.toLocaleDateString('en-US', { weekday: 'short' }) === 'Sat') {
                matchedDates.push(dateObj);
            }
        }
    }
    return matchedDates;
}

function getHollyDaysMatched(selectedDay) {
    const matchedHolidays = holidays.filter(holiday => {
        return holiday.getDate() === selectedDay;
    });
    
    return matchedHolidays;
}

function displayPrePostDays(selector, prePostDays) {
    const container = document.querySelector(selector);
    if (container) {
        const formattedDates = prePostDays.map(days => {
            return `<div>${days.preDay} - ${days.postDay}</div>`;
        }).join('');
        container.innerHTML = formattedDates;
    }
}

function displayMatchedDates(selector, matchedDates) {
    const container = document.querySelector(selector);
    if (container) {
        const formattedDates = matchedDates.map(date => {
            return `<div>${formatDate(date)}</div>`;
        }).join('');
        container.innerHTML = formattedDates;
    }
}

function displayMatchedHolidays(selector, matchedHolidays) {
    const container = document.querySelector(selector);
    if (container) {
        const formattedDates = matchedHolidays.map(date => {
            return `<div>${formatDate(date)}</div>`;
        }).join('');
        container.innerHTML = formattedDates;
    }
}

function displayStockData(selector, stockInfo, date) {
    const container = document.querySelector(selector);
    if (container) {
        container.innerHTML = `<div>Date: ${date}<br>Stock Names: ${stockInfo.stockNames}<br>Next Post Date: ${stockInfo.nextPostDate}</div>`;
    }
}
