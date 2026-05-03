document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);
    document.getElementById('prof-fname').value = user.Cust_FName;
    document.getElementById('prof-lname').value = user.Cust_LName;
    document.getElementById('prof-phone').value = user.Cust_Phone;
    document.getElementById('prof-email').value = user.Cust_Email;
    document.getElementById('prof-address').value = user.Cust_Addr;

    fetchCustomerOrders(user.Cust_ID);

    // Handle tab switching if specified in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'orders') {
        switchTab('orders');
    }
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const fName = document.getElementById('prof-fname').value;
    const lName = document.getElementById('prof-lname').value;
    const phone = document.getElementById('prof-phone').value;
    const email = document.getElementById('prof-email').value;
    const address = document.getElementById('prof-address').value;

    try {
        const res = await fetch(`http://localhost:3000/api/customer/${user.Cust_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fName, lName, phone, email, address })
        });

        const data = await res.json();
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Profile updated successfully!');
            // Update local storage
            localStorage.setItem('user', JSON.stringify(data.user));
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
    }
});

function logoutUser() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

async function fetchCustomerOrders(customerId) {
    try {
        const res = await fetch(`http://localhost:3000/api/admin/customers/${customerId}/orders`);
        const orders = await res.json();
        const container = document.getElementById('customer-orders-container');
        if (!container) return;
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">You have no orders yet.</p>';
            return;
        }

        orders.forEach(order => {
            const date = new Date(order.Ordr_Date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const statusColor = order.Ordr_Status === 'Delivered' ? '#28a745' : (order.Ordr_Status === 'Out for Delivery' ? '#ffc107' : (order.Ordr_Status === 'Canceled' ? '#dc3545' : '#007bff'));
            
            // Only show Cancel button for Pending or Preparing
            const canCancel = ['Pending', 'Preparing'].includes(order.Ordr_Status);
            
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.style.textAlign = 'left';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0;">Order #${order.Ordr_ID}</h3>
                    <span style="background: ${statusColor}; color: white; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">${order.Ordr_Status}</span>
                </div>
                <p style="margin: 0.25rem 0; font-size: 0.9rem; color: #666;">📅 ${date}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;">🏪 Branch: ${order.Brch_Name || 'N/A'}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;">💳 ${order.Pay_Method || 'N/A'} — ${order.Pay_Status || 'N/A'}</p>
                <p style="margin: 0.5rem 0 0.5rem; font-weight: 800; color: var(--kfc-red); font-size: 1.1rem;">Total: ₱${parseFloat(order.Ordr_Total).toFixed(2)}</p>
                
                ${canCancel ? `<button onclick="cancelOrder(${order.Ordr_ID})" class="primary-btn" style="padding: 0.4rem; background-color: #dc3545; font-size: 0.85rem;">Cancel Order</button>` : ''}
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
        const res = await fetch(`http://localhost:3000/api/orders/${orderId}/cancel`, {
            method: 'PUT'
        });
        const data = await res.json();
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Order canceled successfully!');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                fetchCustomerOrders(JSON.parse(userStr).Cust_ID);
            }
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to cancel order.', true);
    }
}

function switchTab(tabId) {
    if (tabId === 'profile') {
        document.getElementById('profile-box').style.display = 'block';
        document.getElementById('my-orders-box').style.display = 'none';
        document.getElementById('tab-profile').classList.add('active');
        document.getElementById('tab-orders').classList.remove('active');
    } else {
        document.getElementById('profile-box').style.display = 'none';
        document.getElementById('my-orders-box').style.display = 'block';
        document.getElementById('tab-profile').classList.remove('active');
        document.getElementById('tab-orders').classList.add('active');
    }
}
