// Admin Login Logic (Hardcoded for simplicity since no Admin table exists in DB)
const ADMIN_EMAIL = 'admin@kfc.com';
const ADMIN_PASS = 'admin123';

document.getElementById('admin-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        // Hide login, show CRUD panel
        document.getElementById('admin-login-box').style.display = 'none';
        document.getElementById('admin-crud-panel').style.display = 'block';
        
        // Load the menu items
        fetchAdminMenu();
        fetchAdminOrders();
        fetchActiveDeliveries();
        fetchAdminRiders();
        fetchAdminCustomers();
        fetchAdminBranches();
        fetchDeliveredHistory();
    } else {
        showNotification('Invalid Admin Credentials!', true);
    }
});


// CRUD Feature Logic
async function fetchAdminMenu() {
    const res = await fetch('http://localhost:3000/api/menu');
    const data = await res.json();
    const container = document.getElementById('admin-menu-container');
    container.innerHTML = '';

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `
            <h3>${item.Menu_Name}</h3>
            <p>${item.Menu_Category}</p>
            <p class="price">₱${item.Menu_Price}</p>
            <button onclick="deleteMenu(${item.Menu_ID})" style="background-color: #333;">Delete Item</button>
        `;
        container.appendChild(div);
    });
}

document.getElementById('add-menu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('menu-name').value;
    const category = document.getElementById('menu-category').value;
    const price = document.getElementById('menu-price').value;
    const avail = document.getElementById('menu-avail').value === '1';

    const res = await fetch('http://localhost:3000/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price, avail })
    });

    if (res.ok) {
        showNotification('Menu item added successfully!');
        e.target.reset(); // clear form
        fetchAdminMenu(); // refresh list
    } else {
        showNotification('Error adding menu item', true);
    }
});

async function deleteMenu(id) {
    if(!confirm('Are you sure you want to delete this menu item?')) return;
    
    const res = await fetch(`http://localhost:3000/api/menu/${id}`, {
        method: 'DELETE'
    });

    if (res.ok) {
        showNotification('Item deleted!');
        fetchAdminMenu(); // refresh list
    } else {
        showNotification('Error deleting item', true);
    }
}

// Order Management Logic
let availableRiders = [];

async function fetchAdminOrders() {
    const ridersRes = await fetch('http://localhost:3000/api/admin/riders');
    availableRiders = await ridersRes.json();

    const res = await fetch('http://localhost:3000/api/admin/orders');
    const orders = await res.json();
    const container = document.getElementById('admin-orders-container');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No pending orders.</p>';
        return;
    }

    let riderOptions = availableRiders.map(r => `<option value="${r.Ridr_ID}">${r.Ridr_FName} (${r.Ridr_Vehicle})</option>`).join('');

    orders.forEach(order => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `
            <h3>Order #${order.Ordr_ID}</h3>
            <p style="margin: 0.25rem 0;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</p>
            <p style="margin: 0.25rem 0;"><strong>Address:</strong> ${order.Cust_Addr}</p>
            <p style="margin: 0.25rem 0;"><strong>Branch:</strong> ${order.Brch_Name}</p>
            <p style="margin: 0.25rem 0;"><strong>Status:</strong> ${order.Ordr_Status}</p>
            <p class="price" style="margin: 0.5rem 0; font-size: 1.25rem;">Total: ₱${order.Ordr_Total}</p>
            <div style="margin-top: 1rem; text-align: left;">
                ${order.Ordr_Status === 'Pending' ? `
                    <button onclick="markAsPreparing(${order.Ordr_ID})" class="primary-btn" style="padding: 0.5rem; background-color: #ffc107; color: #000;">Mark as Preparing</button>
                ` : `
                    <label style="font-weight: bold; font-size: 0.9rem;">Assign Rider:</label>
                    <select id="rider-select-${order.Ordr_ID}" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">-- Select Rider --</option>
                        ${riderOptions}
                    </select>
                    <button onclick="assignRider(${order.Ordr_ID})" class="primary-btn" style="padding: 0.5rem;">Dispatch Rider</button>
                `}
            </div>
        `;
        container.appendChild(div);
    });
}

