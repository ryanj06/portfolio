import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let data = [];
let commits = [];
let filteredCommits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;
let xScale;
let yScale;
let rScale;
let usableArea;
let selectedCommits = [];
let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/ryanj06/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return ret;
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function renderCommitInfo(dataToShow, commitsToShow) {
  const container = d3.select('#stats');
  container.html('');

  container.append('h2').text('Summary');

  const dl = container.append('dl').attr('class', 'stats');

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commitsToShow.length);

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(dataToShow.length);

  dl.append('dt').text('Number of files');
  dl.append('dd').text(d3.group(dataToShow, (d) => d.file).size);

  dl.append('dt').text('Max file length');
  dl.append('dd').text(d3.max(dataToShow, (d) => d.line) ?? 0);

  dl.append('dt').text('Avg line length');
  dl.append('dd').text(`${Math.round(d3.mean(dataToShow, (d) => d.length) || 0)} chars`);

  const workByPeriod = d3.rollups(
    dataToShow,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }),
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];

  dl.append('dt').text('Most active time');
  dl.append('dd').text(maxPeriod ?? 'N/A');
}

function renderTooltipContent(commit) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!commit) return;

  tooltip.innerHTML = `
    <dt>Commit</dt>
    <dd><a href="${commit.url}" target="_blank">${commit.id}</a></dd>
    <dt>Date</dt>
    <dd>${commit.datetime.toLocaleString('en', { dateStyle: 'full' })}</dd>
    <dt>Time</dt>
    <dd>${commit.time}</dd>
    <dt>Author</dt>
    <dd>${commit.author}</dd>
    <dt>Lines edited</dt>
    <dd>${commit.totalLines}</dd>
  `;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);
  return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
}

function renderSelectionCount(selection, commitsToShow) {
  selectedCommits = selection
    ? commitsToShow.filter((d) => isCommitSelected(selection, d))
    : [];
  document.querySelector('#selection-count').textContent =
    `${selectedCommits.length || 'No'} commits selected`;
}

function renderLanguageBreakdown(selection, commitsToShow) {
  const selected = selection
    ? commitsToShow.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');
  if (selected.length === 0) { container.innerHTML = ''; return; }

  const lines = selected.flatMap((d) => d.lines);
  const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);
  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
  }
}

function renderScatterPlot(commitsToShow) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commitsToShow, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  rScale = d3
    .scaleSqrt()
    .domain(d3.extent(commitsToShow, (d) => d.totalLines))
    .range([2, 30]);

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(
      d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'),
    );

  svg.append('g').attr('class', 'dots');

  svg
    .append('g')
    .attr('class', 'brush')
    .call(
      d3.brush().on('start brush end', (event) => {
        const selection = event.selection;
        d3.selectAll('circle').classed('selected', (d) =>
          isCommitSelected(selection, d),
        );
        renderSelectionCount(selection, filteredCommits);
        renderLanguageBreakdown(selection, filteredCommits);
      }),
    );

  updateScatterPlot(commitsToShow);
}

function updateScatterPlot(commitsToShow) {
  if (commitsToShow.length === 0) return;

  const svg = d3.select('#chart').select('svg');

  xScale.domain(d3.extent(commitsToShow, (d) => d.datetime)).nice();
  rScale.domain(d3.extent(commitsToShow, (d) => d.totalLines));

  svg.select('.x-axis').call(d3.axisBottom(xScale));

  const sortedCommits = d3.sort(commitsToShow, (d) => -d.totalLines);

  svg
    .select('g.dots')
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('--r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  svg.select('g.dots').raise();
  svg.select('g.brush').raise();
}

function updateFileDisplay(commitsToShow) {
  const lines = commitsToShow.flatMap((d) => d.lines);

  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append('div').call((div) => {
        div.append('dt').append('code');
        div.select('dt').append('small');
        div.append('dd');
      }),
    );

  filesContainer.select('dt > code').text((d) => d.name);
  filesContainer.select('dt > small').text((d) => `${d.lines.length} lines`);

  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('title', (d) => `${d.file}, line ${d.line}, ${d.type}`)
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}

function updateForCommitTime(maxTime) {
  commitMaxTime = maxTime;
  commitProgress = timeScale(commitMaxTime);

  document.getElementById('commit-progress').value = commitProgress;
  document.getElementById('commit-time').textContent =
    commitMaxTime.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  const filteredData = filteredCommits.flatMap((d) => d.lines);

  renderCommitInfo(filteredData, filteredCommits);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

function onTimeSliderChange() {
  commitProgress = +document.getElementById('commit-progress').value;
  updateForCommitTime(timeScale.invert(commitProgress));
}

function renderCommitStory() {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits, (d) => d.id)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
        <p>
          On ${d.datetime.toLocaleString('en', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}, I made
          <a href="${d.url}" target="_blank">${
            i > 0 ? 'another commit' : 'my first commit'
          }</a>.
        </p>
        <p>
          I edited <strong>${d.totalLines}</strong> lines across
          <strong>${
            d3.rollups(d.lines, (D) => D.length, (line) => line.file).length
          }</strong> files.
        </p>
      `,
    );
}

function setupScroller() {
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      offset: 0.5,
    })
    .onStepEnter((response) => {
      const commit = response.element.__data__;
      updateForCommitTime(commit.datetime);
    });

  window.addEventListener('resize', scroller.resize);
}

// ── Main ──────────────────────────────────────────────────────────────────────
await loadData();
processCommits();

filteredCommits = commits;

timeScale = d3
  .scaleTime()
  .domain([d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)])
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);

document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);

renderCommitInfo(data, commits);
renderScatterPlot(commits);
updateFileDisplay(commits);
renderCommitStory();
setupScroller();
onTimeSliderChange();