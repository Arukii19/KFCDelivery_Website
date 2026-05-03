document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('user')) {
        window.location.href = 'profile.html';
    }
});

function toggleAuth() {
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    
    if (loginBox.style.display === 'none') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
    } else {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
    }
}

// Login Logic
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
        showNotification('Login Successful! Welcome ' + data.user.Cust_FName);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => window.location.href = 'index.html', 1500);
    } else {
        showNotification('Error: ' + data.error, true);
    }
});

// Registration Logic
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fName = document.getElementById('reg-fname').value;
    const lName = document.getElementById('reg-lname').value;
    const phone = document.getElementById('reg-phone').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const address = document.getElementById('reg-address').value;

    const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fName, lName, phone, email, password, address })
    });

    const data = await res.json();
    if (res.ok) {
        showNotification('Registration Successful! Please login.');
        setTimeout(() => toggleAuth(), 1500);
    } else {
        showNotification('Error: ' + data.error, true);
    }
});
