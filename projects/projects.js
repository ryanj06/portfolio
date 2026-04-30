import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON("../lib/projects.json");

const titleEl = document.querySelector(".projects-title");
if (titleEl) {
  titleEl.textContent = `Projects (${projects.length})`;
}

const projectsContainer = document.querySelector(".projects");

let query = "";
let selectedIndex = -1;

const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value((d) => d.value);

let currentData = [];

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  currentData = rolledData
    .map(([year, count]) => ({ value: count, label: year }))
    .sort((a, b) => b.label.localeCompare(a.label));

  const arcData = sliceGenerator(currentData);
  const arcs = arcData.map((d) => arcGenerator(d));

  const svg = d3.select("#projects-pie-plot");
  svg.selectAll("path").remove();
  const legend = d3.select(".legend");
  legend.selectAll("li").remove();

  arcs.forEach((arc, i) => {
    svg
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(i))
      .attr("class", i === selectedIndex ? "selected" : "")
      .on("click", () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        applyFilters();
      });
  });

  currentData.forEach((d, i) => {
    legend
      .append("li")
      .attr("style", `--color:${colors(i)}`)
      .attr("class", `legend-item${i === selectedIndex ? " selected" : ""}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on("click", () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        applyFilters();
      });
  });
}

function applyFilters() {
  let filtered = projects.filter((project) => {
    const values = Object.values(project).join("\n").toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderPieChart(filtered);

  if (selectedIndex !== -1 && currentData[selectedIndex]) {
    const selectedYear = currentData[selectedIndex].label;
    filtered = filtered.filter((p) => p.year === selectedYear);
  }

  renderProjects(filtered, projectsContainer, "h2");
}

applyFilters();

const searchInput = document.querySelector(".searchBar");
searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  selectedIndex = -1;
  applyFilters();
});