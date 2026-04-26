import { fetchJSON, renderProjects } from "../global.js";

const projects = await fetchJSON("../lib/projects.json");

// Step 1.6: Update the title to show project count
const titleEl = document.querySelector(".projects-title");
if (titleEl) {
  titleEl.textContent = `Projects (${projects.length})`;
}

const projectsContainer = document.querySelector(".projects");
renderProjects(projects, projectsContainer, "h2");
