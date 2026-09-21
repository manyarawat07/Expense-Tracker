// DOM elements will be cached after DOMContentLoaded to ensure reliability
let balance, totalIncome, totalExpense, list, form, formTitle, editId, amountInput, dateInput, notesInput;
let categoryBtns, toggleNotesBtn, optionalFields, addExpenseBtn, addIncomeBtn;
let budgetInput, setBudgetBtn, budgetText, budgetProgress, budgetAlert;
let searchInput, filterType, filterCategory, filterDateFrom, filterDateTo;
let aiTextInput, aiParseBtn, aiConfirmCard, aiConfirmBtn, aiCancelBtn, aiInsightsContainer;
let pendingAITransaction = null;

// Local Storage Setup
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

const localStorageBudget = localStorage.getItem('monthlyBudget');
let monthlyBudget = localStorageBudget !== null ? parseFloat(localStorageBudget) : 0;

let expenseChart = null;

// Format currency
function formatCurrency(num) {
    const n = Number(num) || 0;
    return '₹' + n.toFixed(2);
}

// Generate random ID
function generateID() {
    return Math.floor(Math.random() * 100000000).toString();
}

// Initialize event listeners safely
function initializeEventListeners() {
    // Category buttons
    if (categoryBtns && categoryBtns.length > 0) {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCategory = btn.getAttribute('data-category');
            });
        });
    }

    // Toggle optional fields
    if (toggleNotesBtn && optionalFields) {
        toggleNotesBtn.addEventListener('click', () => {
            optionalFields.classList.toggle('collapsed');
            if(optionalFields.classList.contains('collapsed')) {
                toggleNotesBtn.innerText = '+ Add Note & Date';
            } else {
                toggleNotesBtn.innerText = '- Hide Note & Date';
            }
        });
    }

    // Form submit for expense
    if (form) {
        form.addEventListener('submit', (e) => addTransaction(e, 'expense'));
    }

    // Income button
    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', (e) => addTransaction(e, 'income'));
    }

    // Budget
    if (setBudgetBtn) setBudgetBtn.addEventListener('click', setBudget);

    // Filters
    if (searchInput) searchInput.addEventListener('input', filterTransactions);
    if (filterType) filterType.addEventListener('change', filterTransactions);
    if (filterCategory) filterCategory.addEventListener('change', filterTransactions);
    if (filterDateFrom) filterDateFrom.addEventListener('change', filterTransactions);
    if (filterDateTo) filterDateTo.addEventListener('change', filterTransactions);

    // AI
    if (aiParseBtn) aiParseBtn.addEventListener('click', handleAIParse);
    if (aiCancelBtn) aiCancelBtn.addEventListener('click', handleAICancel);
    if (aiConfirmBtn) aiConfirmBtn.addEventListener('click', handleAIConfirm);

    // Event delegation for edit/delete on transaction list
    if (list) {
        list.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                if (id) editTransaction(id);
            } else if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                if (id) removeTransaction(id);
            }
        });
    }
}

// Category Selection Logic
let selectedCategory = 'Food';

// Add transaction
function addTransaction(e, type = 'expense') {
    if(e) e.preventDefault();

    if (!amountInput || amountInput.value.trim() === '') {
        alert('Please add amount');
        return;
    }

    const amountVal = parseFloat(amountInput.value);
    if (isNaN(amountVal) || amountVal <= 0) {
        alert('Please enter a valid positive amount.');
        return;
    }

    const transaction = {
        id: (editId && editId.value) ? editId.value : generateID(),
        type: type,
        category: selectedCategory,
        amount: amountVal,
        date: dateInput.value || new Date().toISOString().split('T')[0],
        notes: (notesInput && notesInput.value) ? notesInput.value.trim() : ''
    };

    if (editId && editId.value) {
        transactions = transactions.map(t => t.id === transaction.id ? transaction : t);
        editId.value = '';
        if (formTitle) formTitle.innerText = 'Quick Add Transaction';
        if (addExpenseBtn) addExpenseBtn.innerText = 'Add Expense (Enter)';
    } else {
        transactions.push(transaction);
    }

    updateLocalStorage();
    init();

    // Reset Form
    if (amountInput) amountInput.value = '';
    if (notesInput) notesInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    // Reset category to Food
    if (categoryBtns) {
        categoryBtns.forEach(b => b.classList.remove('active'));
        const defaultBtn = document.querySelector('.category-btn[data-category="Food"]');
        if(defaultBtn) {
            defaultBtn.classList.add('active');
            selectedCategory = 'Food';
        }
    }

    // Collapse optional fields if not editing
    if (optionalFields) optionalFields.classList.add('collapsed');
    if (toggleNotesBtn) toggleNotesBtn.innerText = '+ Add Note & Date';
    if (amountInput) amountInput.focus();
}


