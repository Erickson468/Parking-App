//FOR TESTING I USED LOCAL MYSQL SERVER WITH THOSE TABLES

CREATE TABLE parking_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    parking_space_id INT NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    FOREIGN KEY (user_id) REFERENCES user_vehicles(id),
    FOREIGN KEY (vehicle_id) REFERENCES user_vehicles(id),
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id)
);

CREATE TABLE parking_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    address VARCHAR(255),
    price DECIMAL(10,2),
    is_occupied BOOLEAN DEFAULT false,
    is_reserved BOOLEAN DEFAULT false,
    reserved_start_time DATETIME,
    reserved_end_time DATETIME
);

CREATE TABLE user_vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    balance DECIMAL(10,2),
    vehicle_name VARCHAR(255),
    state_number VARCHAR(255),
    type VARCHAR(255)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE superusers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE parking_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    parking_space_id INT NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES user_vehicles(id),
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id)
);