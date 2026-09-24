// --- AUTHENTICATION CHECK ---
const currentUser = JSON.parse(localStorage.getItem('expense_currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
}

// Update header with user name and handle logout
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        const headerH1 = document.querySelector('header h1');
        if (headerH1) {
            headerH1.innerHTML = `<i class="fas fa-wallet"></i> ${currentUser.name}'s Expenses`;
        }
    }
    
    // Logout logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('expense_currentUser');
            window.location.href = 'login.html';
        });
    }
});

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

    if (toggleNotesBtn) {
        toggleNotesBtn.addEventListener('click', () => {
            optionalFields.classList.toggle('collapsed');
            if(optionalFields.classList.contains('collapsed')) {
                toggleNotesBtn.innerText = '+ Add Note & Date';
            } else {
                toggleNotesBtn.innerText = '- Hide Note & Date';
            }
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => addTransaction(e, 'expense'));
    }
    
    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', (e) => addTransaction(e, 'income'));
    }

    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', setBudget);
    }

    if (searchInput) searchInput.addEventListener('input', filterTransactions);
    if (filterType) filterType.addEventListener('change', filterTransactions);
    if (filterCategory) filterCategory.addEventListener('change', filterTransactions);
    if (filterDateFrom) filterDateFrom.addEventListener('change', filterTransactions);
    if (filterDateTo) filterDateTo.addEventListener('change', filterTransactions);

    if (aiParseBtn) aiParseBtn.addEventListener('click', handleAIParse);
    if (aiCancelBtn) aiCancelBtn.addEventListener('click', handleAICancel);
    if (aiConfirmBtn) aiConfirmBtn.addEventListener('click', handleAIConfirm);
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
    const safeAmount = isNaN(transaction.amount) ? 0 : transaction.amount;
    const safeDate = transaction.date || '';
    const safeNotes = transaction.notes || '';

    item.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-header">
                <span class="transaction-category">${safeCat}</span>
                <span class="transaction-amount ${transaction.type === 'income' ? 'money plus' : 'money minus'}">
                    ${sign}${formatCurrency(safeAmount)}
                </span>
            </div>
            <div class="transaction-details">
                <span class="transaction-date">${safeDate}</span>
                <span class="transaction-notes">${safeNotes}</span>
            </div>
        </div>
        <div class="transaction-actions">
            <button class="action-btn edit-btn" onclick="editTransaction('${transaction.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" onclick="removeTransaction('${transaction.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    list.appendChild(item);
}

// Edit transaction (globally accessible)
window.editTransaction = function(id) {
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
window.removeTransaction = function(id) {
    if(confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        init();
    }
}

// Update balance, income and expense
function updateValues(filteredTransactions = transactions) {
    const amounts = filteredTransactions.map(transaction => 
        transaction.type === 'income' ? transaction.amount : -transaction.amount
    );

    const total = amounts.reduce((acc, item) => (acc += item), 0);

    const income = filteredTransactions
        .filter(item => item.type === 'income')
        .reduce((acc, item) => (acc += item.amount), 0);

    const expense = filteredTransactions
        .filter(item => item.type === 'expense')
        .reduce((acc, item) => (acc += item.amount), 0);

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
    if (!chartCanvas) return;

    const incomeCategories = {};
    const expenseCategories = {};
    
    let totalInc = 0;
    let totalExp = 0;

    transactions.forEach(t => {
        if (t.type === 'income') {
            incomeCategories[t.category] = (incomeCategories[t.category] || 0) + t.amount;
            totalInc += t.amount;
        } else {
            expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
            totalExp += t.amount;
        }
    });

    try {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded. Skipping chart generation.');
            chartCanvas.parentNode.innerHTML = `<p style="text-align:center; padding: 20px;">Chart.js is required to display the chart.</p>`;
            return;
        }

        const ctx = chartCanvas.getContext('2d');
        
        if (expenseChart) {
            expenseChart.destroy();
        }

        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    data: [totalInc, totalExp],
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error updating chart:', err);
    }
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
    
    if(dateInput && (!editId || !editId.value)) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Call init and setup listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Cache elements
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
