let groupId = 0;

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("addGroupButton").addEventListener("click", addGroup);
  document.getElementById("calculateButton").addEventListener("click", calculateCosts);
  document.getElementById("exportButton").addEventListener("click", exportCSV);
});

function addGroup() {
  const container = document.getElementById("groups-container");
  const id = groupId++;

  const div = document.createElement("div");
  div.className = "group-block";
  div.id = `group-${id}`;

  div.innerHTML = `
    <h2>Group ${id + 1}</h2>

    <label>Group Name:</label>
    <input type="text" class="group-name" placeholder="e.g. Attorneys">

    <label>Paste Headcount, Union Step, Mgmt Step (Tab-separated):</label>
    <textarea class="group-csv" rows="4"
      placeholder="0	$83,500	$80,659.71\n3	$88,000	$84,500"></textarea>

    <label>Union Raise (%):</label>
    <input type="number" class="union-raise" value="3">

    <label>Mgmt Raise (%):</label>
    <input type="number" class="mgmt-raise" value="2">

    <button class="delete-button" onclick="removeGroup(${id})">Delete Group</button>
  `;

  container.appendChild(div);
}

function removeGroup(id) {
  const el = document.getElementById(`group-${id}`);
  if (el) el.remove();
}

function parseCSVTriples(text) {
  const lines = text.split("\n");
  const headcounts = [], unionSteps = [], mgmtSteps = [];

  lines.forEach(line => {
    const parts = line.split("\t");
    if (parts.length === 3) {
      const headcount = parseFloat(parts[0].trim().replace(/[\$,]/g, ""));
      const union = parseFloat(parts[1].trim().replace(/[\$,]/g, ""));
      const mgmt = parseFloat(parts[2].trim().replace(/[\$,]/g, ""));

      if (!isNaN(headcount) && !isNaN(union) && !isNaN(mgmt)) {
        headcounts.push(headcount);
        unionSteps.push(union);
        mgmtSteps.push(mgmt);
      }
    }
  });

  return { headcounts, unionSteps, mgmtSteps };
}

function weightedCost(steps, headcounts) {
  return steps.reduce((sum, step, i) => sum + step * (headcounts[i] || 0), 0);
}

function computeStepYearValues(steps, raisePct, years) {
  const out = steps.map(base => {
    let arr = [base];
    for (let y = 1; y < years; y++) {
      arr.push(arr[y - 1] * (1 + raisePct / 100));
    }
    return arr;
  });
  return out;
}

function calculateProposalCosts(steps, headcounts, raisePct, years) {
  const totals = [];
  let current = [...steps];
  for (let y = 0; y < years; y++) {
    totals.push(weightedCost(current, headcounts));
    current = current.map(s => s * (1 + raisePct / 100));
  }
  return totals;
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function exportCSV() {
  const table = document.getElementById("resultsTable");
  let csv = "";
  for (let row of table.rows) {
    const cells = Array.from(row.cells).map(c => `"${c.textContent.trim()}"`);
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

  let unionTotals = Array(years).fill(0);
  let mgmtTotals = Array(years).fill(0);
  let lastTotals = Array(years).fill(0);

  const resultsTable = document.getElementById("resultsTable");
  const stepTable = document.getElementById("stepDetailsTable");

  resultsTable.innerHTML = "";
  stepTable.innerHTML = "";

  const groups = document.querySelectorAll(".group-block");

  groups.forEach(group => {
    const name = group.querySelector(".group-name").value || "Unnamed Group";
    const unionRaise = parseFloat(group.querySelector(".union-raise").value);
    const mgmtRaise = parseFloat(group.querySelector(".mgmt-raise").value);
    const { headcounts, unionSteps, mgmtSteps } =
      parseCSVTriples(group.querySelector(".group-csv").value);

    const union = calculateProposalCosts(unionSteps, headcounts, unionRaise, years);
    const mgmt = calculateProposalCosts(mgmtSteps, headcounts, mgmtRaise, years);
    const last = calculateProposalCosts(mgmtSteps, headcounts, lastRaise, years);

    unionTotals = unionTotals.map((v, i) => v + union[i]);
    mgmtTotals = mgmtTotals.map((v, i) => v + mgmt[i]);
    lastTotals = lastTotals.map((v, i) => v + last[i]);

    resultsTable.innerHTML += `
      <tr><th colspan="6">${name}</th></tr>
      <tr>
        <th>Year</th><th>Union</th><th>Mgmt</th>
        <th>Last Contract</th><th>Union - Mgmt</th><th>Union - Last</th>
      </tr>
    `;

    for (let y = 0; y < years; y++) {
      resultsTable.innerHTML += `
        <tr>
          <td>Year ${y + 1}</td>
          <td>${union[y].toFixed(2)}</td>
          <td>${mgmt[y].toFixed(2)}</td>
          <td>${last[y].toFixed(2)}</td>
          <td>${(union[y] - mgmt[y]).toFixed(2)}</td>
          <td>${(union[y] - last[y]).toFixed(2)}</td>
        </tr>
      `;
    }

    const unionStepYears = computeStepYearValues(unionSteps, unionRaise, years);
    const mgmtStepYears = computeStepYearValues(mgmtSteps, mgmtRaise, years);

    stepTable.innerHTML += `
      <tr><th colspan="${years + 2}">${name} — Salary Progression Per Step</th></tr>
      <tr>
        <th>Step</th>
        ${Array.from({ length: years }, (_, i) => `<th>Year ${i + 1}</th>`).join("")}
        <th>Type</th>
      </tr>
    `;

    unionStepYears.forEach((arr, idx) => {
      stepTable.innerHTML += `
        <tr>
          <td>${idx + 1}</td>
          ${arr.map(v => `<td>${v.toFixed(2)}</td>`).join("")}
          <td>Union</td>
        </tr>`;
    });

    mgmtStepYears.forEach((arr, idx) => {
      stepTable.innerHTML += `
        <tr>
          <td>${idx + 1}</td>
          ${arr.map(v => `<td>${v.toFixed(2)}</td>`).join("")}
          <td>Mgmt</td>
        </tr>`;
    });
  });
}