async function markAsPreparing(orderId) {
    try {
        const res = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/prepare`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Order is now Preparing!');
            fetchAdminOrders(); // refresh
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
    }
}

async function assignRider(orderId) {
    const select = document.getElementById(`rider-select-${orderId}`);
    const riderId = select.value;

    if (!riderId) {
        if(typeof showNotification === 'function') showNotification('Please select a rider first!', true);
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ riderId })
        });
        const data = await res.json();

        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Rider assigned! Order is Out for Delivery.');
            fetchAdminOrders(); // refresh orders list to remove it
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
    }
}

// Rider Management Logic
async function fetchAdminRiders() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/all-riders');
        const riders = await res.json();
        const container = document.getElementById('admin-riders-container');
        container.innerHTML = '';

        if (riders.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No delivery riders found.</p>';
            return;
        }

        riders.forEach(rider => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <h3>${rider.Ridr_FName} ${rider.Ridr_LName}</h3>
                <p><strong>Phone:</strong> ${rider.Ridr_Phone}</p>
                <p><strong>Vehicle:</strong> ${rider.Ridr_Vehicle}</p>
                <div style="margin-top: 1rem;">
                    <label style="font-weight: bold; font-size: 0.9rem;">Status:</label>
                    <select id="rider-status-${rider.Ridr_ID}" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="Available" ${rider.Ridr_Status === 'Available' ? 'selected' : ''}>Available</option>
                        <option value="Busy" ${rider.Ridr_Status === 'Busy' ? 'selected' : ''}>Busy</option>
                        <option value="Offline" ${rider.Ridr_Status === 'Offline' ? 'selected' : ''}>Offline</option>
                    </select>
                    <button onclick="updateRiderStatus(${rider.Ridr_ID})" class="primary-btn" style="padding: 0.5rem;">Update Status</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function updateRiderStatus(riderId) {
    const status = document.getElementById(`rider-status-${riderId}`).value;
    try {
        const res = await fetch(`http://localhost:3000/api/admin/riders/${riderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if(res.ok) {
            if(typeof showNotification === 'function') showNotification('Rider status updated!');
            fetchAdminOrders(); // Refresh orders because dropdown might need to update
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
    }
}

// Active Deliveries Logic
async function fetchActiveDeliveries() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/active-deliveries');
        const deliveries = await res.json();
        const container = document.getElementById('admin-active-container');
        container.innerHTML = '';

        if (deliveries.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No active deliveries.</p>';
            return;
        }

        deliveries.forEach(order => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <h3>Order #${order.Ordr_ID}</h3>
                <p style="margin: 0.25rem 0;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</p>
                <p style="margin: 0.25rem 0;"><strong>Address:</strong> ${order.Cust_Addr}</p>
                <p style="margin: 0.25rem 0;"><strong>Branch:</strong> ${order.Brch_Name}</p>
                <p style="margin: 0.25rem 0;"><strong>Rider:</strong> ${order.Ridr_FName} ${order.Ridr_LName}</p>
                <p class="price" style="margin: 0.5rem 0; font-size: 1.25rem;">Total: \u20b1${order.Ordr_Total}</p>
                <button onclick="markAsDelivered(${order.Ordr_ID})" class="primary-btn" style="padding: 0.5rem; background-color: #28a745;">Mark as Delivered</button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function markAsDelivered(orderId) {
    try {
        const res = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/deliver`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('Order marked as Delivered!');
            fetchActiveDeliveries();
            fetchAdminOrders();
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
    }
}

// Customer Management Logic
async function fetchAdminCustomers() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/customers');
        const customers = await res.json();
        const container = document.getElementById('admin-customers-container');
        container.innerHTML = '';

        // Also populate the history filter dropdown
        const filterSelect = document.getElementById('history-customer-filter');
        filterSelect.innerHTML = '<option value="">-- All Customers --</option>';
        customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.Cust_ID;
            opt.textContent = `${c.Cust_FName} ${c.Cust_LName}`;
            filterSelect.appendChild(opt);
        });

        if (customers.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No registered users.</p>';
            return;
        }

        customers.forEach(cust => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <h3>${cust.Cust_FName} ${cust.Cust_LName}</h3>
                <p style="margin: 0.25rem 0;"><strong>Email:</strong> ${cust.Cust_Email}</p>
                <p style="margin: 0.25rem 0;"><strong>Phone:</strong> ${cust.Cust_Phone}</p>
                <p style="margin: 0.25rem 0;"><strong>Address:</strong> ${cust.Cust_Addr}</p>
                <button onclick="viewCustomerOrders(${cust.Cust_ID}, '${cust.Cust_FName} ${cust.Cust_LName}')" class="primary-btn" style="padding: 0.5rem; background-color: #007bff; margin-top: 0.5rem;">📋 View Orders</button>
                <button onclick="deleteCustomer(${cust.Cust_ID})" class="primary-btn" style="padding: 0.5rem; background-color: #333; margin-top: 0.5rem;">Remove User</button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function deleteCustomer(custId) {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
        const res = await fetch(`http://localhost:3000/api/admin/customers/${custId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
            if(typeof showNotification === 'function') showNotification('User removed successfully!');
            fetchAdminCustomers();
        } else {
            if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
        }
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
    }
}

