let groupId = 0;

// Ensure the event listeners are added after the DOM has fully loaded.
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('calculateButton').addEventListener('click', calculateCosts);
  document.getElementById('exportButton').addEventListener('click', exportCSV);
});

// Add a new group when the button is clicked
function addGroup() {
  const container = document.getElementById('groups-container');
  const div = document.createElement('div');
  div.className = 'group-block';
  div.id = `group-${groupId}`;
  div.innerHTML = `
    <h2>Group ${groupId + 1}</h2>

    <button type="button" class="delete-group-btn" onclick="removeGroup(${groupId})">
      ❌ Delete Group
    </button>

    <label>Group Name:</label>
    <input type="text" class="group-name" placeholder="e.g. Attorneys" />

    <label>Paste Headcount, Union Step, Mgmt Step (tab-separated, 3 columns):</label>
    <textarea class="group-csv" rows="5" placeholder="0\t83500\t$80,659.71"></textarea>

    <label>Union Raise (%):</label>
    <input type="number" class="union-raise" value="3" />

    <label>Mgmt Raise (%):</label>
    <input type="number" class="mgmt-raise" value="2" />
  `;
  container.appendChild(div);

  groupId++;
}

// Remove a group when the remove button is clicked
function removeGroup(id) {
  const el = document.getElementById(`group-${id}`);
  if (el) el.remove();
}

// Parse the CSV-style input into headcounts and salary steps
function parseCSVTriples(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const headcounts = [], unionSteps = [], mgmtSteps = [];

  lines.forEach(line => {
    // split on tab first; if tabs not present, also accept commas or multiple spaces
    let parts = line.split('\t');
    if (parts.length !== 3) {
      // fallback: split by comma
      parts = line.split(',');
    }
    if (parts.length !== 3) {
      // fallback: split by whitespace (multiple spaces or tabs)
      parts = line.split(/\s+/);
    }

    if (parts.length === 3) {
      const headcount = parseFloat(parts[0].trim().replace(/,/g, '')); // allow "1,000" headcounts
      // Strip common Excel formatting like $ and commas and spaces for step columns
      const unionStep = parseFloat(parts[1].trim().replace(/[\$\s,]/g, ''));
      const mgmtStep  = parseFloat(parts[2].trim().replace(/[\$\s,]/g, ''));

      // Accept headcount 0 as valid (useful to model empty steps)
      if (!isNaN(headcount) && !isNaN(unionStep) && !isNaN(mgmtStep)) {
        headcounts.push(headcount);
        unionSteps.push(unionStep);
        mgmtSteps.push(mgmtStep);
      }
    }
  });

  return { headcounts, unionSteps, mgmtSteps };
}

// Calculate the weighted cost for a given set of steps
function weightedCost(steps, headcounts) {
  return steps.reduce((sum, step, i) => sum + step * (headcounts[i] || 0), 0);
}

// Calculate costs for each year, considering raises
function calculateProposalCosts(steps, headcounts, raise, years) {
  const totals = [];
  let current = [...steps];
  for (let y = 0; y < years; y++) {
    totals.push(weightedCost(current, headcounts));
    current = current.map(s => s * (1 + raise / 100));
  }
  return totals;
}

// Calculate per-step salary progression for ONE person per step
function calculatePerStepProgression(steps, raisePct, years) {
  // returns array-of-arrays: [ [step1_year1, step1_year2, ...], [step2_year1, ...], ... ]
  return steps.map(start => {
    const vals = [];
    let current = start;
    for (let y = 0; y < years; y++) {
      vals.push(current);
      current = current * (1 + raisePct / 100);
    }
    return vals;
  });
}

function sum(array) {
  return array.reduce((acc, val) => acc + val, 0);
}

