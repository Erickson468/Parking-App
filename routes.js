const express = require("express");
const { getCurrentUserBalance, getParkingSpaceCostById, isValidId, insertParkingRecord, startParkingFeeTimer } = require('./dbFunctions');
const con = require('./db');
const authenticateToken = require('./authentication');
const authenticateSuperuserToken = require('./superuserAuthentication');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

// POST FUNCTION
router.post('/post', (req, res) => {
    const username = req.body.username;
    const balance = req.body.balance;
    const vehicle_name = req.body.vehicle_name;
    const state_number = req.body.state_number;
    const type = req.body.type;

    con.query('insert into user_vehicles (username, balance, vehicle_name, state_number, type) values(?,?,?,?,?)', [username, balance, vehicle_name, state_number, type], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send("POSTED")
        }
    });
});

// GET BY ID FUNCTION
router.get('/fetchbyid/:id', (req, res) => {
    const fetchid = Number(req.params.id);
    if (isNaN(fetchid)) {
        res.status(400).json({ message: 'Invalid ID provided' });
        return;
    }
    con.query('SELECT * FROM user_vehicles WHERE id=?', fetchid, (err, result) => {
        if (err) {
            console.log(err)
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
        else {
            if (result.length === 0) {
                res.status(404).json({ message: 'No record found for the provided ID' });
                return;
            }
            const value = JSON.parse(JSON.stringify(result));
            console.log(value[0].id);
            console.log(value[0].username);
            console.log(value[0].balance);
            console.log(value[0].vehicle_name);
            console.log(value[0].state_number);
            console.log(value[0].type);
            res.json(value);
        }
    })
});

// GET ALL FUNCTION
router.get('/fetch', authenticateSuperuserToken, (req, res) => {

    con.query('SELECT * FROM user_vehicles', function (err, result, fields) {
        if (err) {
            console.log(err)
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
        else {
            if (result.length === 0) {
                res.json([]);
            }
            const r = JSON.parse(JSON.stringify(result));
            for (let i = 0; i < r.length; i++) {
                console.log(r[i].id);
                console.log(r[i].username);
                console.log(r[i].balance);
                console.log(r[i].vehicle_name);
                console.log(r[i].state_number);
                console.log(r[i].type);
            }
            res.json(r);
        }
    })
});

// EDIT FUNCTION
router.put('/update/:id', authenticateToken, (req, res) => {
    const vehicleId = req.params.id;
    const { username, balance, vehicle_name, state_number, type } = req.body;

    if (req.user.userId !== vehicleId) {
        return res.status(403).json({ message: 'You are not authorized to edit this vehicle' });
    }

    const setClause = [];
    const values = [];

    if (username !== undefined) {
        setClause.push('username = ?');
        values.push(username);
    }

    if (balance !== undefined) {
        setClause.push('balance = ?');
        values.push(balance);
    }

    if (vehicle_name !== undefined) {
        setClause.push('vehicle_name = ?');
        values.push(vehicle_name);
    }

    if (state_number !== undefined) {
        setClause.push('state_number = ?');
        values.push(state_number);
    }

    if (type !== undefined) {
        setClause.push('type = ?');
        values.push(type);
    }


    const query = `
        UPDATE user_vehicles 
        SET 
          ${setClause.join(', ')} 
        WHERE 
          id = ?`;

    values.push(vehicleId);


    con.query(query, values, (error) => {
        if (error) {
            console.error('Error editing vehicle:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }

        return res.json({ message: 'Vehicle edited successfully' });
    });
});

//DELETE FUNCTION
router.delete('/deletedata/:id', authenticateToken, (req, res) => {
    const delid = req.params.id;
    if (req.user.userId !== delid) {
        return res.status(403).json({ message: 'You are not authorized to delete this vehicle' });
    }
    con.query('DELETE FROM user_vehicles WHERE id=?', delid, (err, result) => {
        if (err) {
            console.log(err)
            res.status(500).json({ message: 'Internal server error' });
            return;
        }
        else {
            if (result.affectedRows === 0) {
                res.status(404).json({ message: 'No record found for the provided ID' });
                return;
            }
            res.send("DELETED");
            console.log(result);
        }
    })
})


// SUPERUSER ADD EDIT DELETE Vehicles
router.post('/vehicles', authenticateSuperuserToken, (req, res) => {
    const { action, id, username, balance, vehicle_name, state_number, type } = req.body;

    switch (action) {
        case 'add':
            // new vehicle
            const vehicleDetails = { username, balance, vehicle_name, state_number, type };
            con.query('INSERT INTO user_vehicles SET ?', vehicleDetails, (err, result) => {
                if (err) {
                    console.error('Error adding vehicle:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                return res.json({ message: 'Vehicle added successfully' });
            });
            break;
        case 'edit':
            // Edit vehicle
            const updatedVehicleDetails = { username, balance, vehicle_name, state_number, type };
            con.query('UPDATE user_vehicles SET ? WHERE id = ?', [updatedVehicleDetails, id], (err, result) => {
                if (err) {
                    console.error('Error editing vehicle:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Vehicle not found' });
                }
                return res.json({ message: 'Vehicle edited successfully' });
            });
            break;
        case 'delete':
            // Delete vehicle
            con.query('DELETE FROM user_vehicles WHERE id = ?', id, (err, result) => {
                if (err) {
                    console.error('Error deleting vehicle:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Vehicle not found' });
                }
                return res.json({ message: 'Vehicle deleted successfully' });
            });
            break;
        default:
            return res.status(400).json({ message: 'Invalid action' });
    }
});
// POST PARKING SPACE
router.post('/parking-spaces', authenticateSuperuserToken, (req, res) => {
    const { name, address, price } = req.body;

    if (!req.user.isSuperuser) {
        return res.status(403).json({ message: 'You are not authorized to create parking spaces' });
    }

    con.query('SELECT COUNT(*) AS count FROM parking_spaces WHERE name = ? OR address = ?', [name, address], (err, result) => {
        if (err) {
            console.error('Error checking uniqueness of name and address:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        const count = result[0].count;
        if (count > 0) {
            return res.status(400).json({ message: 'Name or address is already in use' });
        }


        con.query('INSERT INTO parking_spaces (name, address, price) VALUES (?, ?, ?)', [name, address, price], (err, result) => {
            if (err) {
                console.error('Error adding parking space:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }
            return res.json({ message: 'Parking space added successfully' });
        });
    });
});

// EDIT PARKING SPACE
router.put('/parking-spaces/:id', authenticateSuperuserToken, (req, res) => {
    const parkingSpaceId = req.params.id;
    const { name, address, price } = req.body;

    const setClause = [];
    const values = [];

    if (name !== undefined) {
        setClause.push('name = ?');
        values.push(name);
    }

    if (address !== undefined) {
        setClause.push('address = ?');
        values.push(address);
    }

    if (price !== undefined) {
        setClause.push('price = ?');
        values.push(price);
    }

    if (setClause.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    const query = `
        UPDATE parking_spaces 
        SET 
          ${setClause.join(', ')} 
        WHERE 
          id = ?`;

    values.push(parkingSpaceId);

    con.query(query, values, (error, result) => {
        if (error) {
            console.error('Error editing parking space:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Parking space not found' });
        }

        return res.json({ message: 'Parking space edited successfully' });
    });
});

// DELETE PARKING SPACE
router.delete('/delete-spaces/:id', authenticateSuperuserToken, (req, res) => {
    const parkingSpaceIdToDelete = req.params.id;

    con.query('DELETE FROM parking_spaces WHERE id = ?', parkingSpaceIdToDelete, (err, result) => {
        if (err) {
            console.error('Error deleting parking space:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No record found for the provided ID' });
        }

        return res.json({ message: 'Parking space deleted successfully' });
    });
});

// GET ALL PARKING SPACES
router.get('/parking-spaces', authenticateSuperuserToken, (req, res) => {
    con.query('SELECT * FROM parking_spaces', function (err, result, fields) {
        if (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
            return;
        } else {
            if (result.length === 0) {
                res.json([]);
            }
            const r = JSON.parse(JSON.stringify(result));
            for (let i = 0; i < r.length; i++) {
                console.log(r[i].id);
                console.log(r[i].name);
                console.log(r[i].address);
                console.log(r[i].price);
                console.log(r[i].is_occupied);
            }
            res.json(r);
        }
    });
});

// POST PARKING
router.post('/park', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const vehicleId = req.body.vehicleId;
    const parkingSpaceId = req.body.parkingSpaceId;
    const userName = req.user.userName

    if (!isValidId(vehicleId) || !isValidId(parkingSpaceId)) {
        return res.status(400).json({ message: 'Invalid vehicleId or parkingSpaceId provided' });
    }

    
    con.query('SELECT * FROM user_vehicles WHERE id = ? AND username = ?', [vehicleId, userName], (err, result) => {
        if (err) {
            console.error('Error checking ownership of the vehicle:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(403).json({ message: 'You are not authorized to park this vehicle' });
        }

        getParkingSpaceCostById(parkingSpaceId, (err, cost) => {
            if (err) {
                console.error('Error getting parking space cost:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            getCurrentUserBalance(userId, (err, balance) => {
                if (err) {
                    console.error('Error getting user balance:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }

                if (balance < cost) {
                    return res.status(400).json({ message: 'Insufficient balance to park in this space' });
                }

                const startTime = new Date()

                con.query('SELECT is_occupied FROM parking_spaces WHERE id = ?', [parkingSpaceId], (err, result) => {
                    if (err) {
                        console.error('Error checking parking space occupancy:', err);
                        return res.status(500).json({ message: 'Internal server error' });
                    }

                    const isOccupied = result[0].is_occupied;

                    if (isOccupied) {
                        return res.status(400).json({ message: 'Parking space is already occupied' });
                    }


                    con.query('UPDATE parking_spaces SET is_occupied = ? WHERE id = ?', [true, parkingSpaceId], (err, result) => {
                        if (err) {
                            console.error('Error updating parking space occupancy:', err);
                            return res.status(500).json({ message: 'Internal server error' });
                        }

                        insertParkingRecord(userId, vehicleId, parkingSpaceId, cost, startTime, (err, result) => {
                            if (err) {
                                console.error('Error parking vehicle:', err);
                                return res.status(500).json({ message: 'Internal server error' });
                            }

                            return res.json({ message: 'Vehicle parked successfully' });
                        });
                    });
                });
            });
        });
    });
});


// POST RESERVE PARKING SPACE
router.post('/reserve', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const vehicleId = req.body.vehicleId;
    const parkingSpaceId = req.body.parkingSpaceId;
    const reserveTimeStart = new Date(req.body.reserveTimeStart);
    const reserveTimeEnd = new Date(req.body.reserveTimeEnd);

    if (!isValidId(vehicleId) || !isValidId(parkingSpaceId)) {
        return res.status(400).json({ message: 'Invalid vehicleId or parkingSpaceId provided' });
    }

    con.query('SELECT * FROM user_vehicles WHERE id = ? AND username = ?', [vehicleId, userId], (err, result) => {
        if (err) {
            console.error('Error checking ownership of the vehicle:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(403).json({ message: 'You are not authorized to park this vehicle' });
        }

        getParkingSpaceCostById(parkingSpaceId, (err, cost) => {
            if (err) {
                console.error('Error getting parking space cost:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            getCurrentUserBalance(userId, (err, balance) => {
                if (err) {
                    console.error('Error getting user balance:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }

                if (balance < cost) {
                    return res.status(400).json({ message: 'Insufficient balance to reserve in this space' });
                }

                const currentTime = new Date();

                if (currentTime > reserveTimeEnd || currentTime > reserveTimeStart) {
                    return res.status(400).json({ message: 'Invalid reservation time' });
                }

                con.query('SELECT is_occupied, is_reserved FROM parking_spaces WHERE id = ?', [parkingSpaceId], (err, result) => {
                    if (err) {
                        console.error('Error checking parking space occupancy:', err);
                        return res.status(500).json({ message: 'Internal server error' });
                    }

                    const isOccupied = result[0].is_occupied;
                    const isReserved = result[0].is_reserved;

                    if (isOccupied || isReserved) {
                        return res.status(400).json({ message: 'Parking space is already occupied or reserved' });
                    }

                    con.query('UPDATE parking_spaces SET is_reserved = ?, reserved_start_time = ?, reserved_end_time = ? WHERE id = ?', [true, reserveTimeStart, reserveTimeEnd, parkingSpaceId], (err, result) => {
                        if (err) {
                            console.error('Error reserving parking space:', err);
                            return res.status(500).json({ message: 'Internal server error' });
                        }

                        insertParkingRecord(userId, vehicleId, parkingSpaceId, cost, reserveTimeStart, (err, result) => {
                            if (err) {
                                console.error('Error parking vehicle:', err);
                                return res.status(500).json({ message: 'Internal server error' });
                            }

                            return res.json({ message: 'Parking space reserved successfully' });
                        });
                    });
                });
            });
        });
    });
});

// GET OUTDATED PARKED VEHICLES
router.get('/outdated-parked-vehicles', authenticateSuperuserToken, (req, res) => {
    const currentTime = new Date();

    con.query('SELECT * FROM parking_records WHERE end_time < ? AND is_active = ?', [currentTime, true], (err, result) => {
        if (err) {
            console.error('Error fetching outdated parked vehicles:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        const outdatedParkedVehicles = JSON.parse(JSON.stringify(result));
        return res.json(outdatedParkedVehicles);
    });
});

//GET PARKING SPACES STATUS
// router.get('/parking-spaces-status', authenticateSuperuserToken, (req, res) => {
//     con.query('SELECT id, name, address, is_occupied FROM parking_spaces', function (err, result, fields) {
//         if (err) {
//             console.error(err);
//             res.status(500).json({ message: 'Internal server error' });
//             return;
//         } else {
//             if (result.length === 0) {
//                 res.json([]);
//             }
//             const parkingStatus = JSON.parse(JSON.stringify(result));
//             return res.json(parkingStatus);
//         }
//     });
// });

module.exports = router;
