console.log("IT'S ALIVE!");
 
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
 
// ── Base path (works locally and on GitHub Pages) ──
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/"; // change "portfolio" to your actual GitHub repo name if different
 
// ── Step 3: Automatic navigation menu ──
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
 
  // Prefix relative URLs with BASE_PATH
  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }
 
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;
 
  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );
 
  // Open external links in a new tab
  if (a.host !== location.host) {
    a.target = "_blank";
  }
 
  nav.append(a);
}
 
// ── Step 4: Dark mode switch ──
nav.insertAdjacentHTML(
  "beforeend",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);
 
const select = document.querySelector(".color-scheme select");
 
// Apply saved preference on page load
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}
 
// Listen for changes
select.addEventListener("input", function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});
 
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty("color-scheme", colorScheme);
  select.value = colorScheme;
}
 
// ── Step 5: Better contact form (if on contact page) ──
const form = document.querySelector("form");
form?.addEventListener("submit", function (event) {
  event.preventDefault();
 
  const data = new FormData(form);
  let params = [];
 
  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }
 
  const url = form.action + "?" + params.join("&");
  location.href = url;
});
