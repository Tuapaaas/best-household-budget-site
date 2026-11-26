// Hearth & Ledger — the five pages, each one a function of the data.
// One job: turn the store's numbers into readable HTML. Nothing here
// talks to the network or to storage; main.js wires the buttons.

import {
  CATEGORIES, categoryLabel, money, monthName, monthTransactions,
  totals, spentByCategory, budgetTotal,
} from './data.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function statTiles(t, saved) {
  return `
  <div class="grid-4">
    <div class="stat income"><small>Income</small><strong>${money(t.income)}</strong><span class="sub">${t.count} transactions this month</span></div>
    <div class="stat spent"><small>Spent</small><strong>${money(t.spent)}</strong><span class="sub">of ${money(budgetTotal())} budgeted</span></div>
    <div class="stat left"><small>Left to spend</small><strong>${money(t.left)}</strong><span class="sub">${t.income ? Math.round((t.left / t.income) * 100) : 0}% of income unspent</span></div>
    <div class="stat good"><small>Saved in goals</small><strong>${money(saved)}</strong><span class="sub">across all savings goals</span></div>
  </div>`;
}

function txRow(t) {
  const sign = t.type === 'income' ? '+' : '−';
  const cls = t.type === 'income' ? 'pos' : 'neg';
  return `<tr>
    <td>${esc(t.date)}</td>
    <td>${esc(t.note)}</td>
    <td><span class="tag">${esc(categoryLabel(t.category))}</span></td>
    <td class="num ${cls}">${sign}${money(t.amount)}</td>
    <td class="hide-phone"><button class="btn ghost small" data-action="delete-tx" data-id="${t.id}" type="button">Delete</button></td>
  </tr>`;
}

export function addForm(data, month) {
  const cats = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
  return `
  <form class="card" data-form="add-tx">
    <h2>Add a transaction</h2>
    <div class="form-grid">
      <div><label for="f-type">Type</label>
        <select id="f-type" name="type"><option value="expense">Expense</option><option value="income">Income</option></select></div>
      <div><label for="f-amount">Amount ($)</label>
        <input id="f-amount" name="amount" type="number" min="0" step="0.01" placeholder="42.50" required></div>
      <div><label for="f-category">Category</label>
        <select id="f-category" name="category">${cats}</select></div>
      <div><label for="f-date">Date</label>
        <input id="f-date" name="date" type="date" value="${month}-15" required></div>
    </div>
    <p><label for="f-note" style="display:block;font-size:.85rem;color:var(--muted);margin:10px 0 4px">What was it?</label>
    <input id="f-note" name="note" type="text" placeholder="e.g. Weekly shop — GreenMart" style="width:100%;padding:9px 10px;border:1px solid #cfc6ac;border-radius:9px" required></p>
    <p><button class="btn" type="submit">Add to the ledger</button></p>
  </form>`;
}