// Add transaction to DOM list
function addTransactionDOM(transaction) {
    if (!list) return;

    const sign = transaction.type === 'income' ? '+' : '-';
    const item = document.createElement('li');
    item.classList.add(transaction.type);

    // Safety check for values
    const safeCat = transaction.category || 'Other';
    const safeAmount = isNaN(transaction.amount) ? 0 : Number(transaction.amount);
    const safeDate = transaction.date || '';
    const safeNotes = transaction.notes || '';

    // Build DOM nodes instead of inline onclick handlers
    const info = document.createElement('div');
    info.className = 'transaction-info';

    const header = document.createElement('div');
    header.className = 'transaction-header';

    const catSpan = document.createElement('span');
    catSpan.className = 'transaction-category';
    catSpan.innerText = safeCat;

    const typeSpan = document.createElement('span');
    typeSpan.className = 'transaction-type';
    typeSpan.style.marginLeft = '8px';
    typeSpan.style.fontSize = '0.85rem';
    typeSpan.style.color = '#666';
    typeSpan.innerText = transaction.type === 'income' ? '(Income)' : '(Expense)';

    const amtSpan = document.createElement('span');
    amtSpan.className = `transaction-amount ${transaction.type === 'income' ? 'money plus' : 'money minus'}`;
    amtSpan.innerText = `${sign}${formatCurrency(safeAmount)}`;

    header.appendChild(catSpan);
    header.appendChild(typeSpan);
    header.appendChild(amtSpan);

    const details = document.createElement('div');
    details.className = 'transaction-details';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'transaction-date';
    dateSpan.innerText = safeDate;

    const notesSpan = document.createElement('span');
    notesSpan.className = 'transaction-notes';
    notesSpan.innerText = safeNotes;

    details.appendChild(dateSpan);
    details.appendChild(notesSpan);

    info.appendChild(header);
    info.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'transaction-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.setAttribute('data-id', transaction.id);
    editBtn.innerHTML = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.setAttribute('data-id', transaction.id);
    deleteBtn.innerHTML = 'Delete';

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);

    list.appendChild(item);
}

// Populate category filter based on transactions and default categories
function populateCategoryFilter() {
    if (!filterCategory) return;

    const defaultCats = ['Food','Travel','Shopping','Education','Health','Bills','Other','Salary'];
    const cats = new Set(defaultCats);
    transactions.forEach(t => {
        if (t.category) cats.add(t.category);
    });

    // Clear existing options and add 'all'
    filterCategory.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.innerText = 'All Categories';
    filterCategory.appendChild(allOpt);

    Array.from(cats).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        filterCategory.appendChild(opt);
    });
}

