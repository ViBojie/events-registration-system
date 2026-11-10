// ==========================================================
// CCSICT EVENT REGISTRATION SYSTEM (Google Sheets Backend)
// ==========================================================

// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwREFtDXhlydLXQRgvBf8iWl-4kN8pQCcY9gGFuL8b7aq-zutd0V2gRoTTs9wzQ_VxU/exec";

// ---------- 1. EVENT DATA ----------
const events = [
  {
    name: "College Acquaintance Party",
    category: "Social",
    date: "2026-11-20",
    time: "5:00 PM",
    venue: "ISU Main Campus Gymnasium",
    description: "An evening of games, music, and meeting classmates and seniors across all CCSICT programs.",
    image: "https://cpu.edu.ph/wp-content/uploads/2025/08/CPU-CCS-kicks-off-the-school-year-with-Soiree-1.jpg",
    expect: ["Icebreaker games and team challenges", "Live music and performances", "Meet students and faculty from every year level"]
  },
  {
    name: "IT Career Seminar",
    category: "Career",
    date: "2026-12-02",
    time: "1:00 PM",
    venue: "CCSICT Building, Echague",
    description: "Guest talks with industry recruiters and alumni on getting your first job in tech.",
    image: "https://itdc.up.edu.ph/news/evsu-tech-talk/evsu2.JPG",
    expect: ["Talks from industry recruiters and alumni", "Resume and interview tips", "Q&A and networking after the program"]
  },
  {
    name: "Web Dev Workshop",
    category: "Workshop",
    date: "2026-12-15",
    time: "9:00 AM",
    venue: "CCSICT Computer Laboratory",
    description: "Hands-on introduction to HTML, CSS, and JavaScript. Bring a laptop if you have one.",
    image: "https://consynextech.com/Software-Services/images/about/03.png",
    expect: ["Build a simple web page from scratch", "Learn HTML, CSS, and JavaScript basics", "Guided practice with mentors"]
  },
  {
    name: "Hackathon 2026",
    category: "Competition",
    date: "2026-12-18",
    time: "8:00 AM",
    venue: "CCSICT Building, Echague",
    description: "A 24-hour team challenge to build a working prototype that solves a campus problem.",
    image: "https://api.hub.jhu.edu/factory/styles/default/files/styles/hub_xlarge/public/2023-09/hophacks-table092223.JPG",
    expect: ["Form a team and pick a campus problem", "24 hours to design and build a prototype", "Demo day with judges and prizes"]
  }
];

// ---------- 2. SMALL HELPERS ----------
const getById = id => document.getElementById(id);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(date) {
  return new Date(date + "T00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

let toastTimer;
function showToast(message, isError) {
  const toast = getById("toast");
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function showError(boxId, message) {
  const box = getById(boxId);
  box.textContent = message;
  box.className = "alert error";
  box.hidden = false;
}

function checkNameAndEmail(name, email) {
  if (name.length < 2) return "Enter a full name.";
  if (!emailPattern.test(email)) return "Enter a valid email address, like you@isu.edu.ph.";
  return "";
}

// ---------- 3. LOCAL PARTICIPANT STORAGE ----------
const STORAGE_KEY = "campus_participants";

function loadParticipants() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (error) {}
  return [];
}

let participants = loadParticipants();

function saveParticipants() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
  } catch (error) {}
}

