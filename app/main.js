// Hearth & Ledger — the wiring: routes, forms and charts.
// One job: read the hash, ask views.js for the page, put it on screen,
// then hook up the buttons and draw the charts. The data lives in data.js
// and is saved to localStorage on every change, so a refresh keeps it.

import {
  load, save, reset, totals, spentByCategory, CATEGORIES,
  addTransaction, deleteTransaction, setBudget,
  addGoal, contributeGoal, deleteGoal, shiftMonth, monthName, money,
} from './data.js';
import { drawCategoryBars, drawDonut, drawWeeklyBars } from './charts.js';
import { dashboard, transactionsView, categoriesView, goalsView, reportsView } from './views.js';

let data = load();
let month = data.month || '2026-11';
let filter = {};

const view = document.getElementById('view');
const monthLabel = document.getElementById('month-label');

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  return hash.split('/')[0] || '';
}

function drawCharts(route) {
  if (route === '') {
    const bars = document.getElementById('cat-bars');
    if (bars) {
      const byCat = spentByCategory(data, month);
      const rows = CATEGORIES
        .map((c) => ({ label: c.label, spent: byCat[c.id], budget: c.budget }))
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 6);
      drawCategoryBars(bars, rows);
    }
    const donut = document.getElementById('donut');
    if (donut) {
      const t = totals(data, month);
      drawDonut(donut, t.income, t.spent);
    }
  }
  if (route === 'reports') {
    const weekly = document.getElementById('weekly-bars');
    if (weekly) {
      const weeks = [0, 1, 2, 3].map((w) => ({ label: 'Week ' + (w + 1), amount: 0 }));
      for (const tx of data.transactions) {
        if (tx.type !== 'expense' || !tx.date.startsWith(month)) continue;
        const day = Number(tx.date.slice(8, 10));
        weeks[Math.min(3, Math.floor((day - 1) / 7))].amount += tx.amount;
      }
      drawWeeklyBars(weekly, weeks);
    }
  }
}

function render() {
  const route = currentRoute();
  monthLabel.textContent = monthName(month);
  document.querySelectorAll('[data-route]').forEach((a) => {
    a.classList.toggle('active', (a.dataset.route || '') === route);
  });
  if (route === 'transactions') view.innerHTML = transactionsView(data, month, filter);
  else if (route === 'categories') view.innerHTML = categoriesView(data, month);
  else if (route === 'goals') view.innerHTML = goalsView(data);
  else if (route === 'reports') view.innerHTML = reportsView(data, month);
  else view.innerHTML = dashboard(data, month);
  drawCharts(route);
  window.scrollTo(0, 0);
}

function formValues(form) {
  const out = {};
  for (const el of form.elements) {
    if (el.name) out[el.name] = el.value;
  }
  return out;
}

// --- one listener for every button on the page ---
view.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'delete-tx') {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(data, btn.dataset.id);
      data = load();
      render();
    }
  } else if (action === 'delete-goal') {
    if (confirm('Remove this savings goal?')) {
      deleteGoal(data, btn.dataset.id);
      data = load();
      render();
    }
  } else if (action === 'reset-data') {
    if (confirm('Restore the original sample month? Your own entries will be replaced.')) {
      data = reset();
      month = data.month;
      render();
    }
  }
});

// --- one listener for every form on the page ---
view.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.form;
  const v = formValues(form);
  if (kind === 'add-tx') {
    const amount = Number(v.amount);
    if (!amount || amount <= 0) { alert('Enter an amount above $0.'); return; }
    if (!v.date || !v.note.trim()) { alert('Fill in the date and what it was.'); return; }
    const type = v.type === 'income' ? 'income' : 'expense';
    const cats = type === 'income'
      ? ['salary', 'freelance', 'refund', 'other-income']
      : CATEGORIES.map((c) => c.id);
    addTransaction(data, {
      type,
      amount,
      category: cats.includes(v.category) ? v.category : cats[0],
      date: v.date,
      note: v.note.trim(),
    });
    data = load();
    filter = {};
    location.hash = '#/transactions';
    render();
  } else if (kind === 'filter-tx') {
    filter = { type: v.type || '', category: v.category || '', q: (v.q || '').trim() };
    render();
  } else if (kind === 'budget') {
    setBudget(data, v.category, v.budget);
    data = load();
    render();
  } else if (kind === 'add-goal') {
    if (!v.name.trim()) { alert('Give the goal a name.'); return; }
    addGoal(data, v.name.trim(), v.target);
    data = load();
    render();
  } else if (kind === 'contribute') {
    const amount = Number(v.amount);
    if (!amount || amount <= 0) { alert('Enter an amount above $0.'); return; }
    contributeGoal(data, v.goal, amount);
    data = load();
    render();
  }
});

// --- month stepping in the header ---
document.getElementById('prev-month').addEventListener('click', () => {
  month = shiftMonth(month, -1);
  render();
});
document.getElementById('next-month').addEventListener('click', () => {
  month = shiftMonth(month, 1);
  render();
});

window.addEventListener('hashchange', () => { render(); });

render();
