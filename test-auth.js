const fs = require('fs');
const { JSDOM } = require('jsdom');

const loginHtml = fs.readFileSync('login.html', 'utf8');
const authJs = fs.readFileSync('auth.js', 'utf8');

const dom = new JSDOM(loginHtml, { runScripts: 'dangerously', url: 'http://localhost/login.html' });
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

window.alert = () => {};

const scriptEl = document.createElement('script');
scriptEl.textContent = authJs;
document.body.appendChild(scriptEl);

setTimeout(() => {
    try {
        console.log('Testing Auth UI...');
        // Test Sign Up
        window.showSignUp();
        document.getElementById('signup-name').value = 'Manya';
        document.getElementById('signup-email').value = 'manya@example.com';
        document.getElementById('signup-password').value = 'password123';
        document.getElementById('signup-form').dispatchEvent(new window.Event('submit'));
        
        let currentUser = JSON.parse(window.localStorage.getItem('expense_currentUser'));
        console.log('User signed up: ' + (currentUser.name === 'Manya' ? 'PASS' : 'FAIL'));
        console.log('Location after signup: ' + window.location.href);

        // Test Login
        window.localStorage.removeItem('expense_currentUser');
        window.showLogin();
        document.getElementById('login-email').value = 'manya@example.com';
        document.getElementById('login-password').value = 'password123';
        document.getElementById('login-form').dispatchEvent(new window.Event('submit'));

        currentUser = JSON.parse(window.localStorage.getItem('expense_currentUser'));
        console.log('User logged in: ' + (currentUser.email === 'manya@example.com' ? 'PASS' : 'FAIL'));

    } catch (e) {
        console.error(e);
    }
}, 500);
