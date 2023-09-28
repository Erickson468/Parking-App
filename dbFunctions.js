const express = require("express");

const con = require('./db');

// Function to get the user's current balance from the database
function getCurrentUserBalance(vehicleId, callback) {
    console.log(vehicleId);
    con.query('SELECT balance FROM user_vehicles WHERE id = ?', [vehicleId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        if (result.length === 0) {
            return callback(new Error('User not found'), null);
        }
        const balance = result[0].balance;
        callback(null, balance);
    });
}

// Function to get the parking space cost by ID from the database
function getParkingSpaceCostById(parkingSpaceId, callback) {
    con.query('SELECT price FROM parking_spaces WHERE id = ?', [parkingSpaceId], (err, result) => {
        if (err) {
            return callback(err, null);
        }
        if (result.length === 0) {
            return callback(new Error('Parking space not found'), null);
        }
        const cost = result[0].price;
        callback(null, cost);
    });
}



// Function to insert parking record into the database
function insertParkingRecord(userId, vehicleId, parkingSpaceId, cost, callback) {
    const query = 'INSERT INTO parking_records (user_id, vehicle_id, parking_space_id, cost) VALUES (?, ?, ?, ?)';
    const values = [userId, vehicleId, parkingSpaceId, cost];
    con.query(query, values, (err, result) => {
        if (err) {
            return callback(err, null);
        }
        return callback(null, result);
    });
}

// Helper function to validate IDs
function isValidId(id) {
    return /^[0-9]+$/.test(id);
}

function startParkingFeeTimer() {
    setInterval(() => {
        // Query the database to get all parked vehicles
        con.query('SELECT * FROM parking_records WHERE is_active = ?', [true], (err, result) => {
            if (err) {
                console.error('Error fetching parked vehicles:', err);
            } else {
                const parkedVehicles = JSON.parse(JSON.stringify(result));
                parkedVehicles.forEach((parkedVehicle) => {
                    const currentTime = new Date();
                    const parkedTime = new Date(parkedVehicle.start_time);
                    const elapsedTime = (currentTime - parkedTime) / (1000 * 60 * 60); // Elapsed time in hours
                    const parkingCost = parkedVehicle.cost_per_hour * elapsedTime;

                    // Deduct parking fee from user's balance
                    getCurrentUserBalance(parkedVehicle.user_id, (err, balance) => {
                        if (err) {
                            console.error('Error getting user balance:', err);
                        } else if (balance >= parkingCost) {
                            // Sufficient balance, deduct the fee
                            const newBalance = balance - parkingCost;
                            con.query('UPDATE user_vehicles SET balance = ? WHERE id = ?', [newBalance, parkedVehicle.user_id], (err) => {
                                if (err) {
                                    console.error('Error updating user balance:', err);
                                } else {
                                    // Mark the parking record as inactive
                                    con.query('UPDATE parking_records SET is_active = ? WHERE id = ?', [false, parkedVehicle.id], (err) => {
                                        if (err) {
                                            console.error('Error updating parking record:', err);
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });
    }, 3600000);
}


startParkingFeeTimer();

module.exports = {
    getCurrentUserBalance,
    getParkingSpaceCostById,
    isValidId,
    insertParkingRecord,
    startParkingFeeTimer
};