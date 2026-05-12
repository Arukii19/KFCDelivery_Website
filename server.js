const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // to parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // serve static files from public folder

// Database connection setup
// Make sure XAMPP is running before starting this server
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // default XAMPP username
    password: 'Gian2005', // default XAMPP password is empty
    database: 'kfc_delivery_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database. Make sure XAMPP/MySQL is running.', err);
        return;
    }
    console.log('Successfully connected to the MySQL database!');
});

// Example API Route to get all available menu items
app.get('/api/menu', (req, res) => {
    const query = 'SELECT * FROM MenuItem WHERE Menu_Avail = TRUE';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Get all branches (for customer dropdown)
app.get('/api/branches', (req, res) => {
    const query = 'SELECT * FROM Branch';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- USER AUTHENTICATION ---

// Registration API
app.post('/api/register', (req, res) => {
    const { fName, lName, phone, email, password } = req.body;

    // Encrypt the password using Base64 so it looks short and neat in the database
    const hashedPassword = Buffer.from(password).toString('base64');

    // Default to 'Pending' since address is entered at checkout
    const address = 'Pending';

    const query = 'INSERT INTO Customer (Cust_FName, Cust_LName, Cust_Phone, Cust_Email, Cust_Pass, Cust_Addr) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(query, [fName, lName, phone, email, hashedPassword, address], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Email already exists!' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Registration successful!', customerId: results.insertId });
    });
});

// Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM Customer WHERE Cust_Email = ?';

    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length > 0) {
            const user = results[0];
            // Compare Base64 exactly
            const isMatch = (Buffer.from(password).toString('base64') === user.Cust_Pass);

            if (isMatch) {
                // Send back user data (excluding password for safety)
                delete user.Cust_Pass;
                res.json({ message: 'Login successful!', user: user });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});

// --- MENU CRUD OPERATIONS (ADMIN) ---

// Add a new menu item
app.post('/api/menu', (req, res) => {
    const { name, category, price, avail } = req.body;
    const query = 'INSERT INTO MenuItem (Menu_Name, Menu_Category, Menu_Price, Menu_Avail) VALUES (?, ?, ?, ?)';
    db.query(query, [name, category, price, avail], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Menu item added!', id: results.insertId });
    });
});

// Delete a menu item
app.delete('/api/menu/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM MenuItem WHERE Menu_ID = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Menu item deleted!' });
    });
});

