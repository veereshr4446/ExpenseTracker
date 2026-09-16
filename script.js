(function () {
  "use strict";

  /* ================= Constants ================= */
  const STORAGE_KEY = "ledger-app-data-v1";

  const DEFAULT_CATEGORIES = [
    { id: "food", name: "Food", color: "#B5482E", type: "expense" },
    { id: "transport", name: "Transport", color: "#8A6D3B", type: "expense" },
    { id: "housing", name: "Housing", color: "#5B4636", type: "expense" },
    { id: "utilities", name: "Utilities", color: "#4A6670", type: "expense" },
    { id: "entertainment", name: "Entertainment", color: "#8E5A8A", type: "expense" },
    { id: "health", name: "Health", color: "#A13D3D", type: "expense" },
    { id: "shopping", name: "Shopping", color: "#B08A3E", type: "expense" },
    { id: "other-expense", name: "Other", color: "#7A7A6E", type: "expense" },
    { id: "salary", name: "Salary", color: "#2F6F4E", type: "income" },
    { id: "freelance", name: "Freelance", color: "#3E7C5A", type: "income" },
    { id: "investment", name: "Investment", color: "#4F8F63", type: "income" },
    { id: "other-income", name: "Other income", color: "#6B9B7A", type: "income" },
  ];

  const SWATCHES = [
    "#B5482E", "#8A6D3B", "#5B4636", "#4A6670", "#8E5A8A", "#A13D3D",
    "#B08A3E", "#7A7A6E", "#2F6F4E", "#3E7C5A", "#4F8F63", "#6B9B7A",
    "#3B5BA5", "#6B4FA0",
  ];

  const CURRENCIES = ["₹", "$", "€", "£", "¥"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const INCOME_HEX = "#2F6F4E";
  const EXPENSE_HEX = "#B5482E";
  const MUTED_HEX = "#7A7568";
  const BORDER_HEX = "#D9D4C2";
  const CARD_HEX = "#FBFAF4";

  const ICON = {
    pencil: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>',
    repeat: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
    alert: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  };

  /* ================= State ================= */
  let data = {
    transactions: [],
    categories: DEFAULT_CATEGORIES.slice(),
    budgets: {},
    settings: { currency: "₹" },
  };

  const now = new Date();
  let currentMonth = { year: now.getFullYear(), month: now.getMonth() };
  let filters = { search: "", type: "all", category: "all", sort: "date-desc" };

  let editingTransactionId = null;
  let currentTxType = "expense";

  let editingCategoryId = null;
  let currentCategoryFormType = "expense";
  let currentCategoryFormColor = SWATCHES[0];

  let categoryChartInstance = null;
  let trendChartInstance = null;
  let toastTimer = null;

  /* ================= Helpers ================= */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function monthLabel(year, month) {
    return MONTH_NAMES[month] + " " + year;
  }

  function currency() {
    return data.settings.currency || "₹";
  }

  function fmtMoney(n) {
    const v = Number(n) || 0;
    return currency() + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function categoryById(id) {
    return data.categories.find((c) => c.id === id);
  }

  function $(id) {
    return document.getElementById(id);
  }

  /* ================= Persistence ================= */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = {
          transactions: parsed.transactions || [],
          categories: parsed.categories && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES.slice(),
          budgets: parsed.budgets || {},
          settings: parsed.settings || { currency: "₹" },
        };
      }
    } catch (e) {
      /* no existing data yet — start fresh */
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      showToast("Couldn't save — storage may be full or blocked", true);
    }
    renderAll();
  }

  /* ================= Toast ================= */
  function showToast(msg, isError) {
    const toast = $("toast");
    const message = $("toast-message");
    message.textContent = msg;
    toast.classList.toggle("error", !!isError);
    toast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
  }

  /* ================= Derived data ================= */
  function getMonthTransactions() {
    return data.transactions.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === currentMonth.year && d.getMonth() === currentMonth.month;
    });
  }

  function getFilteredTransactions() {
    let list = getMonthTransactions().filter((t) => {
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.category !== "all" && t.category !== filters.category) return false;
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const cat = categoryById(t.category);
        const catName = cat ? cat.name.toLowerCase() : "";
        if (!t.description.toLowerCase().includes(q) && !catName.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (filters.sort === "date-desc") return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
      if (filters.sort === "date-asc") return a.date.localeCompare(b.date);
      if (filters.sort === "amount-desc") return Number(b.amount) - Number(a.amount);
      if (filters.sort === "amount-asc") return Number(a.amount) - Number(b.amount);
      return 0;
    });
    return list;
  }

  function getPendingRecurring() {
    const originals = data.transactions.filter((t) => t.recurring);
    return originals.filter((orig) => {
      return !data.transactions.some((t) => {
        if (t.recurringId !== orig.id) return false;
        const d = new Date(t.date + "T00:00:00");
        return d.getFullYear() === currentMonth.year && d.getMonth() === currentMonth.month;
      });
    });
  }

  /* ================= Render: header / summary ================= */
  function renderMonthLabel() {
    $("month-label").textContent = monthLabel(currentMonth.year, currentMonth.month);
  }

  function renderSummary() {
    const monthTx = getMonthTransactions();
    let income = 0, expense = 0;
    monthTx.forEach((t) => {
      if (t.type === "income") income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    });
    const net = income - expense;
    const balanceEl = $("balance-value");
    balanceEl.textContent = fmtMoney(net);
    balanceEl.classList.remove("income-color", "expense-color");
    balanceEl.classList.add(net >= 0 ? "income-color" : "expense-color");
    $("income-value").textContent = fmtMoney(income);
    $("expense-value").textContent = fmtMoney(expense);
  }

  function renderRecurringBanner() {
    const pending = getPendingRecurring();
    const banner = $("recurring-banner");
    if (pending.length === 0) {
      banner.classList.add("hidden");
      return;
    }
    banner.classList.remove("hidden");
    $("recurring-count").textContent = pending.length;
  }

  /* ================= Render: transaction list ================= */
  function renderTransactionList() {
    const container = $("transaction-list");
    const emptyState = $("empty-state");
    const list = getFilteredTransactions();

    if (list.length === 0) {
      container.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    const groups = {};
    list.forEach((t) => {
      groups[t.date] = groups[t.date] || [];
      groups[t.date].push(t);
    });
    const dates = Object.keys(groups).sort((a, b) => (filters.sort === "date-asc" ? a.localeCompare(b) : b.localeCompare(a)));

    let html = "";
    dates.forEach((date) => {
      const label = new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
      html += `<div class="tx-date-header">${escapeHtml(label)}</div>`;
      groups[date].forEach((t) => {
        const cat = categoryById(t.category);
        const catName = cat ? cat.name : "Other";
        const catColor = cat ? cat.color : MUTED_HEX;
        const sign = t.type === "income" ? "+" : "\u2212";
        const amountColor = t.type === "income" ? "income-color" : "expense-color";
        html += `
          <div class="tx-row" data-id="${t.id}">
            <div class="tx-dot" style="background:${catColor}"></div>
            <div class="tx-info">
              <div class="tx-desc">${escapeHtml(t.description || "(No description)")}${t.recurring ? ICON.repeat : ""}</div>
              <div class="tx-category">${escapeHtml(catName)}</div>
            </div>
            <div class="tx-amount ${amountColor}">${sign}${fmtMoney(t.amount)}</div>
            <div class="tx-actions">
              <button class="icon-btn-sm" data-action="edit-tx" data-id="${t.id}" aria-label="Edit">${ICON.pencil}</button>
              <button class="icon-btn-sm" data-action="delete-tx" data-id="${t.id}" aria-label="Delete">${ICON.trash}</button>
            </div>
          </div>`;
      });
    });
    container.innerHTML = html;
  }

  /* ================= Render: category filter options ================= */
  function renderCategoryFilterOptions() {
    const select = $("category-filter");
    const prevValue = select.value || "all";
    select.innerHTML = '<option value="all">All categories</option>' +
      data.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    const stillExists = data.categories.some((c) => c.id === prevValue) || prevValue === "all";
    select.value = stillExists ? prevValue : "all";
    filters.category = select.value;
  }

  /* ================= Render: charts ================= */
  function renderCategoryChart() {
    const monthTx = getMonthTransactions();
    const sums = {};
    monthTx.forEach((t) => {
      if (t.type !== "expense") return;
      sums[t.category] = (sums[t.category] || 0) + (Number(t.amount) || 0);
    });
    const breakdown = Object.entries(sums)
      .map(([catId, value]) => {
        const cat = categoryById(catId);
        return { name: cat ? cat.name : "Other", value, color: cat ? cat.color : MUTED_HEX };
      })
      .sort((a, b) => b.value - a.value);

    const wrap = $("category-chart-wrap");
    const emptyEl = $("category-empty");
    const legend = $("category-legend");

    if (breakdown.length === 0) {
      wrap.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      legend.innerHTML = "";
      if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
      }
      return;
    }
    wrap.classList.remove("hidden");
    emptyEl.classList.add("hidden");

    const ctx = $("category-chart").getContext("2d");
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: breakdown.map((b) => b.name),
        datasets: [{
          data: breakdown.map((b) => b.value),
          backgroundColor: breakdown.map((b) => b.color),
          borderColor: CARD_HEX,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => " " + ctx.label + ": " + fmtMoney(ctx.parsed),
            },
          },
        },
      },
    });

    legend.innerHTML = breakdown.slice(0, 6).map((b) => `
      <div class="legend-item">
        <span class="legend-item-name"><span class="dot" style="background:${b.color}"></span>${escapeHtml(b.name)}</span>
        <span class="legend-item-value">${fmtMoney(b.value)}</span>
      </div>`).join("");
  }

  function renderTrendChart() {
    const points = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentMonth.year, currentMonth.month - i, 1);
      const y = d.getFullYear(), m = d.getMonth();
      let income = 0, expense = 0;
      data.transactions.forEach((t) => {
        const td = new Date(t.date + "T00:00:00");
        if (td.getFullYear() === y && td.getMonth() === m) {
          if (t.type === "income") income += Number(t.amount) || 0;
          else expense += Number(t.amount) || 0;
        }
      });
      points.push({ label: MONTH_NAMES[m].slice(0, 3), income, expense });
    }

    const ctx = $("trend-chart").getContext("2d");
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: points.map((p) => p.label),
        datasets: [
          {
            label: "Income",
            data: points.map((p) => p.income),
            borderColor: INCOME_HEX,
            backgroundColor: INCOME_HEX,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
          },
          {
            label: "Expense",
            data: points.map((p) => p.expense),
            borderColor: EXPENSE_HEX,
            backgroundColor: EXPENSE_HEX,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => " " + ctx.dataset.label + ": " + fmtMoney(ctx.parsed.y) } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: MUTED_HEX, font: { size: 11 } } },
          y: { grid: { color: BORDER_HEX }, ticks: { color: MUTED_HEX, font: { size: 10 } } },
        },
      },
    });
  }

  /* ================= Render: budgets ================= */
  function renderBudgets() {
    const monthTx = getMonthTransactions();
    const expenseCats = data.categories.filter((c) => c.type === "expense" || c.type === "both");
    const rows = expenseCats
      .map((c) => {
        const spent = monthTx.filter((t) => t.type === "expense" && t.category === c.id).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const limit = data.budgets[c.id] || 0;
        return { cat: c, spent, limit, hasBudget: limit > 0 };
      })
      .filter((r) => r.hasBudget || r.spent > 0)
      .sort((a, b) => (b.spent / (b.limit || 1)) - (a.spent / (a.limit || 1)));

    const listEl = $("budget-list");
    const emptyEl = $("budget-empty");

    if (rows.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    listEl.innerHTML = rows.map((r) => {
      const pct = r.limit > 0 ? Math.min(100, (r.spent / r.limit) * 100) : 0;
      const over = r.limit > 0 && r.spent > r.limit;
      const barColor = over ? EXPENSE_HEX : r.cat.color;
      return `
        <div class="budget-row">
          <div class="budget-row-header">
            <span class="budget-row-name">
              <span class="dot" style="background:${r.cat.color}"></span>
              ${escapeHtml(r.cat.name)}
              ${over ? ICON.alert : ""}
            </span>
            <span class="budget-row-amount${over ? " over" : ""}">
              ${fmtMoney(r.spent)}${r.limit > 0 ? " / " + fmtMoney(r.limit) : ""}
            </span>
          </div>
          <div class="budget-bar-track">
            <div class="budget-bar-fill" style="width:${r.limit > 0 ? pct : 0}%; background:${barColor}"></div>
          </div>
        </div>`;
    }).join("");
  }

  /* ================= Render: all ================= */
  function renderAll() {
    renderMonthLabel();
    renderSummary();
    renderRecurringBanner();
    renderCategoryFilterOptions();
    renderTransactionList();
    renderCategoryChart();
    renderTrendChart();
    renderBudgets();
  }

  /* ================= Modal helpers ================= */
  function openModal(id) {
    $(id).classList.remove("hidden");
  }
  function closeModal(id) {
    $(id).classList.add("hidden");
  }
  function closeAllModals() {
    ["transaction-modal", "category-modal", "budget-modal", "settings-modal"].forEach(closeModal);
  }

  /* ================= Transaction modal ================= */
  function renderCategorySelectOptions(type, preferredId) {
    const select = $("category-select");
    const available = data.categories.filter((c) => c.type === type || c.type === "both");
    select.innerHTML = available.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    if (preferredId && available.some((c) => c.id === preferredId)) {
      select.value = preferredId;
    } else if (available.length) {
      select.value = available[0].id;
    }
  }

  function setTxType(type) {
    currentTxType = type;
    $("type-expense-btn").classList.toggle("active", type === "expense");
    $("type-income-btn").classList.toggle("active", type === "income");
    renderCategorySelectOptions(type);
  }

  function openTransactionModal(tx) {
    editingTransactionId = tx ? tx.id : null;
    $("transaction-modal-title").textContent = tx ? "Edit transaction" : "Add transaction";
    $("transaction-id").value = tx ? tx.id : "";
    $("amount-input").value = tx ? tx.amount : "";
    $("description-input").value = tx ? tx.description : "";
    $("date-input").value = tx ? tx.date : todayStr();
    $("recurring-checkbox").checked = tx ? !!tx.recurring : false;
    $("transaction-error").classList.add("hidden");

    const type = tx ? tx.type : "expense";
    currentTxType = type;
    $("type-expense-btn").classList.toggle("active", type === "expense");
    $("type-income-btn").classList.toggle("active", type === "income");
    renderCategorySelectOptions(type, tx ? tx.category : null);

    $("save-transaction-btn").textContent = tx ? "Save changes" : "Add transaction";
    openModal("transaction-modal");
    $("amount-input").focus();
  }

  function saveTransactionFromForm() {
    const amount = Number($("amount-input").value);
    const description = $("description-input").value.trim();
    const category = $("category-select").value;
    const date = $("date-input").value;
    const recurring = $("recurring-checkbox").checked;
    const errorEl = $("transaction-error");

    if (!amount || isNaN(amount) || amount <= 0) {
      errorEl.textContent = "Enter an amount greater than zero.";
      errorEl.classList.remove("hidden");
      return;
    }
    if (!category) {
      errorEl.textContent = "Choose a category.";
      errorEl.classList.remove("hidden");
      return;
    }
    if (!date) {
      errorEl.textContent = "Choose a date.";
      errorEl.classList.remove("hidden");
      return;
    }

    if (editingTransactionId) {
      const existing = data.transactions.find((t) => t.id === editingTransactionId);
      const updated = {
        id: editingTransactionId,
        type: currentTxType,
        amount, description, category, date, recurring,
        recurringId: existing ? existing.recurringId : undefined,
      };
      data.transactions = data.transactions.map((t) => (t.id === editingTransactionId ? updated : t));
      showToast("Transaction updated");
    } else {
      data.transactions.push({ id: uid(), type: currentTxType, amount, description, category, date, recurring });
      showToast(currentTxType === "income" ? "Income added" : "Expense added");
    }

    closeModal("transaction-modal");
    persist();
  }

  function deleteTransaction(id) {
    data.transactions = data.transactions.filter((t) => t.id !== id);
    showToast("Transaction deleted");
    persist();
  }

  function applyRecurring() {
    const pending = getPendingRecurring();
    const dim = daysInMonth(currentMonth.year, currentMonth.month);
    const copies = pending.map((orig) => {
      const origDay = new Date(orig.date + "T00:00:00").getDate();
      const day = Math.min(origDay, dim);
      const date = currentMonth.year + "-" + String(currentMonth.month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      return { ...orig, id: uid(), date, recurring: false, recurringId: orig.id };
    });
    data.transactions = data.transactions.concat(copies);
    showToast("Added " + copies.length + " recurring transaction" + (copies.length === 1 ? "" : "s"));
    persist();
  }

  /* ================= Category modal ================= */
  function renderCategoryList() {
    const listEl = $("category-list");
    listEl.innerHTML = data.categories.map((c) => `
      <div class="category-item">
        <span class="category-item-color" style="background:${c.color}"></span>
        <span class="category-item-name">${escapeHtml(c.name)}</span>
        <span class="category-item-type">${c.type}</span>
        <button class="icon-btn-sm" data-action="edit-cat" data-id="${c.id}" aria-label="Edit category">${ICON.pencil}</button>
        <button class="icon-btn-sm" data-action="delete-cat" data-id="${c.id}" aria-label="Delete category">${ICON.trash}</button>
      </div>`).join("");
  }

  function showCategoryListView() {
    $("category-list-view").classList.remove("hidden");
    $("category-form-view").classList.add("hidden");
    renderCategoryList();
  }

  function renderColorSwatches() {
    const wrap = $("color-swatches");
    wrap.innerHTML = SWATCHES.map((sw) => `
      <button type="button" class="color-swatch${sw === currentCategoryFormColor ? " selected" : ""}" style="background:${sw}" data-color="${sw}"></button>
    `).join("");
  }

  function setCategoryFormType(type) {
    currentCategoryFormType = type;
    $("cat-type-expense-btn").classList.toggle("active", type === "expense");
    $("cat-type-income-btn").classList.toggle("active", type === "income");
  }

  function openCategoryForm(cat) {
    editingCategoryId = cat ? cat.id : null;
    $("category-id").value = cat ? cat.id : "";
    $("category-name-input").value = cat ? cat.name : "";
    currentCategoryFormColor = cat ? cat.color : SWATCHES[0];
    setCategoryFormType(cat ? cat.type : "expense");
    renderColorSwatches();
    $("category-error").classList.add("hidden");
    $("category-list-view").classList.add("hidden");
    $("category-form-view").classList.remove("hidden");
  }

  function saveCategoryFromForm() {
    const name = $("category-name-input").value.trim();
    const errorEl = $("category-error");
    if (!name) {
      errorEl.textContent = "Enter a category name.";
      errorEl.classList.remove("hidden");
      return;
    }
    if (editingCategoryId) {
      data.categories = data.categories.map((c) =>
        c.id === editingCategoryId ? { id: editingCategoryId, name, color: currentCategoryFormColor, type: currentCategoryFormType } : c
      );
    } else {
      data.categories.push({ id: uid(), name, color: currentCategoryFormColor, type: currentCategoryFormType });
    }
    showCategoryListView();
    persist();
  }

  function deleteCategory(id) {
    if (data.transactions.some((t) => t.category === id)) {
      showToast("Can't delete \u2014 category is in use", true);
      return;
    }
    data.categories = data.categories.filter((c) => c.id !== id);
    delete data.budgets[id];
    renderCategoryList();
    persist();
  }

  /* ================= Budget modal ================= */
  function renderBudgetFormList() {
    const expenseCats = data.categories.filter((c) => c.type === "expense" || c.type === "both");
    const listEl = $("budget-form-list");
    listEl.innerHTML = expenseCats.map((c) => `
      <div class="budget-form-row">
        <span class="budget-form-name">
          <span class="dot" style="background:${c.color}"></span>
          ${escapeHtml(c.name)}
        </span>
        <span class="budget-input-wrap">
          <span class="budget-currency">${currency()}</span>
          <input class="text-input" type="number" min="0" step="1" placeholder="No limit"
            data-budget-cat="${c.id}" value="${data.budgets[c.id] || ""}" />
        </span>
      </div>`).join("");
  }

  function saveBudgetsFromForm() {
    const inputs = document.querySelectorAll("[data-budget-cat]");
    const newBudgets = {};
    inputs.forEach((input) => {
      const catId = input.getAttribute("data-budget-cat");
      const n = Number(input.value);
      if (input.value !== "" && !isNaN(n) && n > 0) newBudgets[catId] = n;
    });
    data.budgets = newBudgets;
    closeModal("budget-modal");
    showToast("Budgets updated");
    persist();
  }

  /* ================= Settings modal ================= */
  function renderCurrencyOptions() {
    const wrap = $("currency-options");
    wrap.innerHTML = CURRENCIES.map((sym) => `
      <button type="button" class="currency-btn${sym === currency() ? " active" : ""}" data-currency="${sym}">${sym}</button>
    `).join("");
  }

  function setCurrency(symbol) {
    data.settings.currency = symbol;
    renderCurrencyOptions();
    persist();
  }

  /* ================= Export ================= */
  function exportCSV() {
    const rows = [["Date", "Type", "Category", "Description", "Amount", "Recurring"]];
    getFilteredTransactions().forEach((t) => {
      const cat = categoryById(t.category);
      rows.push([t.date, t.type, cat ? cat.name : "Other", (t.description || "").replace(/"/g, '""'), t.amount, t.recurring ? "yes" : "no"]);
    });
    const csv = rows.map((r) => r.map((c) => '"' + c + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger-" + currentMonth.year + "-" + String(currentMonth.month + 1).padStart(2, "0") + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV exported");
  }

  function truncate(str, n) {
    str = String(str || "");
    return str.length > n ? str.slice(0, n - 1) + "\u2026" : str;
  }

  function pdfMoney(n) {
    const v = Number(n) || 0;
    const symbol = currency() === "\u20B9" ? "Rs. " : currency();
    return symbol + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportPDF() {
    if (!window.jspdf) {
      showToast("PDF library failed to load", true);
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 50;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Ledger", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(120, 117, 104);
    doc.text(monthLabel(currentMonth.year, currentMonth.month), marginX, y + 18);
    doc.setTextColor(32, 36, 31);

    const monthTx = getMonthTransactions();
    let income = 0, expense = 0;
    monthTx.forEach((t) => {
      if (t.type === "income") income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    });
    const net = income - expense;

    y += 46;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Balance", marginX, y);
    doc.text("Income", marginX + 180, y);
    doc.text("Expenses", marginX + 340, y);
    doc.setFont("helvetica", "normal");
    doc.text(pdfMoney(net), marginX, y + 16);
    doc.text(pdfMoney(income), marginX + 180, y + 16);
    doc.text(pdfMoney(expense), marginX + 340, y + 16);

    y += 40;
    doc.setDrawColor(217, 212, 194);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 22;

    const cols = [
      { label: "Date", x: marginX },
      { label: "Type", x: marginX + 70 },
      { label: "Category", x: marginX + 125 },
      { label: "Description", x: marginX + 215 },
      { label: "Amount", x: marginX + 400 },
    ];

    function drawTableHeader() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      cols.forEach((c) => doc.text(c.label, c.x, y));
      y += 8;
      doc.setDrawColor(217, 212, 194);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 16;
      doc.setFont("helvetica", "normal");
    }

    drawTableHeader();

    const list = getFilteredTransactions();
    if (list.length === 0) {
      doc.setTextColor(120, 117, 104);
      doc.text("No transactions for this view.", marginX, y);
      doc.setTextColor(32, 36, 31);
    } else {
      list.forEach((t) => {
        if (y > pageHeight - 60) {
          doc.addPage();
          y = 50;
          drawTableHeader();
        }
        const cat = categoryById(t.category);
        const catName = cat ? cat.name : "Other";
        const sign = t.type === "income" ? "+" : "-";
        doc.text(t.date, cols[0].x, y);
        doc.text(t.type, cols[1].x, y);
        doc.text(truncate(catName, 15), cols[2].x, y);
        doc.text(truncate(t.description || "-", 26), cols[3].x, y);
        doc.text(sign + pdfMoney(t.amount), cols[4].x, y);
        y += 18;
      });
    }

    doc.save("ledger-" + currentMonth.year + "-" + String(currentMonth.month + 1).padStart(2, "0") + ".pdf");
    showToast("PDF exported");
  }

  /* ================= Month navigation ================= */
  function changeMonth(delta) {
    const d = new Date(currentMonth.year, currentMonth.month + delta, 1);
    currentMonth = { year: d.getFullYear(), month: d.getMonth() };
    renderAll();
  }

  /* ================= Event wiring ================= */
  function initEvents() {
    $("prev-month-btn").addEventListener("click", () => changeMonth(-1));
    $("next-month-btn").addEventListener("click", () => changeMonth(1));

    $("add-transaction-btn").addEventListener("click", () => openTransactionModal(null));
    $("export-btn").addEventListener("click", exportCSV);
    $("export-pdf-btn").addEventListener("click", exportPDF);
    $("settings-btn").addEventListener("click", () => { renderCurrencyOptions(); openModal("settings-modal"); });
    $("apply-recurring-btn").addEventListener("click", applyRecurring);

    $("search-input").addEventListener("input", (e) => { filters.search = e.target.value; renderTransactionList(); });
    $("type-filter").addEventListener("change", (e) => { filters.type = e.target.value; renderTransactionList(); });
    $("category-filter").addEventListener("change", (e) => { filters.category = e.target.value; renderTransactionList(); });
    $("sort-select").addEventListener("change", (e) => { filters.sort = e.target.value; renderTransactionList(); });

    $("transaction-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (btn.dataset.action === "edit-tx") {
        const tx = data.transactions.find((t) => t.id === id);
        if (tx) openTransactionModal(tx);
      } else if (btn.dataset.action === "delete-tx") {
        deleteTransaction(id);
      }
    });

    $("type-expense-btn").addEventListener("click", () => setTxType("expense"));
    $("type-income-btn").addEventListener("click", () => setTxType("income"));
    $("save-transaction-btn").addEventListener("click", saveTransactionFromForm);
    $("manage-categories-btn").addEventListener("click", () => {
      closeModal("transaction-modal");
      showCategoryListView();
      openModal("category-modal");
    });

    $("new-category-btn").addEventListener("click", () => openCategoryForm(null));
    $("cancel-category-btn").addEventListener("click", showCategoryListView);
    $("save-category-btn").addEventListener("click", saveCategoryFromForm);
    $("cat-type-expense-btn").addEventListener("click", () => setCategoryFormType("expense"));
    $("cat-type-income-btn").addEventListener("click", () => setCategoryFormType("income"));

    $("category-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (btn.dataset.action === "edit-cat") {
        const cat = categoryById(id);
        if (cat) openCategoryForm(cat);
      } else if (btn.dataset.action === "delete-cat") {
        deleteCategory(id);
      }
    });

    $("color-swatches").addEventListener("click", (e) => {
      const btn = e.target.closest(".color-swatch");
      if (!btn) return;
      currentCategoryFormColor = btn.getAttribute("data-color");
      renderColorSwatches();
    });

    $("edit-budgets-btn").addEventListener("click", () => { renderBudgetFormList(); openModal("budget-modal"); });
    $("save-budgets-btn").addEventListener("click", saveBudgetsFromForm);

    $("currency-options").addEventListener("click", (e) => {
      const btn = e.target.closest(".currency-btn");
      if (!btn) return;
      setCurrency(btn.getAttribute("data-currency"));
    });

    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close")));
    });

    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllModals();
    });
  }

  /* ================= Init ================= */
  function init() {
    loadData();
    initEvents();
    renderAll();
  }

  init();
})();
