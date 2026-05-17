document.addEventListener('DOMContentLoaded', () => {
    const sessionStr = localStorage.getItem('riderSession');
    if (!sessionStr) {
        window.location.href = 'rider-login.html';
        return;
    }

    const rider = JSON.parse(sessionStr);
    document.getElementById('rider-greeting').textContent = `${rider.Ridr_FName} ${rider.Ridr_LName}`;
    updateStatusUI(rider.Ridr_Status);

    fetchRiderDeliveries(rider.Ridr_ID);
    fetchRiderHistory(rider.Ridr_ID);

    // Auto-refresh every 5 seconds
    setInterval(() => {
        fetchRiderDeliveries(rider.Ridr_ID);
    }, 5000);
});

function updateStatusUI(status) {
    // Reset all buttons
    ['Available', 'Busy', 'Offline'].forEach(s => {
        const btn = document.getElementById(`status-${s}`);
        if(btn) {
            btn.style.borderColor = '#ccc';
            btn.style.backgroundColor = 'white';
        }
    });
    
    // Highlight active button
    const activeBtn = document.getElementById(`status-${status}`);
    if(activeBtn) {
        if(status === 'Available') { activeBtn.style.borderColor = '#10b981'; activeBtn.style.backgroundColor = '#ecfdf5'; }
        if(status === 'Busy') { activeBtn.style.borderColor = '#f59e0b'; activeBtn.style.backgroundColor = '#fffbeb'; }
        if(status === 'Offline') { activeBtn.style.borderColor = '#ef4444'; activeBtn.style.backgroundColor = '#fef2f2'; }
    }
}

async function setRiderStatus(status) {
    const sessionStr = localStorage.getItem('riderSession');
    if (!sessionStr) return;
    const rider = JSON.parse(sessionStr);

    try {
        const res = await fetch(`http://localhost:3000/api/admin/riders/${rider.Ridr_ID}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });

        if (res.ok) {
            rider.Ridr_Status = status;
            localStorage.setItem('riderSession', JSON.stringify(rider));
            updateStatusUI(status);
            showNotification('Status updated!');
        } else {
            showNotification('Error updating status', true);
        }
    } catch (err) {
        console.error(err);
        showNotification('Connection error', true);
    }
}



function logoutRider() {
    localStorage.removeItem('riderSession');
    window.location.href = 'rider-login.html';
}

function openRiderProfile() {
    const sessionStr = localStorage.getItem('riderSession');
    if (sessionStr) {
        const rider = JSON.parse(sessionStr);
        document.getElementById('profile-name').textContent = `${rider.Ridr_FName} ${rider.Ridr_LName}`;
        document.getElementById('profile-phone').textContent = rider.Ridr_Phone;
        document.getElementById('profile-vehicle').textContent = rider.Ridr_Vehicle;
        document.getElementById('rider-profile-modal').style.display = 'flex';
    }
}

function closeRiderProfile() {
    document.getElementById('rider-profile-modal').style.display = 'none';
}

function switchTab(tab) {
    if (tab === 'active') {
        document.getElementById('active-box').style.display = 'block';
        document.getElementById('history-box').style.display = 'none';
        document.getElementById('tab-active').classList.add('active');
        document.getElementById('tab-history').classList.remove('active');
    } else {
        document.getElementById('active-box').style.display = 'none';
        document.getElementById('history-box').style.display = 'block';
        document.getElementById('tab-active').classList.remove('active');
        document.getElementById('tab-history').classList.add('active');
    }
}

async function updateMyStatus() {
    const rider = JSON.parse(localStorage.getItem('riderSession'));
    const status = document.getElementById('my-status').value;
    
    try {
        const res = await fetch(`http://localhost:3000/api/admin/riders/${rider.Ridr_ID}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Status updated!');
            // Update local session to reflect new status
            rider.Ridr_Status = status;
            localStorage.setItem('riderSession', JSON.stringify(rider));
        } else {
            const data = await res.json();
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to update status.', true);
    }
}

async function fetchRiderDeliveries(riderId) {
    try {
        const res = await fetch(`http://localhost:3000/api/rider/${riderId}/deliveries`);
        const deliveries = await res.json();
        const container = document.getElementById('rider-active-container');
        container.innerHTML = '';

        if (deliveries.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666; padding: 2rem;">No active deliveries assigned to you.</p>';
            return;
        }

        deliveries.forEach(order => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.style.textAlign = 'left';

            div.innerHTML = `
                <div class="menu-item-body">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0; font-family: 'Poppins', sans-serif; font-size: 1.1rem; color: var(--dark);">Order #${order.Ordr_ID}</h3>
                        <span style="background: #ffc107; color: #000; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Out for Delivery</span>
                    </div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Phone:</strong> ${order.Cust_Phone}</div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Address:</strong> ${order.Cust_Addr}</div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Branch:</strong> ${order.Brch_Name}</div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Payment:</strong> ${order.Pay_Method || 'N/A'} &mdash; ${order.Pay_Status || 'N/A'}</div>
                    <div style="margin: 1rem 0 0.5rem; font-weight: 800; color: var(--red); font-size: 1.25rem; text-align: left;">Collect: ₱${parseFloat(order.Ordr_Total).toFixed(2)}</div>
                    <button onclick="markAsDelivered(${order.Ordr_ID})" class="primary-btn" style="padding: 0.6rem; background-color: #28a745; width: 100%; font-size: 1rem; margin-top: 1rem;">Mark as Delivered</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function markAsDelivered(orderId) {
    if(!confirm("Have you successfully delivered this order to the customer?")) return;
    
    try {
        const res = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/deliver`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Great job! Order delivered.');
            const riderId = JSON.parse(localStorage.getItem('riderSession')).Ridr_ID;
            fetchRiderDeliveries(riderId);
            fetchRiderHistory(riderId);
        } else {
            const data = await res.json();
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
    }
}

async function fetchRiderHistory(riderId) {
    try {
        const res = await fetch(`http://localhost:3000/api/rider/${riderId}/history`);
        const history = await res.json();
        const container = document.getElementById('rider-history-container');
        container.innerHTML = '';

        if (history.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666; padding: 2rem;">No delivery history found.</p>';
            return;
        }

        history.forEach(order => {
            const date = new Date(order.Ordr_Date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.style.textAlign = 'left';

            div.innerHTML = `
                <div class="menu-item-body">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0; font-family: 'Poppins', sans-serif; font-size: 1.1rem; color: var(--dark);">Order #${order.Ordr_ID}</h3>
                        <span style="background: #28a745; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Delivered</span>
                    </div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Address:</strong> ${order.Cust_Addr}</div>
                    <div style="margin: 0.3rem 0; font-size: 0.95rem; color: var(--gray-600); text-align: left;"><strong>Date:</strong> ${date}</div>
                    <div style="margin: 1rem 0 0.5rem; font-weight: 800; color: var(--red); font-size: 1.25rem; text-align: left;">₱${parseFloat(order.Ordr_Total).toFixed(2)}</div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}
