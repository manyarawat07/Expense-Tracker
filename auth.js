// auth.js

function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
}

function showSignUp() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('signup-section').style.display = 'block';
    hideErrors();
}

function showLogin() {
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    hideErrors();
}

function hideErrors() {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('signup-error').style.display = 'none';
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// User state management
let users = JSON.parse(localStorage.getItem('expense_users')) || [];

document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (password.length < 6) {
        showError('signup-error', 'Password must be at least 6 characters long.');
        return;
    }

    const userExists = users.some(u => u.email === email);
    if (userExists) {
        showError('signup-error', 'An account with this email already exists.');
        return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem('expense_users', JSON.stringify(users));
    
    // Automatically login
    localStorage.setItem('expense_currentUser', JSON.stringify(newUser));
    window.location.href = 'index.html';
});

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        localStorage.setItem('expense_currentUser', JSON.stringify(user));
        window.location.href = 'index.html';
    } else {
        showError('login-error', 'Invalid email or password.');
    }
});

// Redirect to dashboard if already logged in
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('expense_currentUser')) {
        window.location.href = 'index.html';
    }
});