// Edit transaction (globally accessible)
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    if (editId) editId.value = transaction.id;
    if (amountInput) amountInput.value = transaction.amount;
    if (dateInput) dateInput.value = transaction.date;
    if (notesInput) notesInput.value = transaction.notes;

    // Set category
    if (categoryBtns) {
        categoryBtns.forEach(b => b.classList.remove('active'));
        const catBtn = document.querySelector(`.category-btn[data-category="${transaction.category}"]`);
        if(catBtn) {
            catBtn.classList.add('active');
            selectedCategory = transaction.category;
        } else {
            selectedCategory = 'Other';
        }
    }

    // Expand notes if there's a note or if date isn't today
    const today = new Date().toISOString().split('T')[0];
    if (optionalFields && (transaction.notes || transaction.date !== today)) {
        optionalFields.classList.remove('collapsed');
        if (toggleNotesBtn) toggleNotesBtn.innerText = '- Hide Note & Date';
    }

    if (formTitle) formTitle.innerText = 'Edit Transaction';
    if (addExpenseBtn) addExpenseBtn.innerText = 'Update Expense';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Remove transaction (globally accessible)
function removeTransaction(id) {
    if(confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        init();
    }
}

// Update balance, income and expense
function updateValues(filteredTransactions = transactions) {
    const amounts = filteredTransactions.map(transaction => 
        transaction.type === 'income' ? Number(transaction.amount) || 0 : -(Number(transaction.amount) || 0)
    );

    const total = amounts.reduce((acc, item) => acc + item, 0);

    const income = filteredTransactions
        .filter(item => item.type === 'income')
        .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    const expense = filteredTransactions
        .filter(item => item.type === 'expense')
        .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    if (balance) balance.innerText = formatCurrency(total);
    if (totalIncome) totalIncome.innerText = formatCurrency(income);
    if (totalExpense) totalExpense.innerText = formatCurrency(expense);

    updateBudgetStatus(expense);
}

// Update Budget Status
function updateBudgetStatus(currentExpense) {
    if (!budgetProgress || !budgetText || !budgetAlert) return;

    if (monthlyBudget > 0) {
        budgetText.innerText = `Budget: ${formatCurrency(monthlyBudget)} | Spent: ${formatCurrency(currentExpense)}`;
        
        let percentage = (currentExpense / monthlyBudget) * 100;
        if (percentage > 100) percentage = 100;
        
        budgetProgress.style.width = `${percentage}%`;
        
        if (currentExpense > monthlyBudget) {
            budgetProgress.style.backgroundColor = 'var(--danger-color)';
            budgetAlert.classList.remove('hidden');
        } else if (percentage > 80) {
            budgetProgress.style.backgroundColor = '#f39c12';
            budgetAlert.classList.add('hidden');
        } else {
            budgetProgress.style.backgroundColor = 'var(--success-color)';
            budgetAlert.classList.add('hidden');
        }
    } else {
        budgetText.innerText = 'No budget set for this month.';
        budgetProgress.style.width = '0%';
        budgetAlert.classList.add('hidden');
    }
}

// Set Budget
function setBudget() {
    if (!budgetInput) return;
    
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
        monthlyBudget = val;
        localStorage.setItem('monthlyBudget', monthlyBudget);
        budgetInput.value = '';
        init();
    } else {
        alert('Please enter a valid budget amount');
    }
}

// Filter transactions
function filterTransactions() {
    if (!list) return;

    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const type = filterType ? filterType.value : 'all';
    const category = filterCategory ? filterCategory.value : 'all';
    const dateFrom = filterDateFrom ? filterDateFrom.value : '';
    const dateTo = filterDateTo ? filterDateTo.value : '';

    const filtered = transactions.filter(t => {
        const safeNotes = t.notes || '';
        const matchSearch = safeNotes.toLowerCase().includes(search);
        const matchType = type === 'all' || t.type === type;
        const matchCategory = category === 'all' || t.category === category;
        const matchDateFrom = !dateFrom || t.date >= dateFrom;
        const matchDateTo = !dateTo || t.date <= dateTo;
        return matchSearch && matchType && matchCategory && matchDateFrom && matchDateTo;
    });

    list.innerHTML = '';
    filtered.forEach(addTransactionDOM);
    updateValues(filtered);
}

