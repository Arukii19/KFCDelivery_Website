document.getElementById('staffLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        const response = await fetch('/api/staff/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('staffId', data.employee.Emp_ID);
            localStorage.setItem('staffRole', data.employee.Role);
            localStorage.setItem('staffBranch', data.employee.Brch_ID);
            localStorage.setItem('staffName', data.employee.Emp_FName);
            localStorage.setItem('staffBranchName', data.employee.Brch_Name || 'Global Head Office');
            
            if (data.employee.Role === 'SuperAdmin' || data.employee.Role === 'BranchAdmin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'staff-dashboard.html';
            }
        } else {
            errorMsg.textContent = data.error || 'Login failed';
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        errorMsg.textContent = 'Server error. Please try again later.';
        errorMsg.style.display = 'block';
    }
});
