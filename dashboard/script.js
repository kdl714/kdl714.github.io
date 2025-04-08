// Sample mock data for Jira and Notes
const workItems = [
    {
        type: "Jira",
        title: "Jira Task: Build new feature",
        dueDate: "2025-04-10",
        details: "Implement a new feature as per the specifications.",
        link: "https://jira.company.com/browse/ABC-123"
    },
    {
        type: "Note",
        title: "Meeting with John",
        dueDate: "2025-04-08",
        details: "Discuss project roadmap and deliverables.",
        link: ""
    },
    {
        type: "Figma",
        title: "Design Review",
        dueDate: "2025-04-09",
        details: "Review the latest design prototype for the app.",
        link: "https://www.figma.com/file/xyz123/design-prototype"
    }
];

// Function to create a card
function createCard(item) {
    const card = document.createElement('div');
    card.classList.add('card');

    const title = document.createElement('h3');
    title.textContent = item.title;

    const details = document.createElement('p');
    details.textContent = item.details;

    const dueDate = document.createElement('div');
    dueDate.classList.add('due-date');
    dueDate.textContent = `Due: ${item.dueDate}`;

    const link = document.createElement('a');
    if (item.link) {
        link.textContent = "View More";
        link.href = item.link;
        link.target = "_blank";
    }

    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(dueDate);
    if (item.link) card.appendChild(link);

    return card;
}

// Function to render all cards
function renderCards() {
    const cardContainer = document.querySelector('.card-container');
    cardContainer.innerHTML = ""; // Clear existing cards

    workItems.forEach(item => {
        const card = createCard(item);
        cardContainer.appendChild(card);
    });

    // Set the last updated time
    const lastUpdated = document.getElementById('last-updated');
    lastUpdated.textContent = new Date().toLocaleString();
}

// Initial render of cards when page loads
document.addEventListener("DOMContentLoaded", renderCards);
