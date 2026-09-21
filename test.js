const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const window = dom.window;
const document = window.document;

// Mock localStorage
const localStorageMock = (function() {
    let store = {};
    return {
        getItem(key) { return store[key] || null; },
        setItem(key, value) { store[key] = value.toString(); },
        removeItem(key) { delete store[key]; },
        clear() { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock alert/confirm
window.alert = () => {};
window.confirm = () => true;

// Mock Chart.js
window.Chart = class {
    constructor() { this.destroy = () => {}; }
};

// Run script
const scriptEl = document.createElement('script');
scriptEl.textContent = js;
document.body.appendChild(scriptEl);

// Wait a bit for DOMContentLoaded
setTimeout(() => {
    try {
        console.log("=== TESTS STARTED ===");

        // 1. Set budget
        const budgetInput = document.getElementById('budget-input');
        const setBudgetBtn = document.getElementById('set-budget-btn');
        budgetInput.value = '5000';
        setBudgetBtn.click();
        console.log("1. Budget Set: " + (window.localStorage.getItem('monthlyBudget') === '5000' ? "PASS" : "FAIL"));

        // 2. Add expense 250 Food
        const amountInput = document.getElementById('amount');
        const form = document.getElementById('transaction-form');
        amountInput.value = '250';
        // By default food is selected in script
        form.dispatchEvent(new window.Event('submit'));
        console.log("2. Expense Added. Transactions count: " + JSON.parse(window.localStorage.getItem('transactions')).length);

        // 3. Add income 1000
        amountInput.value = '1000';
        const addIncomeBtn = document.getElementById('add-income-btn');
        addIncomeBtn.click();
        const transactions = JSON.parse(window.localStorage.getItem('transactions'));
        console.log("3. Income Added. Total transactions: " + transactions.length + ". Balance is " + document.getElementById('balance').textContent);

        // 4. Edit 250 transaction
        const firstTx = transactions[0];
        window.editTransaction(firstTx.id);
        amountInput.value = '300'; // change amount
        form.dispatchEvent(new window.Event('submit'));
        console.log("4. Edited transaction. New amount: " + JSON.parse(window.localStorage.getItem('transactions'))[0].amount);

        // 5. Delete transaction
        const newFirstTx = JSON.parse(window.localStorage.getItem('transactions'))[0];
        window.removeTransaction(newFirstTx.id);
        console.log("5. Deleted transaction. Total transactions: " + JSON.parse(window.localStorage.getItem('transactions')).length);

        // 6. AI Quick Entry
        const aiTextInput = document.getElementById('ai-text-input');
        const aiParseBtn = document.getElementById('ai-parse-btn');
        aiTextInput.value = "Spent ?300 on lunch today";
        aiParseBtn.click();
        console.log("6/7. Parse AI input. Type: " + document.getElementById('ai-confirm-type').innerText);

        // 8. Confirm AI Entry
        const aiConfirmBtn = document.getElementById('ai-confirm-btn');
        aiConfirmBtn.click();
        console.log("8. AI Confirmed. Total transactions: " + JSON.parse(window.localStorage.getItem('transactions')).length);

        console.log("=== ALL TESTS COMPLETED ===");
    } catch(err) {
        console.error("Test failed with error:", err);
    }
}, 500);
