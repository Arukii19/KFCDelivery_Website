USE kfc_delivery_db;

-- Insert Branches
INSERT INTO Branch (Brch_Name, Brch_Loc, Brch_Contact) VALUES 
('KFC Main Street', '123 Main St, City Center', '09123456789'),
('KFC Mall of Asia', 'Ground Floor, MOA', '09987654321'),
('KFC Ayala Center', 'Level 2, Ayala Malls', '09171234567'),
('KFC SM Megamall', 'Bldg A, SM Megamall', '09228889999'),
('KFC BGC High Street', 'Bonifacio Global City, Taguig', '09187654321');

-- Insert Menu Items
INSERT INTO MenuItem (Menu_Name, Menu_Category, Menu_Price, Menu_Avail) VALUES 
('1-pc Fully Loaded Meal', 'Meals', 180.00, TRUE),
('2-pc Chicken Meal', 'Meals', 220.00, TRUE),
('Zinger Burger', 'Sandwiches', 150.00, TRUE),
('Famous Bowl', 'Snacks', 120.00, TRUE),
('Bucket of 6', 'Buckets', 550.00, TRUE),
('Bucket of 8', 'Buckets', 700.00, TRUE),
('French Fries (Large)', 'Sides', 80.00, TRUE),
('Mashed Potato (Large)', 'Sides', 70.00, TRUE),
('Macaroni Salad', 'Sides', 65.00, TRUE),
('Crispy Strips (3-pc)', 'Snacks', 140.00, TRUE),
('Double Down Sandwich', 'Sandwiches', 190.00, TRUE),
('Iced Tea (Large)', 'Drinks', 60.00, TRUE),
('Soda (Large)', 'Drinks', 60.00, TRUE),
('Spaghetti', 'Snacks', 95.00, TRUE),
('Gravy (Extra)', 'Sides', 20.00, TRUE),
('Out of Stock Item', 'Snacks', 100.00, FALSE);

-- Insert Delivery Riders
INSERT INTO DeliveryRider (Ridr_FName, Ridr_LName, Ridr_Phone, Ridr_Pass, Ridr_Vehicle, Ridr_Status) VALUES 
('Juan', 'Dela Cruz', '09111111111', 'cmlkZXIxMjM=', 'Motorcycle', 'Available'),
('Pedro', 'Penduko', '09222222222', 'cmlkZXIxMjM=', 'Motorcycle', 'Available'),
('Jose', 'Rizal', '09333333333', 'cmlkZXIxMjM=', 'Car', 'Available'),
('Andres', 'Bonifacio', '09444444444', 'cmlkZXIxMjM=', 'Motorcycle', 'Available'),
('Emilio', 'Aguinaldo', '09555555555', 'cmlkZXIxMjM=', 'E-Bike', 'Busy');

