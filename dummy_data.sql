USE kfc_delivery_db;

-- Insert Branches
INSERT INTO Branch (Brch_Name, Brch_Loc, Brch_Contact) VALUES 
('KFC Main Street', '123 Main St, City Center', '09123456789'),
('KFC Mall of Asia', 'Ground Floor, MOA', '09987654321'),
('KFC Ayala Center', 'Level 2, Ayala Malls', '09171234567'),
('KFC SM Megamall', 'Bldg A, SM Megamall', '09228889999'),
('KFC BGC High Street', 'Bonifacio Global City, Taguig', '09187654321');

-- Insert Menu Items
INSERT INTO MenuItem (Menu_Name, Menu_Category, Menu_Price) VALUES 
('1-pc Fully Loaded Meal', 'Meals', 180.00),
('2-pc Chicken Meal', 'Meals', 220.00),
('Zinger Burger', 'Sandwiches', 150.00),
('Famous Bowl', 'Snacks', 120.00),
('Bucket of 6', 'Buckets', 550.00),
('Bucket of 8', 'Buckets', 700.00),
('French Fries (Large)', 'Sides', 80.00),
('Mashed Potato (Large)', 'Sides', 70.00),
('Macaroni Salad', 'Sides', 65.00),
('Crispy Strips (3-pc)', 'Snacks', 140.00),
('Double Down Sandwich', 'Sandwiches', 190.00),
('Iced Tea (Large)', 'Drinks', 60.00),
('Soda (Large)', 'Drinks', 60.00),
('Spaghetti', 'Snacks', 95.00);

-- Populate BranchMenu with default availability
INSERT INTO BranchMenu (Brch_ID, Menu_ID, IsAvailable) 
SELECT b.Brch_ID, m.Menu_ID, TRUE FROM Branch b CROSS JOIN MenuItem m;

-- Insert Delivery Riders
INSERT INTO DeliveryRider (Ridr_FName, Ridr_LName, Ridr_Email, Ridr_Phone, Ridr_Pass, Ridr_Vehicle, Ridr_Status) VALUES 
('Juan', 'Dela Cruz', 'juan@kfc.com', '09111111111', 'cmlkZXIxMjM=', 'Motorcycle', 'Available'),
('Pedro', 'Penduko', 'pedro@kfc.com', '09222222222', 'cmlkZXIxMjM=', 'Motorcycle', 'Available'),
('Jose', 'Rizal', 'jose@kfc.com', '09333333333', 'cmlkZXIxMjM=', 'Car', 'Available'),
('Andres', 'Bonifacio', 'andres@kfc.com', '09444444444', 'cmlkZXIxMjM=', 'Motorcycle', 'Available'),
('Emilio', 'Aguinaldo', 'emilio@kfc.com', '09555555555', 'cmlkZXIxMjM=', 'E-Bike', 'Busy');

-- Insert Employees
INSERT INTO Employee (Emp_FName, Emp_LName, Emp_Phone, Emp_Pass, Role, Brch_ID) VALUES
('Super', 'Admin', 'admin', 'YWRtaW4xMjM=', 'SuperAdmin', NULL),
('Manager', 'One', 'manager1', 'YWRtaW4xMjM=', 'BranchAdmin', 1),
('Manager', 'Two', 'manager2', 'YWRtaW4xMjM=', 'BranchAdmin', 2),
('Staff', 'One', 'staff1', 'c3RhZmYxMjM=', 'Staff', 1),
('Staff', 'Two', 'staff2', 'c3RhZmYxMjM=', 'Staff', 2);
