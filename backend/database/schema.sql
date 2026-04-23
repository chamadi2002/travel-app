CREATE DATABASE IF NOT EXISTS travel_guide_db;

USE travel_guide_db;

CREATE TABLE packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration INT NOT NULL,
    slots INT NOT NULL,
    status ENUM('available', 'sold out') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    buyer VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    payment ENUM('paid', 'pending') DEFAULT 'pending',
    FOREIGN KEY (package_id) REFERENCES packages (id)
);

CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    customer VARCHAR(255) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status ENUM('paid', 'unpaid', 'overdue') DEFAULT 'unpaid',
    FOREIGN KEY (sale_id) REFERENCES sales (id)
);

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    category ENUM(
        'transport',
        'hotel',
        'salary',
        'marketing',
        'equipment',
        'other'
    ) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(191) UNIQUE,
    phone VARCHAR(20),
    commission DECIMAL(5, 2) NOT NULL,
    assigned_packages VARCHAR(255)
);

CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('red', 'yellow', 'blue') DEFAULT 'blue',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);