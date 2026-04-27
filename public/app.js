let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchMenuItems();
    fetchBranches();
    setupCartUI();
    checkAuthStatus();
});

function checkAuthStatus() {
    const authLink = document.getElementById('auth-link');
    if (authLink) {
        if (localStorage.getItem('user')) {
            authLink.textContent = 'Profile';
            authLink.href = 'profile.html';
        } else {
            authLink.textContent = 'Login/Register';
            authLink.href = 'login.html';
        }
    }
}

function fetchMenuItems() {
    // Fetch data from our Node.js backend
    fetch('http://localhost:3000/api/menu')
        .then(response => response.json())
        .then(data => {
            const menuContainer = document.getElementById('menu-container');
            menuContainer.innerHTML = ''; // Clear loading text

            if (data.length === 0) {
                menuContainer.innerHTML = '<p>No items found. Have you inserted data into the MySQL database?</p>';
                return;
            }

            // Loop through each menu item and create HTML elements
            data.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'menu-item';
                itemDiv.innerHTML = `
                    <h3>${item.Menu_Name}</h3>
                    <p class="price">₱${item.Menu_Price}</p>
                    <button class="add-to-cart-btn">Add to Cart</button>
                `;
                itemDiv.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(item));
                menuContainer.appendChild(itemDiv);
            });
        })
        .catch(error => {
            console.error('Error fetching menu:', error);
            document.getElementById('menu-container').innerHTML = '<p>Error loading menu. Is the Node.js backend server running?</p>';
        });
}

function fetchBranches() {
    fetch('http://localhost:3000/api/branches')
        .then(response => response.json())
        .then(branches => {
            const select = document.getElementById('branch-select');
            if (!select) return;
            select.innerHTML = '';
            branches.forEach(branch => {
                const opt = document.createElement('option');
                opt.value = branch.Brch_ID;
                opt.textContent = `${branch.Brch_Name} — ${branch.Brch_Loc}`;
                select.appendChild(opt);
            });
        })
        .catch(err => console.error('Error loading branches:', err));
}

function addToCart(item) {
    const existing = cart.find(i => i.Menu_ID === item.Menu_ID);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    updateCartUI();
    if (typeof showNotification === 'function') {
        showNotification(`${item.Menu_Name} added to cart!`);
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    if(cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartItems = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    if(!cartItems || !cartTotalPrice) return;
    
    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        total += item.Menu_Price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span style="flex:1;">${item.Menu_Name}</span>
            <div class="cart-qty-controls">
                <button onclick="changeQuantity(${index}, -1)" class="qty-btn">-</button>
                <span class="qty-display">${item.quantity}</span>
                <button onclick="changeQuantity(${index}, 1)" class="qty-btn">+</button>
            </div>
            <span style="width: 80px; text-align: right;">₱${(item.Menu_Price * item.quantity).toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" class="remove-btn">&times;</button>
        `;
        cartItems.appendChild(div);
    });
    cartTotalPrice.textContent = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function changeQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        removeFromCart(index);
    } else {
        updateCartUI();
    }
}

function setupCartUI() {
    const modal = document.getElementById('cart-modal');
    const btn = document.getElementById('cart-link');
    const closeBtn = document.querySelector('.close-btn');
    
    if(btn && modal) {
        btn.onclick = (e) => {
            e.preventDefault();
            modal.style.display = 'flex';
        };
    }
    if(closeBtn && modal) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if(checkoutBtn) {
        checkoutBtn.onclick = async () => {
            if(cart.length === 0) {
                if(typeof showNotification === 'function') showNotification('Your cart is empty!', true);
                return;
            }

            // Check if logged in
            const userStr = localStorage.getItem('user');
            if(!userStr) {
                if(typeof showNotification === 'function') showNotification('Please login to place an order!', true);
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            const user = JSON.parse(userStr);
            const total = cart.reduce((sum, item) => sum + (item.Menu_Price * item.quantity), 0);
            const paymentMethod = document.getElementById('payment-method') ? document.getElementById('payment-method').value : 'Cash';
            const branchId = document.getElementById('branch-select') ? document.getElementById('branch-select').value : 1;

            try {
                const res = await fetch('http://localhost:3000/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerId: user.Cust_ID,
                        cartItems: cart,
                        total: total,
                        paymentMethod: paymentMethod,
                        branchId: parseInt(branchId)
                    })
                });

                const data = await res.json();
                if(res.ok) {
                    if(typeof showNotification === 'function') showNotification('Order placed successfully!');
                    cart = [];
                    updateCartUI();
                    modal.style.display = 'none';
                } else {
                    if(typeof showNotification === 'function') showNotification('Error: ' + data.error, true);
                }
            } catch (error) {
                console.error(error);
                if(typeof showNotification === 'function') showNotification('Failed to connect to server.', true);
            }
        };
    }
}