// ---------- 4. PAGE NAVIGATION ----------
function showPage(name) {
  if (!["home", "register", "participants"].includes(name)) name = "home";

  document.querySelectorAll(".page").forEach(page => page.hidden = page.id !== name);
  document.querySelectorAll(".nav-btn").forEach(link => link.classList.toggle("active", link.dataset.page === name));

  if (name === "participants") renderParticipants();
  if (name === "home") updateStats();

  closeMenu();
  history.replaceState(null, "", "#" + name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeMenu() {
  getById("nav").classList.remove("open");
  getById("menu").setAttribute("aria-expanded", "false");
}

// ---------- 5. EVENT CARDS ----------
let selectedCategory = "All";
let searchText = "";

function renderCategoryButtons() {
  const box = getById("chips");
  box.innerHTML = "";

  const categories = ["All", ...new Set(events.map(e => e.category))];
  categories.forEach(category => {
    const button = makeElement("button", "chip" + (category === selectedCategory ? " on" : ""), category);
    button.addEventListener("click", () => {
      selectedCategory = category;
      renderCategoryButtons();
      renderEvents();
    });
    box.appendChild(button);
  });
}

function renderEvents() {
  const matches = events.filter(e =>
    (selectedCategory === "All" || e.category === selectedCategory) &&
    (e.name + e.description + e.venue + e.category).toLowerCase().includes(searchText)
  );

  getById("no-events").hidden = matches.length > 0;

  getById("events-list").innerHTML = matches.map(e => `
    <article class="card" data-name="${e.name}" tabindex="0">
      <img class="event-image" src="${e.image}" alt="${e.name}" loading="lazy">
      <div class="card-top">
        <small>${e.category}</small>
        <h3>${e.name}</h3>
      </div>
      <div class="card-body">
        <div>📅 ${formatDate(e.date)} · ${e.time}</div>
        <div>📍 ${e.venue}</div>
        <p class="desc">${e.description}</p>
        <div class="card-actions">
          <button class="btn ghost-d" data-action="details">Details</button>
          <button class="btn green" data-action="register">Register</button>
        </div>
      </div>
    </article>`).join("");
}

function handleCardClick(click) {
  const card = click.target.closest(".card");
  if (!card) return;

  const event = events.find(e => e.name === card.dataset.name);
  const button = click.target.closest("button");

  if (button && button.dataset.action === "register") goToRegister(event.name);
  else openDetails(event);
}

function openDetails(event) {
  getById("dt-img").src = event.image;
  getById("dt-img").alt = event.name;
  getById("dt-cat").textContent = event.category;
  getById("dt-title").textContent = event.name;
  getById("dt-desc").textContent = event.description;
  getById("dt-date").textContent = formatDate(event.date);
  getById("dt-time").textContent = event.time;
  getById("dt-venue").textContent = event.venue;
  getById("dt-count").textContent = participants.filter(p => p.event === event.name).length + " students";

  getById("dt-list").innerHTML = "";
  event.expect.forEach(item => getById("dt-list").appendChild(makeElement("li", "", item)));

  getById("dt-reg").onclick = () => {
    getById("d-detail").close();
    goToRegister(event.name);
  };
  getById("d-detail").showModal();
}

function goToRegister(eventName) {
  getById("reg-event").value = eventName;
  showPage("register");
}

function fillEventSelect(select, withPlaceholder) {
  select.innerHTML = "";
  if (withPlaceholder) select.appendChild(new Option("Choose an event", ""));
  events.forEach(e => select.appendChild(new Option(e.name + " (" + formatDate(e.date) + ")", e.name)));
}

function updateStats() {
  getById("st-events").textContent = events.length;
  getById("st-people").textContent = participants.length;
}

// ---------- 6. REGISTRATION (GOOGLE SHEETS) ----------
async function handleRegistration(submit) {
  submit.preventDefault();

  const eventName = getById("reg-event").value;
  const name = getById("reg-name").value.trim();
  const email = getById("reg-email").value.trim();
  const year = document.querySelector("input[name=year]:checked");

  const nameEmailError = checkNameAndEmail(name, email);
  if (!eventName) return showError("form-alert", "Choose an event to continue.");
  if (nameEmailError) return showError("form-alert", nameEmailError);
  if (!year) return showError("form-alert", "Select your year level.");
  if (!getById("reg-terms").checked) return showError("form-alert", "Agree to the event rules to register.");

  const submitBtn = submit.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving to Google Sheets...";

  const newParticipant = {
    id: Date.now(),
    name: name,
    email: email,
    event: eventName,
    year: year.value
  };

  // 1. Send data to Google Sheet
  try {
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newParticipant)
    });
  } catch (error) {
    console.warn("Spreadsheet background sync note:", error);
  }

  // 2. Add to local table & UI
  participants.push(newParticipant);
  saveParticipants();

  getById("reg-form").reset();
  getById("form-alert").hidden = true;
  submitBtn.disabled = false;
  submitBtn.textContent = "Complete registration";

  showToast("Registered successfully!");
  showPage("participants");
}