// Export results to CSV (simple)
function exportCSV() {
  const table = document.getElementById('resultsTable');
  let csv = '';
  for (let row of table.rows) {
    const cells = Array.from(row.cells).map(cell => '"' + cell.textContent.trim().replace(/"/g, '""') + '"');
    csv += cells.join(',') + '\n';
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'contract_costs.csv';
  link.click();
}

// Helper: format number as currency with 2 decimals (no locale-specific commas to avoid double-commas)
function fmtMoney(num) {
  if (typeof num !== 'number' || !isFinite(num)) return '$0.00';
  return '$' + num.toFixed(2);
}

function calculateCosts() {
  const years = Math.max(1, parseInt(document.getElementById('contract-years').value) || 1);
  const lastRaise = parseFloat(document.getElementById('last-raise').value) || 0;

  const allGroups = document.querySelectorAll('.group-block');
  const labels = Array.from({ length: years }, (_, i) => `Year ${i + 1}`);

  let unionTotals = Array(years).fill(0);
  let mgmtTotals = Array(years).fill(0);
  let lastTotals = Array(years).fill(0);

  let groupResults = [];

  allGroups.forEach(group => {
    const groupName = group.querySelector('.group-name').value || 'Unnamed Group';
    const raiseUnion = parseFloat(group.querySelector('.union-raise').value) || 0;
    const raiseMgmt = parseFloat(group.querySelector('.mgmt-raise').value) || 0;

    const csvInput = group.querySelector('.group-csv').value || '';
    const { headcounts, unionSteps, mgmtSteps } = parseCSVTriples(csvInput);

    // calculate totals (weighted by headcount)
    const union = calculateProposalCosts(unionSteps, headcounts, raiseUnion, years);
    const mgmt = calculateProposalCosts(mgmtSteps, headcounts, raiseMgmt, years);
    const last = calculateProposalCosts(mgmtSteps, headcounts, lastRaise, years);

    // NEW: per-step individual salary growth (one person)
    const unionPerPerson = calculatePerStepProgression(unionSteps, raiseUnion, years);
    const mgmtPerPerson  = calculatePerStepProgression(mgmtSteps, raiseMgmt, years);

    unionTotals = unionTotals.map((v, i) => v + (union[i] || 0));
    mgmtTotals = mgmtTotals.map((v, i) => v + (mgmt[i] || 0));
    lastTotals = lastTotals.map((v, i) => v + (last[i] || 0));

    groupResults.push({ groupName, union, mgmt, last, unionSteps, mgmtSteps, unionPerPerson, mgmtPerPerson });
  });

  // Render results
  const table = document.getElementById('resultsTable');
  table.innerHTML = '';

  groupResults.forEach(result => {
    const cumulativeUnion = sum(result.union);
    const cumulativeMgmt = sum(result.mgmt);
    const cumulativeLast = sum(result.last);

    // Header for the group (use a full-row header)
    table.innerHTML += `<tr><th colspan="${Math.max(6, years + 1)}" style="text-align:left; background:#efefef;">${escapeHtml(result.groupName)}</th></tr>`;

    // Main summary header (6 columns)
    table.innerHTML += `<tr>
      <th>Year</th><th>Union</th><th>Mgmt</th><th>Last Contract</th><th>Union - Mgmt</th><th>Union - Last</th>
    </tr>`;

    // Year rows
    for (let i = 0; i < years; i++) {
      const u = result.union[i] || 0;
      const m = result.mgmt[i] || 0;
      const l = result.last[i] || 0;
      table.innerHTML += `<tr>
        <td>Year ${i + 1}</td>
        <td>${fmtMoney(u)}</td>
        <td>${fmtMoney(m)}</td>
        <td>${fmtMoney(l)}</td>
        <td>${fmtMoney(u - m)}</td>
        <td>${fmtMoney(u - l)}</td>
      </tr>`;
    }

    // Totals row
    table.innerHTML += `<tr style="font-weight:bold;">
      <td>Total</td>
      <td>${fmtMoney(cumulativeUnion)}</td>
      <td>${fmtMoney(cumulativeMgmt)}</td>
      <td>${fmtMoney(cumulativeLast)}</td>
      <td>${fmtMoney(cumulativeUnion - cumulativeMgmt)}</td>
      <td>${fmtMoney(cumulativeUnion - cumulativeLast)}</td>
    </tr>`;

    // --- PER-STEP Individual earnings section ---
    // We'll render each step as a small sub-table-like set of rows.
    // Use a colspan that fits the number of columns we'll print: 1 label column + years columns
    const perStepColspan = Math.max(6, years + 1);
    table.innerHTML += `<tr><th colspan="${perStepColspan}" style="text-align:left; background:#f7f7f7;">Per-Step Annual Earnings (One Person)</th></tr>`;

    // If there are no steps, show a message
    if (!result.unionSteps || result.unionSteps.length === 0) {
      table.innerHTML += `<tr><td colspan="${perStepColspan}">No steps/data provided for this group.</td></tr>`;
    } else {
      // For each step, print a header row and then 2 rows (Union, Mgmt) containing per-year values
      result.unionSteps.forEach((uStart, idx) => {
        const mStart = result.mgmtSteps[idx];
        // Step header
        table.innerHTML += `<tr><th colspan="${perStepColspan}" style="text-align:left;">Step ${idx + 1} — Union start: ${fmtMoney(uStart)} — Mgmt start: ${fmtMoney(mStart)}</th></tr>`;

        // Year labels row: first cell "Year", then one header per year
        let yearHeaderCells = `<td><strong>Year</strong></td>`;
        for (let y = 0; y < years; y++) yearHeaderCells += `<td><strong>Year ${y + 1}</strong></td>`;
        table.innerHTML += `<tr>${yearHeaderCells}</tr>`;

        // Union per-person row
        const unionRowCells = (result.unionPerPerson[idx] || []).map(v => `<td>${fmtMoney(v)}</td>`).join('');
        table.innerHTML += `<tr><td><strong>Union</strong></td>${unionRowCells}</tr>`;

        // Mgmt per-person row
        const mgmtRowCells = (result.mgmtPerPerson[idx] || []).map(v => `<td>${fmtMoney(v)}</td>`).join('');
        table.innerHTML += `<tr><td><strong>Mgmt</strong></td>${mgmtRowCells}</tr>`;
      });
    }
  });
}

// small helper to escape HTML used only in group names
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}
