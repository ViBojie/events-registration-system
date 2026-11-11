// ==========================================================
// CCSICT EVENT REGISTRATION SYSTEM
//  1. Event data      4. Pages          7. Participants
//  2. Small helpers   5. Event cards    8. Dark / light theme
//  3. Google Sheet    6. Registration   9. Start the app
// ==========================================================

// The link to our Google Apps Script (the "middleman" to the Google Sheet)
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwREFtDXhlydLXQRgvBf8iWl-4kN8pQCcY9gGFuL8b7aq-zutd0V2gRoTTs9wzQ_VxU/exec";

// ---------- 1. EVENT DATA ----------
// To add an event, copy one block and change the words.
// (A category must also be added in renderCategoryButtons.)
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
    image: "https://api.hub.jhu.edu/factory/sites/default/files/styles/hub_xlarge/public/2023-09/hophacks-table092223.JPG",
    expect: ["Form a team and pick a campus problem", "24 hours to design and build a prototype", "Demo day with judges and prizes"]
  }
];

// The list of registered people. It is loaded from the Google Sheet.
let participants = [];

// ---------- 2. SMALL HELPERS ----------

// A shortcut: getById("toast") finds the element with id="toast"
function getById(id) {
  return document.getElementById(id);
}

// "2026-11-20" becomes "November 20, 2026"
function formatDate(date) {
  return new Date(date + "T00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

// Shows a small message at the bottom of the screen for 3 seconds
function showToast(message, isError) {
  const toast = getById("toast");
  toast.textContent = message;
  toast.className = isError ? "toast show err" : "toast show";
  setTimeout(function () {
    toast.className = "toast";
  }, 2800);
}

// Shows a red message inside a form
function showError(boxId, message) {
  const box = getById(boxId);
  box.textContent = message;
  box.className = "alert error";
  box.hidden = false;
}

// Checks the name and email. Returns a message if something is wrong, or "" if it is fine.
function checkNameAndEmail(name, email) {
  if (name.length < 2) return "Enter a full name.";
  if (!email.includes("@") || !email.includes(".")) return "Enter a valid email address, like you@isu.edu.ph.";
  return "";
}

// Finds one event by its name
function findEvent(name) {
  for (const e of events) {
    if (e.name === name) return e;
  }
}

// Finds one participant by their id
function findParticipant(id) {
  for (const p of participants) {
    if (p.id === id) return p;
  }
}

// ---------- 3. GOOGLE SHEET (our database) ----------

// Sends a request to the Google Apps Script and returns its answer.
// action = what to do: "add", "list", "update" or "delete"
// data   = the details to send, like the name and email
async function callSheet(action, data) {
  data.action = action;
  try {
    const response = await fetch(GOOGLE_SHEET_URL, { method: "POST", body: JSON.stringify(data) });
    return await response.json();   // "await" = wait for the answer
  } catch (error) {
    return { status: "error", message: "Could not reach Google Sheets." };
  }
}

// Gets everyone who registered from the Google Sheet
async function loadParticipants() {
  const reply = await callSheet("list", {});
  if (reply.status === "ok") participants = reply.participants;
  updateStats();
}

// ---------- 4. PAGES ----------
// The site has 3 pages. We show one and hide the other two.
function showPage(name) {
  const pages = ["home", "register", "participants"];
  for (const id of pages) {
    getById(id).hidden = (id !== name);
  }

  // Highlight the active button in the navigation bar
  document.querySelectorAll(".nav-btn").forEach(function (link) {
    link.classList.toggle("active", link.dataset.page === name);
  });

  if (name === "participants") showParticipants();
  if (name === "home") updateStats();

  // Close the mobile menu and go back to the top
  getById("nav").classList.remove("open");
  getById("menu").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}

// ---------- 5. EVENT CARDS ----------
let selectedCategory = "All";
let searchText = "";

// Makes the filter buttons: All, Social, Career, ...
function renderCategoryButtons() {
  const box = getById("chips");
  box.innerHTML = "";

  const categories = ["All", "Social", "Career", "Workshop", "Competition"];
  for (const category of categories) {
    const button = document.createElement("button");
    button.textContent = category;
    button.className = (category === selectedCategory) ? "chip on" : "chip";
    button.onclick = function () {
      selectedCategory = category;
      renderCategoryButtons();
      renderEvents();
    };
    box.appendChild(button);
  }
}

// Draws the event cards that match the chosen category and the search box
function renderEvents() {
  let html = "";

  for (const e of events) {
    if (selectedCategory !== "All" && e.category !== selectedCategory) continue;   // skip: wrong category
    if (!(e.name + " " + e.description).toLowerCase().includes(searchText)) continue;   // skip: no search match

    // ${...} puts the event's real value into the text
    html += `
      <article class="card" onclick="openDetails('${e.name}')">
        <img class="event-image" src="${e.image}" alt="${e.name}">
        <div class="card-top">
          <small>${e.category}</small>
          <h3>${e.name}</h3>
        </div>
        <div class="card-body">
          <div>📅 ${formatDate(e.date)} · ${e.time}</div>
          <div>📍 ${e.venue}</div>
          <p class="desc">${e.description}</p>
          <div class="card-actions">
            <button class="btn ghost-d">Details</button>
            <button class="btn green" onclick="event.stopPropagation(); goToRegister('${e.name}')">Register</button>
          </div>
        </div>
      </article>`;
  }

  getById("events-list").innerHTML = html;
  getById("no-events").hidden = (html !== "");   // show the "no events" message when nothing matched
}

// Fills the details popup with one event and opens it
function openDetails(name) {
  const e = findEvent(name);

  getById("dt-img").src = e.image;
  getById("dt-cat").textContent = e.category;
  getById("dt-title").textContent = e.name;
  getById("dt-desc").textContent = e.description;
  getById("dt-date").textContent = formatDate(e.date);
  getById("dt-time").textContent = e.time;
  getById("dt-venue").textContent = e.venue;

  // Count how many people registered for this event
  let count = 0;
  for (const p of participants) {
    if (p.event === e.name) count++;
  }
  getById("dt-count").textContent = count + " students";

  // The "what to expect" list
  getById("dt-list").innerHTML = "";
  for (const item of e.expect) {
    const li = document.createElement("li");
    li.textContent = item;
    getById("dt-list").appendChild(li);
  }

  getById("dt-reg").onclick = function () {
    getById("d-detail").close();
    goToRegister(e.name);
  };
  getById("d-detail").showModal();   // opens the popup
}

// Goes to the Register page with this event already chosen
function goToRegister(name) {
  getById("reg-event").value = name;
  showPage("register");
}

// Puts the event names into a dropdown list
function fillEventSelect(select, withPlaceholder) {
  select.innerHTML = "";
  if (withPlaceholder) select.appendChild(new Option("Choose an event", ""));
  for (const e of events) {
    select.appendChild(new Option(e.name + " (" + formatDate(e.date) + ")", e.name));
  }
}

// The two numbers on the home page
function updateStats() {
  getById("st-events").textContent = events.length;
  getById("st-people").textContent = participants.length;
}

// ---------- 6. REGISTRATION ----------
async function handleRegistration(submit) {
  submit.preventDefault();   // stops the page from reloading

  const eventName = getById("reg-event").value;
  const name = getById("reg-name").value.trim();
  const email = getById("reg-email").value.trim().toLowerCase();
  const year = document.querySelector("input[name=year]:checked");

  // Check one thing at a time. If something is wrong, show it and stop.
  if (eventName === "") return showError("form-alert", "Choose an event to continue.");
  const problem = checkNameAndEmail(name, email);
  if (problem !== "") return showError("form-alert", problem);
  if (!year) return showError("form-alert", "Select your year level.");
  if (!getById("reg-terms").checked) return showError("form-alert", "Agree to the event rules to register.");

  // Send to the Google Sheet and wait for the answer
  const button = submit.target.querySelector("button");
  button.disabled = true;
  button.textContent = "Saving...";
  const reply = await callSheet("add", { name: name, email: email, event: eventName, year: year.value });
  button.disabled = false;
  button.textContent = "Complete registration";

  if (reply.status === "duplicate") return showError("form-alert", "This email is already registered for that event.");
  if (reply.status !== "ok") return showError("form-alert", "Registration failed. Please try again.");

  // Success
  getById("reg-form").reset();
  getById("form-alert").hidden = true;
  await loadParticipants();
  showToast("You're registered for " + eventName + "!");
  showPage("home");
}

// ---------- 7. PARTICIPANTS ----------
async function showParticipants() {
  await loadParticipants();   // get the newest list from the Google Sheet
  renderParticipants();
}

// Draws the table. We use textContent (not innerHTML) because visitors type this text.
function renderParticipants() {
  const search = getById("p-search").value.trim().toLowerCase();
  const table = getById("p-list");
  table.innerHTML = "";
  let shown = 0;

  for (const person of participants) {
    const text = (person.name + " " + person.email + " " + person.event).toLowerCase();
    if (!text.includes(search)) continue;
    shown++;

    const row = table.insertRow();
    row.insertCell().textContent = person.name;
    row.insertCell().textContent = person.email;
    row.insertCell().textContent = person.event;
    row.insertCell().textContent = person.year;

    const actions = row.insertCell();

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "mini e";
    editButton.onclick = function () { openEdit(person.id); };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "mini d";
    deleteButton.onclick = function () { openDelete(person.id); };

    actions.append(editButton, deleteButton);
  }

  if (shown === 0) {
    const cell = table.insertRow().insertCell();
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = "No participants found.";
  }
  getById("p-count").textContent = "Showing " + shown + " of " + participants.length + " participants";
}

// --- Edit ---
let editingId = "";

function openEdit(id) {
  const person = findParticipant(id);
  editingId = id;

  getById("edit-alert").hidden = true;
  getById("e-name").value = person.name;      // fill the form with the current details
  getById("e-email").value = person.email;
  getById("e-event").value = person.event;
  getById("e-year").value = person.year;
  getById("d-edit").showModal();
}

async function handleEditSave(submit) {
  submit.preventDefault();

  const name = getById("e-name").value.trim();
  const email = getById("e-email").value.trim().toLowerCase();
  const problem = checkNameAndEmail(name, email);
  if (problem !== "") return showError("edit-alert", problem);

  // Update the row in the Google Sheet
  const reply = await callSheet("update", {
    id: editingId, name: name, email: email,
    event: getById("e-event").value, year: getById("e-year").value
  });
  if (reply.status === "duplicate") return showError("edit-alert", "That email is already registered for this event.");
  if (reply.status !== "ok") return showError("edit-alert", "Could not save changes.");

  getById("d-edit").close();
  await showParticipants();
  showToast("Changes saved.");
}

// --- Delete ---
let deletingId = "";

function openDelete(id) {
  const person = findParticipant(id);
  deletingId = id;

  getById("del-name").textContent = person.name;
  getById("del-info").textContent = person.email + " · " + person.event;
  getById("d-del").showModal();
}

async function handleDeleteConfirm() {
  const person = findParticipant(deletingId);

  // Remove the row from the Google Sheet
  const reply = await callSheet("delete", { id: deletingId });
  if (reply.status !== "ok") return showToast("Could not delete participant.", true);

  getById("d-del").close();
  await showParticipants();
  showToast(person.name + " was deleted.");
}

// ---------- 8. DARK / LIGHT THEME ----------
// The CSS changes colors when the page has data-theme="dark"
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);   // remember the choice
}