// Update Chart safely (fallback if Chart.js fails)
function updateChart() {
    const chartCanvas = document.getElementById('expense-chart');
    const chartContainer = chartCanvas ? chartCanvas.parentElement : document.querySelector('.chart-container');
    if (!chartContainer) return;

    let totalInc = 0;
    let totalExp = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalInc += Number(t.amount) || 0;
        else totalExp += Number(t.amount) || 0;
    });

    // Simple visual: two horizontal bars showing proportion
    const total = totalInc + totalExp || 1;
    const incPct = Math.round((totalInc / total) * 100);
    const expPct = Math.round((totalExp / total) * 100);

    chartContainer.innerHTML = `
        <div class="simple-chart">
            <div class="bar-row">
                <div class="bar-label">Income ${formatCurrency(totalInc)}</div>
                <div class="bar-wrap"><div class="bar inc" style="width: ${incPct}%"></div></div>
            </div>
            <div class="bar-row">
                <div class="bar-label">Expense ${formatCurrency(totalExp)}</div>
                <div class="bar-wrap"><div class="bar exp" style="width: ${expPct}%"></div></div>
            </div>
        </div>
    `;
}

// Update Local Storage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}


// --- AI Logic ---

function parseNaturalLanguage(text) {
    text = text.toLowerCase();
    
    let amount = 0;
    let type = 'expense';
    let category = 'Other';
    let date = new Date().toISOString().split('T')[0];
    let note = text;

    // 1. Extract Amount
    const amountMatch = text.match(/(?:rs\.?\s*|₹\s*)?(\d+(\.\d{1,2})?)/i);
    if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
    }

    // 2. Extract Type
    const incomeKeywords = ['received', 'got', 'earned', 'salary', 'income', 'credited'];
    if (incomeKeywords.some(keyword => text.includes(keyword))) {
        type = 'income';
    }

    // 3. Extract Category
    const categoryMap = {
        'Food': ['lunch', 'dinner', 'breakfast', 'food', 'restaurant', 'pizza', 'burger', 'coffee', 'cafe', 'swiggy', 'zomato'],
        'Travel': ['cab', 'uber', 'ola', 'bus', 'train', 'flight', 'petrol', 'fuel', 'metro', 'travel', 'auto'],
        'Shopping': ['shopping', 'clothes', 'shoes', 'amazon', 'flipkart', 'myntra', 'shirt', 'dress'],
        'Education': ['books', 'course', 'fee', 'tuition', 'school', 'college', 'education'],
        'Health': ['doctor', 'medicine', 'hospital', 'pharmacy', 'health', 'clinic', 'medical'],
        'Bills': ['electricity', 'water', 'bill', 'internet', 'wifi', 'recharge', 'mobile', 'rent']
    };

    for (const [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            category = cat;
            break;
        }
    }

    // 4. Extract Date
    if (text.includes('yesterday')) {
        let d = new Date();
        d.setDate(d.getDate() - 1);
        date = d.toISOString().split('T')[0];
    }

    return { amount, type, category, date, note };
}

function handleAIParse() {
    if (!aiTextInput || !aiConfirmCard) return;

    const text = aiTextInput.value.trim();
    if (!text) {
        alert("Please enter a transaction description.");
        return;
    }

    pendingAITransaction = parseNaturalLanguage(text);

    if (pendingAITransaction.amount === 0 || isNaN(pendingAITransaction.amount)) {
        alert("Could not detect an amount. Please specify a number.");
        return;
    }

    // Populate confirmation card safely
    const elType = document.getElementById('ai-confirm-type');
    const elAmt = document.getElementById('ai-confirm-amount');
    const elCat = document.getElementById('ai-confirm-category');
    const elDate = document.getElementById('ai-confirm-date');
    const elNote = document.getElementById('ai-confirm-note');

    if (elType) elType.innerText = pendingAITransaction.type;
    if (elAmt) elAmt.innerText = pendingAITransaction.amount;
    if (elCat) elCat.innerText = pendingAITransaction.category;
    if (elDate) elDate.innerText = pendingAITransaction.date;
    if (elNote) elNote.innerText = pendingAITransaction.note;

    aiConfirmCard.classList.remove('hidden');
}