// ---------- 7. PARTICIPANTS LIST ----------
function renderParticipants() {
  const search = getById("p-search").value.trim().toLowerCase();
  const rows = participants.filter(p => (p.name + p.email + p.event).toLowerCase().includes(search));
  const table = getById("p-list");
  table.innerHTML = "";

  if (rows.length === 0) {
    const cell = makeElement("td", "empty", participants.length ? "No participants match your search." : "No one has registered yet.");
    cell.colSpan = 5;
    const row = makeElement("tr");
    row.appendChild(cell);
    table.appendChild(row);
  }

  rows.forEach(person => {
    const row = makeElement("tr");
    [person.name, person.email, person.event, person.year].forEach(text => row.appendChild(makeElement("td", "", text)));

    const editButton = makeElement("button", "mini e", "Edit");
    const deleteButton = makeElement("button", "mini d", "Delete");
    editButton.addEventListener("click", () => openEdit(person.id));
    deleteButton.addEventListener("click", () => openDelete(person.id));

    const actions = makeElement("td");
    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    table.appendChild(row);
  });

  getById("p-count").textContent = "Showing " + rows.length + " of " + participants.length + " participants";
}

// --- Edit ---
let editingId = null;

function openEdit(id) {
  const person = participants.find(p => p.id === id);
  if (!person) return;
  editingId = id;

  getById("edit-alert").hidden = true;
  getById("e-name").value = person.name;
  getById("e-email").value = person.email;
  getById("e-event").value = person.event;
  getById("e-year").value = person.year;
  getById("d-edit").showModal();
}

function handleEditSave(submit) {
  submit.preventDefault();

  const name = getById("e-name").value.trim();
  const email = getById("e-email").value.trim();
  const error = checkNameAndEmail(name, email);
  if (error) return showError("edit-alert", error);

  const person = participants.find(p => p.id === editingId);
  Object.assign(person, { name, email, event: getById("e-event").value, year: getById("e-year").value });

  saveParticipants();
  renderParticipants();
  getById("d-edit").close();
  showToast("Changes saved.");
}

// --- Delete ---
let deletingId = null;

function openDelete(id) {
  const person = participants.find(p => p.id === id);
  if (!person) return;
  deletingId = id;

  getById("del-name").textContent = person.name;
  getById("del-info").textContent = person.email + " · " + person.event;
  getById("d-del").showModal();
}

function handleDeleteConfirm() {
  const person = participants.find(p => p.id === deletingId);
  participants = participants.filter(p => p.id !== deletingId);

  saveParticipants();
  renderParticipants();
  getById("d-del").close();
  showToast(person ? person.name + " was deleted." : "Participant deleted.");
}

// ---------- 8. DARK / LIGHT THEME ----------
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch (error) {}
}

function loadTheme() {
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (error) {}
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
}

// ---------- 9. START THE APP ----------
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  fillEventSelect(getById("reg-event"), true);
  fillEventSelect(getById("e-event"), false);
  renderCategoryButtons();
  renderEvents();
  updateStats();

  // Navigation
  document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", click => {
      click.preventDefault();
      showPage(link.dataset.page);
    });
  });
  getById("menu").addEventListener("click", () => {
    const isOpen = getById("nav").classList.toggle("open");
    getById("menu").setAttribute("aria-expanded", isOpen);
  });
  getById("browse").addEventListener("click", click => {
    click.preventDefault();
    getById("events-title").scrollIntoView({ behavior: "smooth" });
  });
  window.addEventListener("scroll", () => getById("bar").classList.toggle("scrolled", scrollY > 20), { passive: true });

  // Theme button
  getById("theme").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  // Events page
  getById("events-list").addEventListener("click", handleCardClick);
  getById("events-list").addEventListener("keydown", key => {
    if (key.key === "Enter" && key.target.classList.contains("card")) key.target.click();
  });
  getById("search").addEventListener("input", input => {
    searchText = input.target.value.trim().toLowerCase();
    renderEvents();
  });

  // Registration + rules popup
  getById("reg-form").addEventListener("submit", handleRegistration);
  getById("rules-link").addEventListener("click", click => {
    click.preventDefault();
    getById("d-rules").showModal();
  });
  getById("rules-agree").addEventListener("click", () => {
    getById("reg-terms").checked = true;
    getById("d-rules").close();
    showToast("Thanks for agreeing to the rules.");
  });

  // Participants page
  getById("p-search").addEventListener("input", renderParticipants);
  getById("edit-form").addEventListener("submit", handleEditSave);
  getById("del-ok").addEventListener("click", handleDeleteConfirm);

  // Popups
  document.addEventListener("click", click => {
    const dialog = click.target.closest("dialog");
    if (click.target.tagName === "DIALOG") click.target.close();
    else if (dialog && click.target.closest("[data-close]")) dialog.close();
  });

  showPage(location.hash.slice(1));
});