// --- View a specific customer's order history in a modal ---
async function viewCustomerOrders(custId, custName) {
    try {
        const res = await fetch(`http://localhost:3000/api/admin/customers/${custId}/orders`);
        const orders = await res.json();

        const modal = document.getElementById('order-details-modal');
        const title = document.getElementById('order-modal-title');
        const body = document.getElementById('order-modal-body');

        title.textContent = `Orders for ${custName}`;

        if (orders.length === 0) {
            body.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem 0;">No orders found for this customer.</p>';
        } else {
            let html = '<div style="max-height: 400px; overflow-y: auto;">';
            orders.forEach(order => {
                const date = new Date(order.Ordr_Date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const statusColor = order.Ordr_Status === 'Delivered' ? '#28a745' : order.Ordr_Status === 'Out for Delivery' ? '#ffc107' : '#dc3545';
                const rider = order.Ridr_FName ? `${order.Ridr_FName} ${order.Ridr_LName}` : 'Not assigned';
                html += `
                    <div style="border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; background: #fafafa;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong style="font-size: 1.05rem;">Order #${order.Ordr_ID}</strong>
                            <span style="background: ${statusColor}; color: white; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">${order.Ordr_Status}</span>
                        </div>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem; color: #666;">📅 ${date}</p>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem;">🏪 Branch: ${order.Brch_Name}</p>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem;">💳 ${order.Pay_Method || 'N/A'} — ${order.Pay_Status || 'N/A'}</p>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem;">🏍️ Rider: ${rider}</p>
                        <p style="margin: 0.5rem 0 0.25rem; font-weight: 800; color: var(--kfc-red); font-size: 1.1rem;">Total: ₱${parseFloat(order.Ordr_Total).toFixed(2)}</p>
                        <button onclick="viewOrderItems(${order.Ordr_ID})" style="background: none; border: 1px solid var(--kfc-red); color: var(--kfc-red); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem; transition: all 0.2s;">View Items</button>
                        <div id="order-items-${order.Ordr_ID}" style="display: none; margin-top: 0.5rem;"></div>
                    </div>
                `;
            });
            html += '</div>';
            body.innerHTML = html;
        }

        modal.style.display = 'flex';
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('Failed to load orders.', true);
    }
}

// --- View items in a specific order (expandable inside modal) ---
async function viewOrderItems(orderId) {
    const container = document.getElementById(`order-items-${orderId}`);
    
    // Toggle: if already visible, hide it
    if (container.style.display === 'block') {
        container.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/admin/orders/${orderId}/items`);
        const items = await res.json();

        if (items.length === 0) {
            container.innerHTML = '<p style="color: #888; font-size: 0.85rem;">No items found.</p>';
        } else {
            let html = '<table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">';
            html += '<tr style="border-bottom: 1px solid #ddd;"><th style="text-align: left; padding: 4px;">Item</th><th style="text-align: center; padding: 4px;">Qty</th><th style="text-align: right; padding: 4px;">Subtotal</th></tr>';
            items.forEach(item => {
                html += `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 4px;">${item.Menu_Name}</td><td style="text-align: center; padding: 4px;">${item.Oite_Qty}</td><td style="text-align: right; padding: 4px;">₱${parseFloat(item.Oite_Subtotal).toFixed(2)}</td></tr>`;
            });
            html += '</table>';
            container.innerHTML = html;
        }

        container.style.display = 'block';
    } catch (err) {
        console.error(err);
    }
}

