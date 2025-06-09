CREATE DATABASE HotelManagement;
USE HotelManagement;

CREATE TABLE roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL  
);

CREATE TABLE users (
    id INT Identity(1,1) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at DATETIME DEFAULT GETDATE(),
);

select * from users

ALTER TABLE users ADD role_id INT;

ALTER TABLE users
ADD CONSTRAINT FK_users_roles FOREIGN KEY (role_id) REFERENCES roles(id);

INSERT INTO roles (name) VALUES ('admin'), ('cleaner'), ('guest');

INSERT INTO users (first_name, last_name, email, password, phone, role_id)
VALUES 
('Arta', 'Berisha', 'arta@outlook.com', 'arta123!', '044123456', (SELECT id FROM roles WHERE name = 'guest')),
('Jeton', 'Shala', 'jeton@yahoo.com', 'jeton312!', '044124456', (SELECT id FROM roles WHERE name = 'guest')),
('Armando', 'Broja', 'abroja@hotmail.com', 'broja28!', '044124451', (SELECT id FROM roles WHERE name = 'cleaner')),
('Ana', 'Bekaj', 'anab@gmail.com', 'anabekaj1', '044145446', (SELECT id FROM roles WHERE name = 'cleaner'));

INSERT INTO users (first_name, last_name, email, password, phone, role_id)
VALUES ('Luis', 'Suarez', 'luissuarez@gmail.com', 'Suarez12', '049327382', (SELECT id FROM roles WHERE name = 'cleaner'));

select * from users

UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'rijonz29@gmail.com';

CREATE TABLE room_categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE room_statuses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO room_categories (name)
SELECT DISTINCT category FROM rooms;

INSERT INTO room_statuses (name)
SELECT DISTINCT status FROM rooms;

ALTER TABLE rooms ADD category_id INT;
ALTER TABLE rooms ADD status_id INT;

UPDATE rooms
SET category_id = rc.id
FROM rooms r
JOIN room_categories rc ON r.category = rc.name;

UPDATE rooms
SET status_id = rs.id
FROM rooms r
JOIN room_statuses rs ON r.status = rs.name;

ALTER TABLE rooms DROP CONSTRAINT CK__rooms__category__5DCAEF64;
ALTER TABLE rooms DROP CONSTRAINT DF__rooms__status__5EBF139D;

ALTER TABLE rooms DROP COLUMN category;
ALTER TABLE rooms DROP COLUMN status;

ALTER TABLE rooms ALTER COLUMN category_id INT NOT NULL;
ALTER TABLE rooms ALTER COLUMN status_id INT NOT NULL;

ALTER TABLE rooms
ADD CONSTRAINT FK_rooms_category
FOREIGN KEY (category_id) REFERENCES room_categories(id);

ALTER TABLE rooms
ADD CONSTRAINT FK_rooms_status
FOREIGN KEY (status_id) REFERENCES room_statuses(id);

CREATE TABLE rooms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Standard', 'Deluxe', 'Suite')),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
    maintenance_notes VARCHAR(MAX)
);

INSERT INTO room_categories (name)
SELECT name FROM (
    VALUES ('Standard'), ('Deluxe'), ('Suite')
) AS vals(name)
WHERE NOT EXISTS (
    SELECT 1 FROM room_categories rc WHERE rc.name = vals.name
);


INSERT INTO room_statuses (name)
SELECT name FROM (
    VALUES ('Available'), ('Occupied'), ('Maintenance')
) AS vals(name)
WHERE NOT EXISTS (
    SELECT 1 FROM room_statuses rs WHERE rs.name = vals.name
);


INSERT INTO rooms (room_number, category, price, status, maintenance_notes)
VALUES ('101A', 'Standard', 49.99, 'Available', NULL);

INSERT INTO rooms (room_number, category_id, price, status_id, maintenance_notes)
VALUES (
    '101A',
    (SELECT id FROM room_categories WHERE name = 'Standard'),
    79.99,
    (SELECT id FROM room_statuses WHERE name = 'Available'),
    NULL
);

SELECT * FROM room_statuses;

DELETE FROM room_statuses;

SELECT 
        r.*, 
        c.name AS category_name, 
        s.name AS status_name
      FROM HotelManagement.dbo.rooms r
      LEFT JOIN HotelManagement.dbo.room_categories c ON r.category_id = c.id
      LEFT JOIN HotelManagement.dbo.room_statuses s ON r.status_id = s.id;
      
      SELECT * FROM HotelManagement.dbo.room_categories;
      
      SELECT * FROM HotelManagement.dbo.room_statuses;

	  -- Create booking statuses lookup table
CREATE TABLE booking_statuses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

-- Insert booking status values
INSERT INTO booking_statuses (name) VALUES 
('Confirmed'), 
('Pending'), 
('Cancelled'), 
('Completed');

-- Create the main bookings table
CREATE TABLE bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    booking_date DATETIME DEFAULT GETDATE(),
    status_id INT NOT NULL DEFAULT 1, -- Default to 'Confirmed'
    total_amount DECIMAL(10,2) NOT NULL,
    number_of_guests INT DEFAULT 1,
    special_requests VARCHAR(MAX),
    notes VARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_bookings_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT FK_bookings_rooms FOREIGN KEY (room_id) REFERENCES rooms(id),
    CONSTRAINT FK_bookings_status FOREIGN KEY (status_id) REFERENCES booking_statuses(id),
    CONSTRAINT CHK_booking_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT CHK_guests CHECK (number_of_guests > 0),
    CONSTRAINT CHK_amount CHECK (total_amount >= 0)
);


-- Sample booking data
-- If you want to use the users you already have, try this:
INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, total_amount, number_of_guests, special_requests)
VALUES 
(
    (SELECT TOP 1 id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'guest')),
    (SELECT TOP 1 id FROM rooms),
    '2024-07-15',
    '2024-07-18',
    149.97,
    2,
    'Late check-in requested'
);
-- Useful queries for the bookings system

-- 1. View all bookings with user and room details
SELECT 
    b.id,
    u.first_name + ' ' + u.last_name AS guest_name,
    u.email,
    r.room_number,
    rc.name AS room_category,
    b.check_in_date,
    b.check_out_date,
    DATEDIFF(day, b.check_in_date, b.check_out_date) AS nights,
    b.total_amount,
    b.number_of_guests,
    bs.name AS booking_status,
    b.booking_date,
    b.special_requests
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN rooms r ON b.room_id = r.id
JOIN room_categories rc ON r.category_id = rc.id
JOIN booking_statuses bs ON b.status_id = bs.id
ORDER BY b.booking_date DESC;

-- 2. Get available rooms for specific dates and category (example query for backend)
SELECT 
    r.id,
    r.room_number,
    rc.name AS category,
    r.price
FROM rooms r
JOIN room_categories rc ON r.category_id = rc.id
JOIN room_statuses rs ON r.status_id = rs.id
WHERE rs.name = 'Available'
-- Add room availability logic in your backend application
ORDER BY r.price;


select * from rooms

INSERT INTO rooms (room_number, category, category_id, price, status, status_id, maintenance_notes)
VALUES (
    '103A',
    'Standard',
    (SELECT id FROM room_categories WHERE name = 'Standard'),
    69.99,
    'Available',
    (SELECT id FROM room_statuses WHERE name = 'Available'),
    NULL
);