const branchId = localStorage.getItem('staffBranch');
const staffName = localStorage.getItem('staffName');

if (!branchId || branchId === 'null') {
    window.location.href = 'staff-login.html';
}

const branchName = localStorage.getItem('staffBranchName') || 'Unknown Branch';

document.getElementById('staffNameDisplay').textContent = `Hi, ${staffName}`;
const branchDisplay = document.getElementById('branchNameDisplay');
if (branchDisplay) branchDisplay.textContent = `Managing: ${branchName}`;

async function fetchOrders() {
    try {
        const response = await fetch(`/api/staff/orders/${branchId}`);
        const orders = await response.json();
        renderOrders(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

function renderOrders(orders) {
    const queue = document.getElementById('ordersQueue');
    queue.innerHTML = '';

    if (orders.length === 0) {
        queue.innerHTML = '<div class="empty-state">No active orders right now. Relax!</div>';
        return;
    }

    orders.forEach(order => {
        let statusClass = order.Ordr_Status;
        if (statusClass === 'Ready for Pickup') statusClass = 'Ready';

        const card = document.createElement('div');
        card.className = `order-card status-${statusClass}`;

        let itemsHtml = order.items.map(i => `<li><div><span class="qty">${i.Oite_Qty}x</span> ${i.Menu_Name}</div></li>`).join('');

        let actionBtnHtml = '';
        if (order.Ordr_Status === 'Preparing') {
            actionBtnHtml = `<button class="action-btn btn-ready" onclick="markReady(${order.Ordr_ID})">Mark Ready for Pickup</button>`;
        } else if (order.Ordr_Status === 'Ready for Pickup') {
            actionBtnHtml = `<button class="action-btn" style="background:#bdc3c7; cursor:not-allowed;" disabled>Waiting for Rider...</button>`;
        }

        card.innerHTML = `
            <div class="menu-item-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.2rem;">#${order.Ordr_ID} - ${order.Cust_FName}</h3>
                    <span class="menu-item-badge" style="margin: 0; background-color: ${order.Ordr_Status === 'Preparing' ? '#f59e0b' : '#10b981'}; color: white;">${order.Ordr_Status}</span>
                </div>
                <ul style="list-style: none; padding: 0; margin-bottom: 1.5rem; flex-grow: 1;">
                    ${itemsHtml}
                </ul>
                <div style="margin-top: auto;">
                    ${actionBtnHtml}
                </div>
            </div>
        `;
        queue.appendChild(card);
    });
}


async function markReady(id) {
    await fetch(`/api/staff/orders/${id}/ready`, { method: 'PUT' });
    fetchOrders(); // Refresh
}

function logout() {
    localStorage.clear();
    window.location.href = 'staff-login.html';
}

// Initial fetch and set interval to auto-refresh every 5 seconds
fetchOrders();
setInterval(fetchOrders, 5000);
