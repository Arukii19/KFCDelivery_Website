-- KFC Online Delivery System - Database Schema

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS kfc_delivery_db;
USE kfc_delivery_db;

-- 2. Create Customer Table
CREATE TABLE Customer (
    Cust_ID INT AUTO_INCREMENT PRIMARY KEY,
    Cust_FName VARCHAR(50) NOT NULL,
    Cust_LName VARCHAR(50) NOT NULL,
    Cust_Phone VARCHAR(20) NOT NULL,
    Cust_Email VARCHAR(100) UNIQUE NOT NULL,
    Cust_Pass VARCHAR(255) NOT NULL,
    Cust_Addr TEXT NOT NULL
);

-- 3. Create Branch Table
CREATE TABLE Branch (
    Brch_ID INT AUTO_INCREMENT PRIMARY KEY,
    Brch_Name VARCHAR(100) NOT NULL,
    Brch_Loc TEXT NOT NULL,
    Brch_Contact VARCHAR(20) NOT NULL
);

-- 4. Create DeliveryRider Table
CREATE TABLE DeliveryRider (
    Ridr_ID INT AUTO_INCREMENT PRIMARY KEY,
    Ridr_FName VARCHAR(50) NOT NULL,
    Ridr_LName VARCHAR(50) NOT NULL,
    Ridr_Email VARCHAR(100) UNIQUE NOT NULL,
    Ridr_Phone VARCHAR(20) UNIQUE NOT NULL,
    Ridr_Pass VARCHAR(255) NOT NULL,
    Ridr_Vehicle VARCHAR(50) NOT NULL,
    Ridr_Status ENUM('Available', 'Busy', 'Offline') DEFAULT 'Available'
);

-- 4.5 Create Employee Table
CREATE TABLE Employee (
    Emp_ID INT AUTO_INCREMENT PRIMARY KEY,
    Emp_FName VARCHAR(50) NOT NULL,
    Emp_LName VARCHAR(50) NOT NULL,
    Emp_Phone VARCHAR(20) UNIQUE NOT NULL,
    Emp_Pass VARCHAR(255) NOT NULL,
    Role ENUM('SuperAdmin', 'BranchAdmin', 'Staff') NOT NULL,
    Brch_ID INT,
    FOREIGN KEY (Brch_ID) REFERENCES Branch(Brch_ID)
);

-- 5. Create Order Table
CREATE TABLE `Order` (
    Ordr_ID INT AUTO_INCREMENT PRIMARY KEY,
    Cust_ID INT NOT NULL,
    Brch_ID INT NOT NULL,
    Ridr_ID INT,
    Ordr_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Ordr_Total DECIMAL(10, 2) NOT NULL,
    Ordr_Status ENUM('Pending', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Canceled') DEFAULT 'Preparing',
    Delivery_Addr TEXT,
    FOREIGN KEY (Cust_ID) REFERENCES Customer(Cust_ID),
    FOREIGN KEY (Brch_ID) REFERENCES Branch(Brch_ID),
    FOREIGN KEY (Ridr_ID) REFERENCES DeliveryRider(Ridr_ID)
);

-- 6. Create MenuItem Table
CREATE TABLE MenuItem (
    Menu_ID INT AUTO_INCREMENT PRIMARY KEY,
    Menu_Name VARCHAR(100) NOT NULL,
    Menu_Category VARCHAR(50) NOT NULL,
    Menu_Price DECIMAL(10, 2) NOT NULL
);

-- 6.5 Create BranchMenu Table
CREATE TABLE BranchMenu (
    Brch_ID INT NOT NULL,
    Menu_ID INT NOT NULL,
    IsAvailable BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (Brch_ID, Menu_ID),
    FOREIGN KEY (Brch_ID) REFERENCES Branch(Brch_ID) ON DELETE CASCADE,
    FOREIGN KEY (Menu_ID) REFERENCES MenuItem(Menu_ID) ON DELETE CASCADE
);

-- 7. Create OrderItem Table
CREATE TABLE OrderItem (
    Oite_ID INT AUTO_INCREMENT PRIMARY KEY,
    Ordr_ID INT NOT NULL,
    Menu_ID INT NOT NULL,
    Oite_Qty INT NOT NULL,
    Oite_Subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (Ordr_ID) REFERENCES `Order`(Ordr_ID),
    FOREIGN KEY (Menu_ID) REFERENCES MenuItem(Menu_ID)
);

-- 8. Create Payment Table
CREATE TABLE Payment (
    Pay_ID INT AUTO_INCREMENT PRIMARY KEY,
    Ordr_ID INT NOT NULL UNIQUE,
    Pay_Method ENUM('Cash', 'GCash', 'Card') NOT NULL,
    Pay_Status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    Pay_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Ordr_ID) REFERENCES `Order`(Ordr_ID)
);