function handleAICancel() {
    if (aiConfirmCard) aiConfirmCard.classList.add('hidden');
    pendingAITransaction = null;
}

function handleAIConfirm() {
    if (pendingAITransaction && pendingAITransaction.amount > 0) {
        transactions.push({
            id: generateID(),
            type: pendingAITransaction.type,
            category: pendingAITransaction.category,
            amount: pendingAITransaction.amount,
            date: pendingAITransaction.date,
            notes: pendingAITransaction.note
        });

        updateLocalStorage();
        init();
        
        if (aiConfirmCard) aiConfirmCard.classList.add('hidden');
        if (aiTextInput) aiTextInput.value = '';
        pendingAITransaction = null;
    }
}

// AI Insights Engine
function generateInsights() {
    if (!aiInsightsContainer) return;

    if (transactions.length === 0) {
        aiInsightsContainer.innerHTML = '<p>Add transactions to generate spending insights.</p>';
        return;
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let monthExpense = 0;
    const categoryTotals = {};

    monthTransactions.forEach(t => {
        if (t.type === 'expense') {
            const amt = isNaN(t.amount) ? 0 : t.amount;
            monthExpense += amt;
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
        }
    });

    let topCategory = 'None';
    let topCategoryAmount = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > topCategoryAmount) {
            topCategory = cat;
            topCategoryAmount = amt;
        }
    }

    // Budget Prediction
    const dailyRate = currentDay > 0 ? (monthExpense / currentDay) : 0;
    const predictedSpend = dailyRate * daysInMonth;

    let insightsHTML = '<ul>';
    
    if (topCategoryAmount > 0) {
        insightsHTML += `<li>Highest spending category: <strong>${topCategory}</strong> (${formatCurrency(topCategoryAmount)}).</li>`;
    } else {
        insightsHTML += `<li>No expenses recorded this month yet.</li>`;
    }

    if (monthExpense > 0) {
        insightsHTML += `<li>Total expenses this month: <strong>${formatCurrency(monthExpense)}</strong>.</li>`;
    }

    if (monthlyBudget > 0) {
        const pct = Math.min(100, (monthExpense / monthlyBudget) * 100).toFixed(1);
        insightsHTML += `<li>You have used <strong>${pct}%</strong> of your monthly budget.</li>`;
        
        if (predictedSpend > monthlyBudget) {
            insightsHTML += `<li><strong style="color:var(--danger-color)">Smart Observation:</strong> At this rate, you will exceed your budget.</li>`;
        } else {
            insightsHTML += `<li><strong style="color:var(--success-color)">Smart Observation:</strong> You are on track to stay under budget.</li>`;
        }
    }

    insightsHTML += '</ul>';
    aiInsightsContainer.innerHTML = insightsHTML;
    generateAISuggestions();
}

