console.log("IT'S ALIVE!");
 
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
 
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";
 
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "https://github.com/ryanj06", title: "GitHub" },
];
 
let nav = document.createElement("nav");
document.body.prepend(nav);
 
for (let p of pages) {
  let url = p.url;
  let title = p.title;
 
  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }
 
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;
 
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );
 
  if (a.host !== location.host) {
    a.target = "_blank";
  }
 
  nav.append(a);
}
 
document.body.insertAdjacentHTML(
  "afterbegin",
  `<label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);
 
const select = document.querySelector(".color-scheme select");
 
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}
 
select.addEventListener("input", function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});
 
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty("color-scheme", colorScheme);
  select.value = colorScheme;
}
 
const form = document.querySelector("form");
form?.addEventListener("submit", function (event) {
  event.preventDefault();
  const data = new FormData(form);
  let params = [];
  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }
  location.href = form.action + "?" + params.join("&");
});
 
// ── Step 1.2: Fetch JSON from a URL ──────────────────────────────────────────
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}
 
// ── Step 1.4: Render projects into a container element ────────────────────────
export function renderProjects(projects, containerElement, headingLevel = "h2") {
  containerElement.innerHTML = "";
 
  for (let project of projects) {
    const article = document.createElement("article");
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}" />
      <p>${project.description}</p>
      ${project.year ? `<p class="project-year">c. ${project.year}</p>` : ""}
    `;
    containerElement.appendChild(article);
  }
}
 
// ── Step 3.2: Fetch GitHub profile data ──────────────────────────────────────
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