// --- ORDER CHECKOUT ---
app.post('/api/orders', (req, res) => {
    const { customerId, cartItems, total, paymentMethod, branchId, deliveryAddress } = req.body;
    // Use selected branch, default to 1 if not provided
    const selectedBranch = branchId || 1;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        // First, update the customer's delivery address
        const updateCustomerQuery = 'UPDATE Customer SET Cust_Addr = ? WHERE Cust_ID = ?';
        db.query(updateCustomerQuery, [deliveryAddress, customerId], (err, customerResult) => {
            if (err) return db.rollback(() => { res.status(500).json({ error: err.message }); });

            const orderQuery = 'INSERT INTO `Order` (Cust_ID, Brch_ID, Ordr_Total, Ordr_Status, Delivery_Addr) VALUES (?, ?, ?, ?, ?)';
            db.query(orderQuery, [customerId, selectedBranch, total, 'Preparing', deliveryAddress], (err, orderResult) => {
                if (err) {
                    return db.rollback(() => { res.status(500).json({ error: err.message }); });
                }

                const orderId = orderResult.insertId;
                const orderItemsData = cartItems.map(item => [orderId, item.Menu_ID, item.quantity, item.Menu_Price * item.quantity]);

                if (orderItemsData.length === 0) {
                    return db.rollback(() => { res.status(400).json({ error: "Cart is empty" }); });
                }

                const orderItemQuery = 'INSERT INTO OrderItem (Ordr_ID, Menu_ID, Oite_Qty, Oite_Subtotal) VALUES ?';
                db.query(orderItemQuery, [orderItemsData], (err, orderItemResult) => {
                    if (err) {
                        return db.rollback(() => { res.status(500).json({ error: err.message }); });
                    }

                    const paymentQuery = 'INSERT INTO Payment (Ordr_ID, Pay_Method, Pay_Status) VALUES (?, ?, ?)';
                    // If paid via GCash, assume completed (for simulation), else Pending for COD
                    const payStatus = paymentMethod === 'GCash' ? 'Completed' : 'Pending';

                    db.query(paymentQuery, [orderId, paymentMethod, payStatus], (err, paymentResult) => {
                        if (err) {
                            return db.rollback(() => { res.status(500).json({ error: err.message }); });
                        }

                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => { res.status(500).json({ error: err.message }); });
                            }

                            // Fetch the updated user to send back
                            db.query('SELECT * FROM Customer WHERE Cust_ID = ?', [customerId], (err, userResults) => {
                                let updatedUser = null;
                                if (!err && userResults.length > 0) {
                                    updatedUser = userResults[0];
                                    delete updatedUser.Cust_Pass;
                                }
                                res.json({ message: 'Order placed successfully!', orderId: orderId, updatedUser: updatedUser });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Cancel an order (customer side)
app.put('/api/orders/:id/cancel', (req, res) => {
    const { id } = req.params;
    const query = 'UPDATE \`Order\` SET Ordr_Status = "Canceled" WHERE Ordr_ID = ? AND Ordr_Status IN ("Pending", "Preparing")';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0) return res.status(400).json({ error: 'Order cannot be canceled because it is already Out for Delivery or Delivered.' });
        res.json({ message: 'Order canceled successfully!' });
    });
});

// --- ADMIN ORDER MANAGEMENT ---

// Get pending orders
app.get('/api/admin/orders', (req, res) => {
    const query = `
        SELECT o.Ordr_ID, o.Ordr_Total, o.Ordr_Date, o.Ordr_Status, c.Cust_FName, c.Cust_LName, IFNULL(o.Delivery_Addr, c.Cust_Addr) AS Cust_Addr, b.Brch_Name 
        FROM \`Order\` o
        JOIN Customer c ON o.Cust_ID = c.Cust_ID
        JOIN Branch b ON o.Brch_ID = b.Brch_ID
        WHERE o.Ordr_Status IN ('Pending', 'Preparing')
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get available riders
app.get('/api/admin/riders', (req, res) => {
    const query = 'SELECT * FROM DeliveryRider WHERE Ridr_Status = "Available"';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Assign a rider to an order
app.put('/api/admin/orders/:id/assign', (req, res) => {
    const { id } = req.params;
    const { riderId } = req.body;

    // First, check how many active orders this rider has
    const countQuery = 'SELECT COUNT(*) as activeCount FROM `Order` WHERE Ridr_ID = ? AND Ordr_Status = "Out for Delivery"';
    db.query(countQuery, [riderId], (err, countResults) => {
        if (err) return res.status(500).json({ error: err.message });

        if (countResults[0].activeCount >= 1) {
            return res.status(400).json({ error: 'Rider is at maximum capacity (1 order at a time)!' });
        }

        db.beginTransaction((err) => {
            if (err) return res.status(500).json({ error: err.message });

            const orderQuery = 'UPDATE \`Order\` SET Ridr_ID = ?, Ordr_Status = "Out for Delivery" WHERE Ordr_ID = ?';
            db.query(orderQuery, [riderId, id], (err, results) => {
                if (err) {
                    return db.rollback(() => { res.status(500).json({ error: err.message }); });
                }

                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => { res.status(500).json({ error: err.message }); });
                    }
                    res.json({ message: 'Rider assigned successfully!' });
                });
            });
        });
    });
});

// Get active deliveries
app.get('/api/admin/active-deliveries', (req, res) => {
    const query = `
        SELECT o.Ordr_ID, o.Ordr_Total, o.Ordr_Status, c.Cust_FName, c.Cust_LName, IFNULL(o.Delivery_Addr, c.Cust_Addr) AS Cust_Addr, r.Ridr_FName, r.Ridr_LName, b.Brch_Name 
        FROM \`Order\` o
        JOIN Customer c ON o.Cust_ID = c.Cust_ID
        JOIN DeliveryRider r ON o.Ridr_ID = r.Ridr_ID
        JOIN Branch b ON o.Brch_ID = b.Brch_ID
        WHERE o.Ordr_Status = 'Out for Delivery'
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Mark order as delivered and update payment status
app.put('/api/admin/orders/:id/deliver', (req, res) => {
    const { id } = req.params;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const orderQuery = 'UPDATE \`Order\` SET Ordr_Status = "Delivered" WHERE Ordr_ID = ?';
        db.query(orderQuery, [id], (err, results) => {
            if (err) return db.rollback(() => { res.status(500).json({ error: err.message }); });

            const paymentQuery = 'UPDATE Payment SET Pay_Status = "Completed" WHERE Ordr_ID = ?';
            db.query(paymentQuery, [id], (err, paymentResults) => {
                if (err) return db.rollback(() => { res.status(500).json({ error: err.message }); });

                db.commit((err) => {
                    if (err) return db.rollback(() => { res.status(500).json({ error: err.message }); });
                    res.json({ message: 'Order marked as Delivered and Payment Completed!' });
                });
            });
        });
    });
});

// Mark order as preparing
app.put('/api/admin/orders/:id/prepare', (req, res) => {
    const { id } = req.params;
    const query = 'UPDATE \`Order\` SET Ordr_Status = "Preparing" WHERE Ordr_ID = ? AND Ordr_Status = "Pending"';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0) return res.status(400).json({ error: 'Order cannot be marked as preparing.' });
        res.json({ message: 'Order is now Preparing!' });
    });
});

// Get all riders for management
app.get('/api/admin/all-riders', (req, res) => {
    const query = 'SELECT * FROM DeliveryRider';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Update rider status
app.put('/api/admin/riders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const query = 'UPDATE DeliveryRider SET Ridr_Status = ? WHERE Ridr_ID = ?';
    db.query(query, [status, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Rider status updated!' });
    });
});

// --- CUSTOMER PROFILE ---
app.put('/api/customer/:id', (req, res) => {
    const { id } = req.params;
    const { fName, lName, phone, email, address } = req.body;
    const query = 'UPDATE Customer SET Cust_FName = ?, Cust_LName = ?, Cust_Phone = ?, Cust_Email = ?, Cust_Addr = ? WHERE Cust_ID = ?';
    db.query(query, [fName, lName, phone, email, address, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // Return the updated data so the frontend can update localStorage
        const fetchQuery = 'SELECT * FROM Customer WHERE Cust_ID = ?';
        db.query(fetchQuery, [id], (err, fetchResults) => {
            if (err) return res.status(500).json({ error: err.message });
            const user = fetchResults[0];
            delete user.Cust_Pass; // don't send password back
            res.json({ message: 'Profile updated successfully!', user: user });
        });
    });
});
// --- ADMIN CUSTOMER MANAGEMENT ---

// Get all customers (without password)
app.get('/api/admin/customers', (req, res) => {
    const query = 'SELECT Cust_ID, Cust_FName, Cust_LName, Cust_Phone, Cust_Email, Cust_Addr FROM Customer';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Delete a customer (cascade: Payment → OrderItem → Order → Customer)
app.delete('/api/admin/customers/:id', (req, res) => {
    const { id } = req.params;

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 1. Delete Payments linked to this customer's orders
        const delPayments = 'DELETE p FROM Payment p JOIN `Order` o ON p.Ordr_ID = o.Ordr_ID WHERE o.Cust_ID = ?';
        db.query(delPayments, [id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            // 2. Delete OrderItems linked to this customer's orders
            const delItems = 'DELETE oi FROM OrderItem oi JOIN `Order` o ON oi.Ordr_ID = o.Ordr_ID WHERE o.Cust_ID = ?';
            db.query(delItems, [id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                // 3. Delete Orders
                const delOrders = 'DELETE FROM `Order` WHERE Cust_ID = ?';
                db.query(delOrders, [id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                    // 4. Delete the Customer
                    const delCustomer = 'DELETE FROM Customer WHERE Cust_ID = ?';
                    db.query(delCustomer, [id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                            res.json({ message: 'Customer and all related records removed successfully!' });
                        });
                    });
                });
            });
        });
    });
});

// --- ORDER HISTORY PER CUSTOMER ---
app.get('/api/admin/customers/:id/orders', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT o.Ordr_ID, o.Ordr_Date, o.Ordr_Total, o.Ordr_Status,
               p.Pay_Method, p.Pay_Status,
               r.Ridr_FName, r.Ridr_LName,
               b.Brch_Name, IFNULL(o.Delivery_Addr, c.Cust_Addr) AS Cust_Addr
        FROM \`Order\` o
        JOIN Customer c ON o.Cust_ID = c.Cust_ID
        LEFT JOIN Payment p ON o.Ordr_ID = p.Ordr_ID
        LEFT JOIN DeliveryRider r ON o.Ridr_ID = r.Ridr_ID
        JOIN Branch b ON o.Brch_ID = b.Brch_ID
        WHERE o.Cust_ID = ?
        ORDER BY o.Ordr_Date DESC
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get order items for a specific order
app.get('/api/admin/orders/:id/items', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT oi.Oite_Qty, oi.Oite_Subtotal, m.Menu_Name, m.Menu_Price
        FROM OrderItem oi
        JOIN MenuItem m ON oi.Menu_ID = m.Menu_ID
        WHERE oi.Ordr_ID = ?
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- DELIVERED ORDERS HISTORY ---
app.get('/api/admin/delivered-history', (req, res) => {
    const query = `
        SELECT o.Ordr_ID, o.Ordr_Date, o.Ordr_Total, o.Ordr_Status,
               c.Cust_FName, c.Cust_LName, IFNULL(o.Delivery_Addr, c.Cust_Addr) AS Cust_Addr,
               p.Pay_Method, p.Pay_Status,
               r.Ridr_FName, r.Ridr_LName,
               b.Brch_Name
        FROM \`Order\` o
        JOIN Customer c ON o.Cust_ID = c.Cust_ID
        LEFT JOIN Payment p ON o.Ordr_ID = p.Ordr_ID
        LEFT JOIN DeliveryRider r ON o.Ridr_ID = r.Ridr_ID
        JOIN Branch b ON o.Brch_ID = b.Brch_ID
        WHERE o.Ordr_Status = 'Delivered'
        ORDER BY o.Ordr_Date DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- ADMIN BRANCH MANAGEMENT ---

// Add a new branch
app.post('/api/admin/branches', (req, res) => {
    const { name, location, contact } = req.body;
    const query = 'INSERT INTO Branch (Brch_Name, Brch_Loc, Brch_Contact) VALUES (?, ?, ?)';
    db.query(query, [name, location, contact], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Branch added!', id: results.insertId });
    });
});

// Delete a branch
app.delete('/api/admin/branches/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Branch WHERE Brch_ID = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Branch deleted!' });
    });
});

// ==========================================
// RIDER DASHBOARD ROUTES
// ==========================================

// Rider Registration
app.post('/api/rider/register', (req, res) => {
    const { fName, lName, phone, password, vehicle } = req.body;

    // Check if phone already exists
    const checkQuery = 'SELECT * FROM DeliveryRider WHERE Ridr_Phone = ?';
    db.query(checkQuery, [phone], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Phone number already registered' });

        // Encrypt the password using Base64
        const hashedPassword = Buffer.from(password).toString('base64');

        const insertQuery = 'INSERT INTO DeliveryRider (Ridr_FName, Ridr_LName, Ridr_Phone, Ridr_Pass, Ridr_Vehicle) VALUES (?, ?, ?, ?, ?)';
        db.query(insertQuery, [fName, lName, phone, hashedPassword, vehicle], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Rider registered successfully', riderId: result.insertId });
        });
    });
});

// Rider Login
app.post('/api/rider/login', (req, res) => {
    const { phone, password } = req.body;

    const query = 'SELECT * FROM DeliveryRider WHERE Ridr_Phone = ?';
    db.query(query, [phone], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            const rider = results[0];
            // Compare Base64 exactly
            const isMatch = (Buffer.from(password).toString('base64') === rider.Ridr_Pass);

            if (isMatch) {
                // Don't send password back to client
                delete rider.Ridr_Pass;
                res.json({ message: 'Login successful', rider });
            } else {
                res.status(401).json({ error: 'Invalid phone number or password' });
            }
        } else {
            res.status(401).json({ error: 'Invalid phone number or password' });
        }
    });
});

// Get active deliveries assigned to a specific rider
app.get('/api/rider/:id/deliveries', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT o.Ordr_ID, o.Ordr_Total, o.Ordr_Status, 
               c.Cust_FName, c.Cust_LName, c.Cust_Phone, IFNULL(o.Delivery_Addr, c.Cust_Addr) AS Cust_Addr, 
               b.Brch_Name, p.Pay_Method, p.Pay_Status
        FROM \`Order\` o
        JOIN Customer c ON o.Cust_ID = c.Cust_ID
        JOIN Branch b ON o.Brch_ID = b.Brch_ID
        LEFT JOIN Payment p ON o.Ordr_ID = p.Ordr_ID
        WHERE o.Ridr_ID = ? AND o.Ordr_Status = 'Out for Delivery'
        ORDER BY o.Ordr_Date DESC
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get delivery history for a specific rider
app.get('/api/rider/:id/history', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT o.Ordr_ID, o.Ordr_Date, o.Ordr_Total, o.Ordr_Status, 
               c.Cust_FName, c.Cust_LName, IFNULL(o.Delivery_Addr, c.Cust_Addr) AS Cust_Addr
        FROM \`Order\` o
        JOIN Customer c ON o.Cust_ID = c.Cust_ID
        WHERE o.Ridr_ID = ? AND o.Ordr_Status = 'Delivered'
        ORDER BY o.Ordr_Date DESC
    `;
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