// AI suggestion generator: produce 2-3 simple suggestions based on spending
function generateAISuggestions() {
    const suggestionsEl = document.getElementById('ai-suggestions');
    if (!suggestionsEl) return;

    // Compute totals by category and month
    const totals = {};
    let totalExpense = 0;
    let totalIncome = 0;
    transactions.forEach(t => {
        if (t.type === 'expense') {
            const amt = Number(t.amount) || 0;
            totals[t.category] = (totals[t.category] || 0) + amt;
            totalExpense += amt;
        } else {
            totalIncome += Number(t.amount) || 0;
        }
    });

    // Sort categories by expense
    const sortedCats = Object.entries(totals).sort((a,b) => b[1] - a[1]);

    const suggestions = [];

    // Suggest reducing highest category if it takes a big share
    if (sortedCats.length > 0) {
        const [topCat, topAmt] = sortedCats[0];
        const pct = totalExpense > 0 ? (topAmt / totalExpense) * 100 : 0;
        if (pct > 40) {
            suggestions.push({
                title: `Reduce spending on ${topCat}`,
                text: `You spent ${formatCurrency(topAmt)} on ${topCat}, which is ${pct.toFixed(0)}% of your expenses. Consider cutting discretionary expenses in this category.`
            });
        } else {
            suggestions.push({
                title: `Monitor ${topCat}`,
                text: `Your top category is ${topCat} with ${formatCurrency(topAmt)} spent. Keep an eye on recurring purchases.`
            });
        }
    }

    // Suggest setting or adjusting budget
    if (monthlyBudget > 0) {
        const usedPct = totalExpense > 0 ? (totalExpense / monthlyBudget) * 100 : 0;
        if (usedPct > 90) {
            suggestions.push({
                title: 'You are near your budget limit',
                text: `You've used ${usedPct.toFixed(0)}% of your monthly budget (${formatCurrency(totalExpense)} of ${formatCurrency(monthlyBudget)}). Consider trimming expenses.`
            });
        } else if (usedPct < 50 && totalIncome > 0) {
            suggestions.push({
                title: 'Opportunity to save more',
                text: `You're using ${usedPct.toFixed(0)}% of your budget. Consider increasing savings or investing a portion of surplus income (${formatCurrency(totalIncome - totalExpense)}).`
            });
        }
    } else {
        suggestions.push({
            title: 'Set a monthly budget',
            text: 'You have not set a monthly budget. Setting one helps track spending and stay on target.'
        });
    }

    // Ensure at most 3 suggestions
    const final = suggestions.slice(0,3);

    // Render suggestions
    suggestionsEl.innerHTML = '';
    final.forEach(s => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<strong>${s.title}</strong><div>${s.text}</div>`;
        suggestionsEl.appendChild(div);
    });
}

// Init app
function init() {
    if (list) list.innerHTML = '';
    
    // Sort safely
    transactions.sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db = b.date ? new Date(b.date) : new Date(0);
        return db - da;
    });

    transactions.forEach(addTransactionDOM);
    updateValues(transactions);
    updateChart();
    generateInsights();
    populateCategoryFilter();
    
    if(dateInput && (!editId || !editId.value)) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Call init and setup listeners once DOM is ready
// Call init and setup listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements safely
    balance = document.getElementById('balance');
    totalIncome = document.getElementById('total-income');
    totalExpense = document.getElementById('total-expense');
    list = document.getElementById('transaction-list');
    form = document.getElementById('transaction-form');
    formTitle = document.getElementById('form-title');
    editId = document.getElementById('edit-id');
    amountInput = document.getElementById('amount');
    dateInput = document.getElementById('date');
    notesInput = document.getElementById('notes');

    categoryBtns = document.querySelectorAll('.category-btn');
    toggleNotesBtn = document.getElementById('toggle-notes-btn');
    optionalFields = document.getElementById('optional-fields');
    addExpenseBtn = document.getElementById('add-expense-btn');
    addIncomeBtn = document.getElementById('add-income-btn');

    budgetInput = document.getElementById('budget-input');
    setBudgetBtn = document.getElementById('set-budget-btn');
    budgetText = document.getElementById('budget-text');
    budgetProgress = document.getElementById('budget-progress');
    budgetAlert = document.getElementById('budget-alert');

    searchInput = document.getElementById('search-input');
    filterType = document.getElementById('filter-type');
    filterCategory = document.getElementById('filter-category');
    filterDateFrom = document.getElementById('filter-date-from');
    filterDateTo = document.getElementById('filter-date-to');

    aiTextInput = document.getElementById('ai-text-input');
    aiParseBtn = document.getElementById('ai-parse-btn');
    aiConfirmCard = document.getElementById('ai-confirmation-card');
    aiConfirmBtn = document.getElementById('ai-confirm-btn');
    aiCancelBtn = document.getElementById('ai-cancel-btn');
    aiInsightsContainer = document.getElementById('ai-insights');

    initializeEventListeners();
    init();
});