export function dashboard(data, month) {
  const t = totals(data, month);
  const saved = data.goals.reduce((s, g) => s + g.saved, 0);
  const byCat = spentByCategory(data, month);
  const rows = CATEGORIES
    .map((c) => ({ label: c.label, spent: byCat[c.id], budget: c.budget }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6);
  const recent = monthTransactions(data, month)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const over = CATEGORIES.filter((c) => byCat[c.id] > c.budget).length;
  return `
  <h1>Good evening, Alvarez household</h1>
  <p class="lede">Here's ${monthName(month)} at a glance — what came in, what went out, and what's left before the month ends.</p>
  ${over ? `<p class="notice">Heads up: ${over} categor${over === 1 ? 'y is' : 'ies are'} over budget this month. See <a href="#/categories">Categories</a> for the details.</p>` : ''}
  ${statTiles(t, saved)}
  <div class="grid-2">
    <section class="card">
      <h2>Where the money went</h2>
      <canvas id="cat-bars" class="chart" width="600" height="220" aria-label="Spending by category"></canvas>
      <p style="color:var(--muted);font-size:.9rem">Bars show spending; the amber tick marks the monthly budget for each category.</p>
    </section>
    <section class="card">
      <h2>Income vs spending</h2>
      <canvas id="donut" class="chart" width="300" height="190" aria-label="Income versus spending"></canvas>
      <p style="color:var(--muted);font-size:.9rem">${money(t.income)} came in and ${money(t.spent)} went out — <b>${money(t.left)}</b> is still in the pot.</p>
      <h3>Savings goals</h3>
      ${data.goals.map((g) => `
        <div class="rowline"><span class="cat">${esc(g.name)}</span>
        <span class="fig"><b>${money(g.saved)}</b> of ${money(g.target)} · ${Math.min(100, Math.round((g.saved / g.target) * 100))}%</span></div>
        <div class="meter ${g.saved >= g.target ? '' : 'warn'}"><i style="width:${Math.min(100, (g.saved / g.target) * 100)}%"></i></div>`).join('')}
      <p><a href="#/goals">Manage goals →</a></p>
    </section>
  </div>
  <section class="card">
    <h2>Latest transactions</h2>
    <table><thead><tr><th>Date</th><th>What</th><th>Category</th><th class="num">Amount</th><th class="hide-phone"></th></tr></thead>
    <tbody>${recent.map(txRow).join('') || '<tr><td colspan="5" class="empty">Nothing recorded this month yet.</td></tr>'}</tbody></table>
    <p><a href="#/transactions">See all ${t.count} transactions →</a></p>
  </section>
  ${addForm(data, month)}`;
}

export function transactionsView(data, month, filter = {}) {
  let rows = monthTransactions(data, month).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (filter.type) rows = rows.filter((t) => t.type === filter.type);
  if (filter.category) rows = rows.filter((t) => t.category === filter.category);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((t) => t.note.toLowerCase().includes(q) || categoryLabel(t.category).toLowerCase().includes(q));
  }
  const t = totals(data, month);
  const catOpts = ['<option value="">All categories</option>']
    .concat(CATEGORIES.map((c) => `<option value="${c.id}" ${filter.category === c.id ? 'selected' : ''}>${c.label}</option>`))
    .join('');
  return `
  <h1>Transactions — ${monthName(month)}</h1>
  <p class="lede">${t.count} entries: ${money(t.income)} in, ${money(t.spent)} out.</p>
  <form class="card inline-form" data-form="filter-tx">
    <label>Type <select name="type">
      <option value="">All</option>
      <option value="expense" ${filter.type === 'expense' ? 'selected' : ''}>Expenses</option>
      <option value="income" ${filter.type === 'income' ? 'selected' : ''}>Income</option>
    </select></label>
    <label>Category <select name="category">${catOpts}</select></label>
    <label>Search <input name="q" type="search" placeholder="e.g. GreenMart" value="${esc(filter.q || '')}"></label>
    <button class="btn ghost" type="submit">Filter</button>
    <a class="btn ghost" href="#/transactions">Clear</a>
  </form>
  <section class="card">
    <table><thead><tr><th>Date</th><th>What</th><th>Category</th><th class="num">Amount</th><th class="hide-phone"></th></tr></thead>
    <tbody>${rows.map(txRow).join('') || '<tr><td colspan="5" class="empty">No transactions match this filter.</td></tr>'}</tbody></table>
  </section>
  ${addForm(data, month)}`;
}

export function categoriesView(data, month) {
  const byCat = spentByCategory(data, month);
  const t = totals(data, month);
  return `
  <h1>Category budgets — ${monthName(month)}</h1>
  <p class="lede">Each category gets a monthly limit. Spending ${money(t.spent)} of ${money(budgetTotal())} budgeted so far — edit any limit below and it saves at once.</p>
  <section class="card">
    ${CATEGORIES.map((c) => {
      const spent = byCat[c.id];
      const pct = c.budget ? Math.min(100, Math.round((spent / c.budget) * 100)) : 0;
      const over = spent > c.budget;
      const cls = over ? 'over' : pct >= 80 ? 'warn' : '';
      const pill = over
        ? `<span class="pill bad">over by ${money(spent - c.budget)}</span>`
        : `<span class="pill ok">${money(c.budget - spent)} left</span>`;
      return `
      <div class="rowline">
        <span class="cat">${c.label} ${pill}</span>
        <span class="fig"><b>${money(spent)}</b> of ${money(c.budget)} · ${pct}%</span>
      </div>
      <div class="meter ${cls}"><i style="width:${pct}%"></i></div>
      <form class="inline-form" data-form="budget" style="margin:4px 0 14px">
        <input type="hidden" name="category" value="${c.id}">
        <label>Monthly limit ($) <input name="budget" type="number" min="0" step="5" value="${c.budget}" style="width:110px"></label>
        <button class="btn ghost small" type="submit">Save limit</button>
      </form>`;
    }).join('')}
  </section>`;
}