function closeOrderModal() {
    document.getElementById('order-details-modal').style.display = 'none';
}

// Branch Management Logic
async function fetchAdminBranches() {
    try {
        const res = await fetch('http://localhost:3000/api/branches');
        const branches = await res.json();
        const container = document.getElementById('admin-branches-container');
        container.innerHTML = '';

        if (branches.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No branches found.</p>';
            return;
        }

        branches.forEach(branch => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <h3>${branch.Brch_Name}</h3>
                <p><strong>Location:</strong> ${branch.Brch_Loc}</p>
                <p><strong>Contact:</strong> ${branch.Brch_Contact}</p>
                <button onclick="deleteBranch(${branch.Brch_ID})" class="primary-btn" style="padding: 0.5rem; background-color: #333; margin-top: 1rem;">Delete Branch</button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('add-branch-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('branch-name').value;
    const location = document.getElementById('branch-location').value;
    const contact = document.getElementById('branch-contact').value;

    try {
        const res = await fetch('http://localhost:3000/api/admin/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, location, contact })
        });

        if (res.ok) {
            showNotification('Branch added successfully!');
            e.target.reset();
            fetchAdminBranches();
        } else {
            showNotification('Error adding branch', true);
        }
    } catch (err) {
        console.error(err);
    }
});

async function deleteBranch(id) {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    try {
        const res = await fetch(`http://localhost:3000/api/admin/branches/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showNotification('Branch deleted!');
            fetchAdminBranches();
        } else {
            showNotification('Error deleting branch', true);
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Delivered Orders History Section ---
async function fetchDeliveredHistory(custFilterId) {
    try {
        let url = 'http://localhost:3000/api/admin/delivered-history';
        if (custFilterId) {
            url = `http://localhost:3000/api/admin/customers/${custFilterId}/orders`;
        }
        const res = await fetch(url);
        const orders = await res.json();
        const container = document.getElementById('admin-history-container');
        container.innerHTML = '';

        // Filter only delivered orders if using customer endpoint
        const delivered = custFilterId 
            ? orders.filter(o => o.Ordr_Status === 'Delivered')
            : orders;

        if (delivered.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No delivered orders found.</p>';
            return;
        }

        delivered.forEach(order => {
            const date = new Date(order.Ordr_Date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const rider = order.Ridr_FName ? `${order.Ridr_FName} ${order.Ridr_LName}` : 'N/A';
            const custName = order.Cust_FName ? `${order.Cust_FName} ${order.Cust_LName}` : '';

            const div = document.createElement('div');
            div.className = 'menu-item';
            div.style.textAlign = 'left';
            div.innerHTML = `
                <h3 style="display: flex; justify-content: space-between; align-items: center;">
                    Order #${order.Ordr_ID}
                    <span style="background: #28a745; color: white; padding: 2px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600;">Delivered</span>
                </h3>
                ${custName ? `<p style="margin: 0.25rem 0;"><strong>Customer:</strong> ${custName}</p>` : ''}
                <p style="margin: 0.25rem 0; color: #666; font-size: 0.9rem;">📅 ${date}</p>
                <p style="margin: 0.25rem 0;">🏪 Branch: ${order.Brch_Name}</p>
                <p style="margin: 0.25rem 0;">💳 ${order.Pay_Method || 'N/A'} — ${order.Pay_Status || 'N/A'}</p>
                <p style="margin: 0.25rem 0;">🏍️ Rider: ${rider}</p>
                <p class="price" style="margin: 0.5rem 0; font-size: 1.25rem;">₱${parseFloat(order.Ordr_Total).toFixed(2)}</p>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

// Customer filter event
document.getElementById('history-customer-filter')?.addEventListener('change', (e) => {
    fetchDeliveredHistory(e.target.value);
});
