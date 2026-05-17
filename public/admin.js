document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('staffRole');
    if (role !== 'SuperAdmin' && role !== 'BranchAdmin') {
        window.location.href = 'staff-login.html';
        return;
    }
    
    // Hide specific sections if only a BranchAdmin
    if (role === 'BranchAdmin') {
        document.querySelector('.add-menu-section').style.display = 'none';
        document.querySelector('.rider-section').style.display = 'none';
        document.querySelector('.branch-section').style.display = 'none';
        document.querySelector('.customer-section').style.display = 'none';
        const menuTitle = document.querySelector('.menu-section h2');
        if (menuTitle) menuTitle.textContent = 'Branch Inventory Management';
    }

    const branchName = localStorage.getItem('staffBranchName') || 'Global Head Office';
    const header = document.getElementById('branch-display-header');
    if (header) header.textContent = `Managing: ${branchName}`;

    showAdminDashboard();
});

function logoutAdmin(e) {
    if(e) e.preventDefault();
    localStorage.clear();
    window.location.href = 'staff-login.html';
}

function showAdminDashboard() {
    fetchAdminMenu();
    fetchAdminOrders();
    fetchActiveDeliveries();
    fetchAdminRiders();
    fetchAdminCustomers();
    fetchAdminBranches();
    fetchDeliveredHistory();
}


// CRUD Feature Logic
async function fetchAdminMenu() {
    const role = localStorage.getItem('staffRole');
    const branchId = localStorage.getItem('staffBranch');
    const url = role === 'BranchAdmin' ? `http://localhost:3000/api/menu?branchId=${branchId}` : 'http://localhost:3000/api/menu';
    
    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById('admin-menu-container');
    container.innerHTML = '';

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        
        let actionHtml = '';
        if (role === 'SuperAdmin') {
            actionHtml = `
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="primary-btn" onclick="openEditPriceModal(${item.Menu_ID}, ${item.Menu_Price})" style="flex: 1; padding: 0.6rem 0.5rem; font-size: 0.85rem;">Edit Price</button>
                    <button class="primary-btn" onclick="deleteMenu(${item.Menu_ID})" style="flex: 1; background-color: var(--gray-800); padding: 0.6rem 0.5rem; font-size: 0.85rem;">Delete</button>
                </div>
            `;
        } else {
            const isAvail = item.Menu_Avail === 1;
            const btnColor = isAvail ? 'var(--gray-800)' : '#10b981'; // dark gray for 'mark out of stock', green for 'mark in stock'
            actionHtml = `<button class="primary-btn" onclick="toggleBranchMenu(${branchId}, ${item.Menu_ID}, ${!isAvail})" style="background-color: ${btnColor}; margin-top: 0.5rem; padding: 0.6rem 1rem; width: 100%; font-size: 0.9rem;">${isAvail ? 'Mark Out of Stock' : 'Mark In Stock'}</button>`;
        }

        div.innerHTML = `
            <div class="menu-item-body">
                <span class="menu-item-badge">${item.Menu_Category}</span>
                <h3>${item.Menu_Name}</h3>
                <div class="menu-item-footer">
                    <span class="price">₱${parseFloat(item.Menu_Price).toFixed(2)}</span>
                </div>
                <div style="margin-top: 1rem;">
                    ${actionHtml}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function toggleBranchMenu(branchId, menuId, newStatus) {
    const res = await fetch(`http://localhost:3000/api/admin/branch-menu/${branchId}/${menuId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus })
    });

    if (res.ok) {
        showNotification('Branch inventory updated!');
        fetchAdminMenu();
    } else {
        showNotification('Error updating inventory', true);
    }
}