export function goalsView(data) {
  const saved = data.goals.reduce((s, g) => s + g.saved, 0);
  const target = data.goals.reduce((s, g) => s + g.target, 0);
  return `
  <h1>Savings goals</h1>
  <p class="lede">${money(saved)} saved toward ${money(target)} across ${data.goals.length} goals. Add money whenever there's a little left over — every dollar counts.</p>
  <div class="grid-3">
    ${data.goals.map((g) => {
      const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
      const done = g.saved >= g.target;
      return `<article class="goal">
        <h3>${esc(g.name)}</h3>
        <p class="big">${money(g.saved)} <span class="muted">of ${money(g.target)}</span></p>
        <div class="meter ${done ? '' : 'warn'}"><i style="width:${pct}%"></i></div>
        <p class="muted">${pct}% there ${done ? '— goal reached! 🎉' : '· ' + money(g.target - g.saved) + ' to go'}</p>
        <form class="inline-form" data-form="contribute">
          <input type="hidden" name="goal" value="${g.id}">
          <label>Add savings ($) <input name="amount" type="number" min="0" step="5" placeholder="50" style="width:110px" required></label>
          <button class="btn small" type="submit">Add</button>
        </form>
        <p><button class="btn ghost small" data-action="delete-goal" data-id="${g.id}" type="button">Remove goal</button></p>
      </article>`;
    }).join('')}
  </div>
  <form class="card" data-form="add-goal">
    <h2>Start a new goal</h2>
    <div class="inline-form">
      <label>Goal name <input name="name" type="text" placeholder="e.g. Christmas presents" required></label>
      <label>Target ($) <input name="target" type="number" min="1" step="10" placeholder="500" required></label>
      <button class="btn" type="submit">Create goal</button>
    </div>
  </form>`;
}

export function reportsView(data, month) {
  const t = totals(data, month);
  const byCat = spentByCategory(data, month);
  const rows = monthTransactions(data, month).filter((x) => x.type === 'expense')
    .slice().sort((a, b) => b.amount - a.amount).slice(0, 5);
  // weekly buckets: days 1-7, 8-14, 15-21, 22-end
  const weeks = [0, 1, 2, 3].map((w) => ({ label: 'Week ' + (w + 1), amount: 0 }));
  for (const tx of monthTransactions(data, month)) {
    if (tx.type !== 'expense') continue;
    const day = Number(tx.date.slice(8, 10));
    weeks[Math.min(3, Math.floor((day - 1) / 7))].amount += tx.amount;
  }
  const topCats = CATEGORIES.map((c) => ({ label: c.label, spent: byCat[c.id], budget: c.budget }))
    .sort((a, b) => b.spent - a.spent).slice(0, 5);
  const saveRate = t.income ? Math.round(((t.income - t.spent) / t.income) * 100) : 0;
  return `
  <h1>Monthly report — ${monthName(month)}</h1>
  <p class="lede">The month in numbers, for the household meeting. Save rate this month: <b>${saveRate}%</b> of income.</p>
  ${statTiles(t, data.goals.reduce((s, g) => s + g.saved, 0))}
  <div class="grid-2">
    <section class="card">
      <h2>Spending by week</h2>
      <canvas id="weekly-bars" class="chart" width="600" height="170" aria-label="Spending by week"></canvas>
      <p style="color:var(--muted);font-size:.9rem">The last week is amber — it is still in progress.</p>
    </section>
    <section class="card">
      <h2>Biggest single expenses</h2>
      <table><thead><tr><th>Date</th><th>What</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td>${esc(x.date)}</td><td>${esc(x.note)}</td><td class="num neg">${money(x.amount)}</td></tr>`).join('')}</tbody></table>
    </section>
  </div>
  <section class="card">
    <h2>Top categories</h2>
    ${topCats.map((c) => `
      <div class="rowline"><span class="cat">${c.label}</span><span class="fig"><b>${money(c.spent)}</b> of ${money(c.budget)} budgeted</span></div>
      <div class="meter ${c.spent > c.budget ? 'over' : ''}"><i style="width:${c.budget ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0}%"></i></div>`).join('')}
    <p style="margin-top:14px"><button class="btn ghost" data-action="reset-data" type="button">Reset to the sample month</button>
    <span style="color:var(--muted);font-size:.9rem"> Restores the original November figures if your own edits get messy.</span></p>
  </section>`;
}

export { esc };
