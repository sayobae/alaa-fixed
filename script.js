let groupId = 0;

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("addGroupButton").addEventListener("click", addGroup);
  document.getElementById("calculateButton").addEventListener("click", calculateCosts);
  document.getElementById("exportButton").addEventListener("click", exportCSV);
});

function addGroup() {
  const container = document.getElementById("groups-container");
  const div = document.createElement("div");
  div.className = "group-block";
  div.id = `group-${groupId}`;

  div.innerHTML = `
    <h2>Group ${groupId + 1}</h2>

    <label>Group Name:</label>
    <input type="text" class="group-name" placeholder="e.g. Attorneys">

    <label>Paste Step, Headcount, Union Step $, Mgmt Step $ (tab-separated):</label>
    <textarea class="group-csv" placeholder="1\t3\t$83,500\t$80,659.71\n2\t0\t$85,500\t$82,782.34\n3\t4\t$88,666\t$84,904.96"></textarea>

    <label>Union Raises (% by year, comma separated):</label>
    <input type="text" class="union-raises" value="3,2,2">

    <label>Mgmt Raises (% by year, comma separated):</label>
    <input type="text" class="mgmt-raises" value="2,2,1">

    <button type="button" class="delete-group" onclick="removeGroup(${groupId})">Delete Group</button>
  `;

  container.appendChild(div);
  groupId++;
}

function removeGroup(id) {
  const block = document.getElementById(`group-${id}`);
  if (block) block.remove();
}

function parseCSV(text) {
  const lines = text.split("\n");
  const steps = [];
  const headcounts = [];
  const unionSteps = [];
  const mgmtSteps = [];

  lines.forEach(line => {
    const parts = line.split("\t");
    if (parts.length !== 4) return;

    const step = parseFloat(parts[0].trim());
    const head = parseFloat(parts[1].trim());
    const union = parseFloat(parts[2].trim().replace(/[$,]/g, ""));
    const mgmt = parseFloat(parts[3].trim().replace(/[$,]/g, ""));

    if (!isNaN(step) && !isNaN(head) && !isNaN(union) && !isNaN(mgmt)) {
      steps.push(step);
      headcounts.push(head);
      unionSteps.push(union);
      mgmtSteps.push(mgmt);
    }
  });

  return { steps, headcounts, unionSteps, mgmtSteps };
}

function getRaiseMultipliers(raises, years) {
  const arr = raises.split(",").map(x => parseFloat(x.trim()));
  const multipliers = [];
  let current = 1;
  for (let y = 0; y < years; y++) {
    const raise = arr[y] || arr[arr.length - 1] || 0;
    current *= 1 + raise / 100;
    multipliers.push(current);
  }
  return multipliers;
}

function weightedCost(steps, headcounts) {
  return steps.reduce((s, val, i) => s + val * headcounts[i], 0);
}

function individualProgression(startingSalary, multipliers) {
  return multipliers.map(m => startingSalary * m);
}

function exportCSV() {
  const table = document.getElementById("resultsTable");
  let csv = "";
  for (let row of table.rows) {
    const cells = [...row.cells].map(c => `"${c.textContent}"`);
    csv += cells.join(",") + "\n";
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "contract_costs.csv";
  link.click();
}

function calculateCosts() {
  const years = parseInt(document.getElementById("contract-years").value);
  const lastRaise = parseFloat(document.getElementById("last-raise").value);

  const rows = document.getElementById("groups-container").querySelectorAll(".group-block");
  const table = document.getElementById("resultsTable");
  table.innerHTML = "";

  rows.forEach(group => {
    const groupName = group.querySelector(".group-name").value || "Unnamed Group";

    const { steps, headcounts, unionSteps, mgmtSteps } = parseCSV(group.querySelector(".group-csv").value);
    const unionMult = getRaiseMultipliers(group.querySelector(".union-raises").value, years);
    const mgmtMult = getRaiseMultipliers(group.querySelector(".mgmt-raises").value, years);
    const lastMult = getRaiseMultipliers(lastRaise.toString(), years);

    const unionTotals = unionSteps.map((s, i) => individualProgression(s, unionMult).map(v => v * headcounts[i]));
    const mgmtTotals = mgmtSteps.map((s, i) => individualProgression(s, mgmtMult).map(v => v * headcounts[i]));
    const lastTotals = mgmtSteps.map((s, i) => individualProgression(s, lastMult).map(v => v * headcounts[i]));

    const yearlyUnion = Array(years).fill(0);
    const yearlyMgmt = Array(years).fill(0);
    const yearlyLast = Array(years).fill(0);

    unionTotals.forEach(arr => arr.forEach((v, i) => yearlyUnion[i] += v));
    mgmtTotals.forEach(arr => arr.forEach((v, i) => yearlyMgmt[i] += v));
    lastTotals.forEach(arr => arr.forEach((v, i) => yearlyLast[i] += v));

    // Total Results Table
    table.innerHTML += `<tr><th colspan="6">${groupName}</th></tr>`;
    table.innerHTML += `
      <tr>
        <th>Year</th>
        <th>Union Total</th>
        <th>Mgmt Tot