function loadTheme() {
  document.documentElement.dataset.theme = localStorage.getItem("theme") || "light";
}

// ---------- 9. START THE APP ----------
document.addEventListener("DOMContentLoaded", async function () {
  loadTheme();
  fillEventSelect(getById("reg-event"), true);
  fillEventSelect(getById("e-event"), false);
  renderCategoryButtons();
  renderEvents();

  // Navigation buttons
  document.querySelectorAll("[data-page]").forEach(function (link) {
    link.addEventListener("click", function (click) {
      click.preventDefault();
      showPage(link.dataset.page);
    });
  });
  getById("menu").addEventListener("click", function () {
    const isOpen = getById("nav").classList.toggle("open");
    getById("menu").setAttribute("aria-expanded", isOpen);
  });
  getById("browse").addEventListener("click", function (click) {
    click.preventDefault();
    getById("events-title").scrollIntoView({ behavior: "smooth" });
  });
  window.addEventListener("scroll", function () {
    getById("bar").classList.toggle("scrolled", window.scrollY > 20);
  });

  // Theme button
  getById("theme").addEventListener("click", function () {
    const isDark = document.documentElement.dataset.theme === "dark";
    setTheme(isDark ? "light" : "dark");
  });

  // Search boxes
  getById("search").addEventListener("input", function (input) {
    searchText = input.target.value.trim().toLowerCase();
    renderEvents();
  });
  getById("p-search").addEventListener("input", renderParticipants);

  // Forms
  getById("reg-form").addEventListener("submit", handleRegistration);
  getById("edit-form").addEventListener("submit", handleEditSave);
  getById("del-ok").addEventListener("click", handleDeleteConfirm);

  // Rules popup
  getById("rules-link").addEventListener("click", function (click) {
    click.preventDefault();
    getById("d-rules").showModal();
  });
  getById("rules-agree").addEventListener("click", function () {
    getById("reg-terms").checked = true;
    getById("d-rules").close();
    showToast("Thanks for agreeing to the rules.");
  });

  // Every Close / Cancel / X button closes the popup around it
  document.querySelectorAll("[data-close]").forEach(function (button) {
    button.addEventListener("click", function () {
      button.closest("dialog").close();
    });
  });

  showPage("home");
  await loadParticipants();   // load the numbers from the Google Sheet
});