document.getElementById('add-menu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('menu-name').value;
    const category = document.getElementById('menu-category').value;
    const price = document.getElementById('menu-price').value;
    const avail = document.getElementById('menu-avail').value === '1';
    const imageFile = document.getElementById('menu-image').files[0];

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('avail', avail);
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const res = await fetch('http://localhost:3000/api/menu', {
        method: 'POST',
        body: formData // No Content-Type header needed for FormData
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

function openEditPriceModal(id, currentPrice) {
    document.getElementById('edit-price-id').value = id;
    document.getElementById('edit-price-input').value = currentPrice;
    document.getElementById('edit-price-modal').style.display = 'flex';
}

function closeEditPriceModal() {
    document.getElementById('edit-price-modal').style.display = 'none';
}

async function saveNewPrice() {
    const id = document.getElementById('edit-price-id').value;
    const newPrice = document.getElementById('edit-price-input').value;

    if (!newPrice || newPrice <= 0) {
        showNotification('Please enter a valid price.', true);
        return;
    }

    const res = await fetch(`http://localhost:3000/api/menu/${id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) })
    });

    if (res.ok) {
        showNotification('Price updated successfully!');
        closeEditPriceModal();
        fetchAdminMenu();
    } else {
        showNotification('Error updating price.', true);
    }
}

// Order Management Logic
let availableRiders = [];

async function fetchAdminOrders() {
    const ridersRes = await fetch('http://localhost:3000/api/admin/riders');
    availableRiders = await ridersRes.json();

    const branchId = localStorage.getItem('staffBranch');
    const url = (localStorage.getItem('staffRole') === 'BranchAdmin') 
                ? `http://localhost:3000/api/admin/orders?branchId=${branchId}` 
                : 'http://localhost:3000/api/admin/orders';
    const res = await fetch(url);
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
        div.style.textAlign = 'left';
        const date = new Date(order.Ordr_Date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const statusColor = order.Ordr_Status === 'Pending' ? '#dc3545' : '#007bff';

        const role = localStorage.getItem('staffRole');
        let actionControls = '';
        
        if (role === 'SuperAdmin') {
            actionControls = `<div style="margin-top: auto; padding-top: 1rem;"><p style="font-weight: 600; color: var(--gray-500); font-size: 0.9rem; text-align: center; background: var(--gray-50); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px dashed var(--gray-200); margin: 0;">Branch staff will process this order.</p></div>`;
        } else {
            actionControls = `
                <div style="margin-top: auto; text-align: left; padding-top: 1rem;">
                    ${order.Ordr_Status === 'Pending' ? `
                        <button onclick="markAsPreparing(${order.Ordr_ID})" class="primary-btn" style="background-color: #f59e0b; color: #fff;">Accept (To Kitchen)</button>
                    ` : order.Ordr_Status === 'Preparing' ? `
                        <p style="font-weight: 600; color: #f59e0b; font-size: 0.95rem; text-align: center; background: #fef3c7; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px dashed #fcd34d; margin: 0;">Cooking in Kitchen...</p>
                    ` : `
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--gray-600); display: block; margin-bottom: 0.4rem;">Assign Rider:</label>
                        <select id="rider-select-${order.Ordr_ID}" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1.5px solid var(--gray-200); border-radius: var(--radius-sm); font-family: inherit;">
                            <option value="">-- Select Rider --</option>
                            ${riderOptions}
                        </select>
                        <button onclick="assignRider(${order.Ordr_ID})" class="primary-btn">Dispatch Rider</button>
                    `}
                </div>
            `;
        }

        div.innerHTML = `
            <div class="menu-item-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <h3 style="margin: 0; font-size: 1.1rem;">Order #${order.Ordr_ID}</h3>
                    <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 700;">${order.Ordr_Status}</span>
                </div>
                <p style="margin: 0.25rem 0; font-size: 0.85rem; color: var(--gray-600);">Date: ${date}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Address:</strong> ${order.Cust_Addr}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Branch:</strong> ${order.Brch_Name}</p>
                <p class="price" style="margin: 1rem 0 0.5rem; font-size: 1.25rem;">Total: ₱${parseFloat(order.Ordr_Total).toFixed(2)}</p>
                ${actionControls}
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
                <div class="menu-item-body" style="justify-content: space-between; height: 100%;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">${rider.Ridr_FName} ${rider.Ridr_LName}</h3>
                        <p style="margin: 0.2rem 0; color: var(--gray-600); font-size: 0.9rem;"><strong>Phone:</strong> ${rider.Ridr_Phone}</p>
                        <p style="margin: 0.2rem 0; color: var(--gray-600); font-size: 0.9rem;"><strong>Vehicle:</strong> ${rider.Ridr_Vehicle}</p>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <label style="font-weight: bold; font-size: 0.85rem; color: var(--dark);">Status:</label>
                        <select id="rider-status-${rider.Ridr_ID}" style="width: 100%; padding: 0.6rem; margin: 0.4rem 0 1rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); font-family: 'Inter', sans-serif;">
                            <option value="Available" ${rider.Ridr_Status === 'Available' ? 'selected' : ''}>Available</option>
                            <option value="Busy" ${rider.Ridr_Status === 'Busy' ? 'selected' : ''}>Busy</option>
                            <option value="Offline" ${rider.Ridr_Status === 'Offline' ? 'selected' : ''}>Offline</option>
                        </select>
                        <button onclick="updateRiderStatus(${rider.Ridr_ID})" class="primary-btn" style="padding: 0.6rem;">Update Status</button>
                    </div>
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
        const branchId = localStorage.getItem('staffBranch');
        const url = (localStorage.getItem('staffRole') === 'BranchAdmin') 
                    ? `http://localhost:3000/api/admin/active-deliveries?branchId=${branchId}` 
                    : 'http://localhost:3000/api/admin/active-deliveries';
        const res = await fetch(url);
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
            div.style.textAlign = 'left';

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0;">Order #${order.Ordr_ID}</h3>
                    <span style="background: #ffc107; color: #000; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">Out for Delivery</span>
                </div>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Address:</strong> ${order.Cust_Addr}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Branch:</strong> ${order.Brch_Name}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Rider:</strong> ${order.Ridr_FName} ${order.Ridr_LName}</p>
                <p class="price" style="margin: 0.5rem 0; font-size: 1.25rem;">Total: ₱${parseFloat(order.Ordr_Total).toFixed(2)}</p>
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
            <div class="menu-item-body">
                <h3 style="margin-bottom: 0.5rem;">${cust.Cust_FName} ${cust.Cust_LName}</h3>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Email:</strong> ${cust.Cust_Email}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Phone:</strong> ${cust.Cust_Phone}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Address:</strong> ${cust.Cust_Addr}</p>
                <button onclick="viewCustomerOrders(${cust.Cust_ID}, '${cust.Cust_FName} ${cust.Cust_LName}')" class="primary-btn" style="padding: 0.5rem; background-color: #007bff; margin-top: 0.5rem;">📋 View Orders</button>
                <button onclick="deleteCustomer(${cust.Cust_ID})" class="primary-btn" style="padding: 0.5rem; background-color: #333; margin-top: 0.5rem;">Remove User</button>
            </div>
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
                        <p style="margin: 0.2rem 0; font-size: 0.9rem; color: #666;">Date: ${date}</p>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem;">Branch: ${order.Brch_Name}</p>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem;">Payment: ${order.Pay_Method || 'N/A'} — ${order.Pay_Status || 'N/A'}</p>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem;">Rider: ${rider}</p>
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
            <div class="menu-item-body">
                <h3 style="margin-bottom: 0.5rem;">${branch.Brch_Name}</h3>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Location:</strong> ${branch.Brch_Loc}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Contact:</strong> ${branch.Brch_Contact}</p>
            </div>
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
            
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.style.textAlign = 'left';
            div.innerHTML = `
            <div class="menu-item-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <h3 style="margin: 0; font-size: 1.1rem;">Order #${order.Ordr_ID}</h3>
                    <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;">Delivered</span>
                </div>
                <p style="margin: 0.25rem 0; font-size: 0.85rem; color: #666;">Date: ${date}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Customer:</strong> ${order.Cust_FName} ${order.Cust_LName}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Branch:</strong> ${order.Brch_Name}</p>
                <p class="price" style="margin: 1rem 0 0.5rem; font-size: 1.25rem;">Total: ₱${parseFloat(order.Ordr_Total).toFixed(2)}</p>
                <div style="margin-top: auto; padding-top: 1rem;">
                    <button onclick="viewOrderItems(${order.Ordr_ID})" class="primary-btn" style="background-color: #333;">View Items</button>
                </div>
            </div>
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
