const express = require('express');
const bodyparser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('./db.js');
require("dotenv").config();

const app = express();
app.use(bodyparser.json());
app.use(cors());

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`SERVER IS RUNNING ON ${PORT}`));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function getRequestUserId(pool, req) {
  const requestedId = Number(req.body?.user_id || req.query?.user_id || req.user?.id);
  if (Number.isInteger(requestedId) && requestedId > 0) {
    return requestedId;
  }

  const result = await pool.request().query(`
    SELECT TOP 1 id
    FROM HotelManagement.dbo.users
    ORDER BY id
  `);

  return result.recordset[0]?.id || null;
}

// GET ALL USERS (with role object)
app.get("/users", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT u.id, u.first_name, u.last_name, u.phone, u.email, r.id AS role_id, r.name AS role_name
      FROM HotelManagement.dbo.users u
      JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
    `);

    const users = result.recordset.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      email: user.email,
      role: {
        id: user.role_id,
        name: user.role_name
      }
    }));

    res.json({ success: true, data: users });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REGISTER user (default role: guest)
app.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const pool = await poolPromise;

    const roleResult = await pool.request()
      .input("roleName", sql.VarChar, "guest")
      .query("SELECT id FROM HotelManagement.dbo.roles WHERE name = @roleName");

    const roleId = roleResult.recordset[0]?.id;
    if (!roleId) {
      return res.status(500).json({ success: false, message: "Guest role not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone)
      .input("password", sql.VarChar, hashedPassword)
      .input("role_id", sql.Int, roleId)
      .query(`
        INSERT INTO HotelManagement.dbo.users 
        (first_name, last_name, email, phone, password, role_id) 
        VALUES (@first_name, @last_name, @email, @phone, @password, @role_id)
      `);

    // Add to guest table
    await pool.request()
      .input("email", sql.VarChar, email)
      .query(`
        INSERT INTO HotelManagement.dbo.guests (user_id)
        SELECT id FROM HotelManagement.dbo.users WHERE email = @email
      `);

    res.status(201).json({ success: true, message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SIGN IN
app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input("email", sql.VarChar, email)
      .query(`
        SELECT u.*, r.name AS role_name
        FROM HotelManagement.dbo.users u
        JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
        WHERE u.email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "User doesn't exist" });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Password is incorrect" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role_name
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      message: "User authenticated successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role_name,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const roleTableMap = {
  admin: "admin",
  guest: "guest",
  cleaner: "cleaner"
};

async function getUserRoleNameById(pool, userId) {
  const result = await pool.request()
    .input("id", sql.Int, userId)
    .query(`
      SELECT r.name AS role_name
      FROM HotelManagement.dbo.users u
      JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
      WHERE u.id = @id
    `);
  return result.recordset[0]?.role_name;
}

async function getRoleIdByName(pool, roleName) {
  const result = await pool.request()
    .input("roleName", sql.VarChar, roleName)
    .query("SELECT id FROM HotelManagement.dbo.roles WHERE name = @roleName");
  return result.recordset[0]?.id;
}

// UPDATE USER ROLE (admin only)
app.put("/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = Object.keys(roleTableMap);

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    const pool = await poolPromise;

    const previousRole = await getUserRoleNameById(pool, id);
    const newRoleId = await getRoleIdByName(pool, role);

    if (!newRoleId) {
      return res.status(400).json({ success: false, message: "Role not found" });
    }

    // Përditëso rolin në databazë
    await pool.request()
      .input("id", sql.Int, id)
      .input("role_id", sql.Int, newRoleId)
      .query("UPDATE HotelManagement.dbo.users SET role_id = @role_id WHERE id = @id");

    if (previousRole && roleTableMap[previousRole]) {
      await pool.request()
        .input("user_id", sql.Int, id)
        .query(`DELETE FROM HotelManagement.dbo.${roleTableMap[previousRole]} WHERE user_id = @user_id`);
    }

    await pool.request()
      .input("user_id", sql.Int, id)
      .query(`INSERT INTO HotelManagement.dbo.${roleTableMap[role]} (user_id) VALUES (@user_id)`);

    const updatedUser = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT u.id, u.first_name, u.last_name, u.phone, r.id AS role_id, r.name AS role_name
        FROM HotelManagement.dbo.users u
        JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
        WHERE u.id = @id
      `);

    res.status(200).json({ success: true, message: "User role updated successfully", user: updatedUser.recordset[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADMIN CREATE USER
app.post("/users", async (req, res) => {
  const { first_name, last_name, email, phone, password, role } = req.body;
  const validRoles = Object.keys(roleTableMap);

  if (!first_name || !last_name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "All fields except phone are required" });
  }

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    const pool = await poolPromise;

    const roleId = await getRoleIdByName(pool, role);
    if (!roleId) {
      return res.status(400).json({ success: false, message: "Role not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.request()
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone || null)
      .input("password", sql.VarChar, hashedPassword)
      .input("role_id", sql.Int, roleId)
      .query(`
        INSERT INTO HotelManagement.dbo.users 
        (first_name, last_name, email, phone, password, role_id)
        OUTPUT INSERTED.id
        VALUES (@first_name, @last_name, @email, @phone, @password, @role_id)
      `);

    const newUserId = insertResult.recordset[0].id;

    await pool.request()
      .input("user_id", sql.Int, newUserId)
      .query(`INSERT INTO HotelManagement.dbo.${roleTableMap[role]} (user_id) VALUES (@user_id)`);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: newUserId,
          first_name,
          last_name,
          email,
          phone,
          role: {
            id: roleId,
            name: role
          }
        }
      });      

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE USER
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM HotelManagement.dbo.users WHERE id = @id");

    res.status(200).json({ success: true, message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/me', async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = await getRequestUserId(pool, req);
    
    const result = await pool.request()
      .input("id", sql.Int, userId)
      .query(`
        SELECT 
          u.first_name, 
          u.last_name, 
          u.email, 
          u.phone, 
          r.name AS role
        FROM HotelManagement.dbo.users u
        JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
        WHERE u.id = @id
      `);

    res.status(200).json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/editProfile', async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;

    // Validimi bazik
    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const pool = await poolPromise;
    const userId = await getRequestUserId(pool, req);

    // Përditëso të dhënat në databazë
    await pool.request()
      .input("id", sql.Int, userId)
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone)
      .query(`
        UPDATE HotelManagement.dbo.users
        SET first_name = @first_name,
            last_name = @last_name,
            email = @email,
            phone = @phone
        WHERE id = @id
      `);

    // Merr të dhënat e rifreskuara për ta kthyer si përgjigje
    const updatedUser = await pool.request()
      .input("id", sql.Int, userId)
      .query(`
        SELECT 
          u.first_name, 
          u.last_name, 
          u.email, 
          u.phone, 
          r.name AS role
        FROM HotelManagement.dbo.users u
        JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
        WHERE u.id = @id
      `);

    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully",
      data: updatedUser.recordset[0] 
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all room categories
app.get("/room-categories", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM HotelManagement.dbo.room_categories
    `);

    res.status(200).json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all room statuses
app.get("/room-statuses", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM HotelManagement.dbo.room_statuses
    `);

    res.status(200).json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all rooms
app.get("/rooms", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        r.id, r.room_number, r.price, r.maintenance_notes,
        r.category_id, c.name AS category_name,
        r.status_id, s.name AS status_name
      FROM HotelManagement.dbo.rooms r
      LEFT JOIN HotelManagement.dbo.room_categories c ON r.category_id = c.id
      LEFT JOIN HotelManagement.dbo.room_statuses s ON r.status_id = s.id
    `);

    console.log('Rooms from DB:', result.recordset); 

    res.status(200).json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update room category and status
app.put("/rooms/:id", async (req, res) => {
  const { id } = req.params;
  const { category_id, status_id, maintenance_notes, price } = req.body;

  try {
    const pool = await poolPromise;

    // Kontrollo nëse dhoma ekziston
    const checkResult = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM HotelManagement.dbo.rooms WHERE id = @id");

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // Përditëso dhomën
    await pool.request()
      .input("id", sql.Int, id)
      .input("category_id", sql.Int, category_id)
      .input("status_id", sql.Int, status_id)
      .input("maintenance_notes", sql.VarChar, maintenance_notes)
      .input("price", sql.Decimal(10, 2), price)
      .query(`
        UPDATE HotelManagement.dbo.rooms 
        SET category_id = @category_id, 
            status_id = @status_id, 
            maintenance_notes = @maintenance_notes,
            price = @price
        WHERE id = @id
      `);

    // Kthe të dhënat e reja
    const updatedRoom = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          r.*, 
          c.name AS category_name, 
          s.name AS status_name
        FROM HotelManagement.dbo.rooms r
        LEFT JOIN HotelManagement.dbo.room_categories c ON r.category_id = c.id
        LEFT JOIN HotelManagement.dbo.room_statuses s ON r.status_id = s.id
        WHERE r.id = @id
      `);

    res.status(200).json({ 
      success: true, 
      message: "Room updated successfully",
      data: updatedRoom.recordset[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE ROOM
app.post("/rooms", async (req, res) => {
  const { room_number, category_id, price, status_id, maintenance_notes } = req.body;

  if (!room_number || !category_id || !price) {
    return res.status(400).json({ success: false, message: "room_number, category_id, and price are required" });
  }

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("room_number", sql.VarChar, room_number)
      .input("category_id", sql.Int, category_id)
      .input("price", sql.Decimal(10, 2), price)
      .input("status_id", sql.Int, status_id || 8) // default: Available (id: 8)
      .input("maintenance_notes", sql.VarChar, maintenance_notes || null)
      .query(`
        INSERT INTO HotelManagement.dbo.rooms 
        (room_number, category_id, price, status_id, maintenance_notes)
        VALUES (@room_number, @category_id, @price, @status_id, @maintenance_notes)
      `);

    res.status(201).json({ success: true, message: "Room created successfully" });

  } catch (error) {
    if (error.originalError?.info?.number === 2627) {
      res.status(400).json({ success: false, message: "Room number already exists" });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// DELETE ROOM
app.delete("/rooms/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    const checkResult = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM HotelManagement.dbo.rooms WHERE id = @id");

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM HotelManagement.dbo.rooms WHERE id = @id");

    res.status(200).json({ success: true, message: "Room deleted successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADMIN UPDATE USER
app.put("/users/:id", async (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, phone, role } = req.body;
  const validRoles = Object.keys(roleTableMap);

  if (!first_name || !last_name || !email || !role) {
    return res.status(400).json({ success: false, message: "All fields except phone are required" });
  }

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    const pool = await poolPromise;

    const roleId = await getRoleIdByName(pool, role);
    if (!roleId) {
      return res.status(400).json({ success: false, message: "Role not found" });
    }

    // Get the user's current role
    const currentUser = await pool.request()
      .input("userId", sql.Int, userId)
      .query("SELECT role_id FROM HotelManagement.dbo.users WHERE id = @userId");

    if (currentUser.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const currentRoleId = currentUser.recordset[0].role_id;

    // Update user information
    await pool.request()
      .input("userId", sql.Int, userId)
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone || null)
      .input("role_id", sql.Int, roleId)
      .query(`
        UPDATE HotelManagement.dbo.users 
        SET first_name = @first_name,
            last_name = @last_name,
            email = @email,
            phone = @phone,
            role_id = @role_id
        WHERE id = @userId
      `);

    // If role has changed, update the role-specific tables
    if (currentRoleId !== roleId) {
      // Get the old role name
      const oldRoleResult = await pool.request()
        .input("roleId", sql.Int, currentRoleId)
        .query("SELECT name FROM HotelManagement.dbo.roles WHERE id = @roleId");
      
      const oldRoleName = oldRoleResult.recordset[0]?.name;

      // Remove from old role table if it exists
      if (oldRoleName && roleTableMap[oldRoleName]) {
        await pool.request()
          .input("userId", sql.Int, userId)
          .query(`DELETE FROM HotelManagement.dbo.${roleTableMap[oldRoleName]} WHERE user_id = @userId`);
      }

      // Add to new role table
      await pool.request()
        .input("userId", sql.Int, userId)
        .query(`INSERT INTO HotelManagement.dbo.${roleTableMap[role]} (user_id) VALUES (@userId)`);
    }

    // Get the updated user data
    const updatedUser = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          r.id as role_id,
          r.name as role_name
        FROM HotelManagement.dbo.users u
        JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
        WHERE u.id = @userId
      `);

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser.recordset[0].id,
        first_name: updatedUser.recordset[0].first_name,
        last_name: updatedUser.recordset[0].last_name,
        email: updatedUser.recordset[0].email,
        phone: updatedUser.recordset[0].phone,
        role: {
          id: updatedUser.recordset[0].role_id,
          name: updatedUser.recordset[0].role_name
        }
      }
    });

  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cleaners
app.get('/cleaners', async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
      SELECT 
      u.id, 
      u.first_name, 
      u.last_name, 
      r.name AS role,
      c.hired_date
      FROM HotelManagement.dbo.users u
      INNER JOIN HotelManagement.dbo.roles r ON u.role_id = r.id
      LEFT JOIN HotelManagement.dbo.cleaners c ON u.id = c.user_id 
      WHERE r.name = 'cleaner'
      ORDER BY c.hired_date DESC;
    `;

    const result = await pool.request().query(query);

    console.log("Cleaners:", result.recordset);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error fetching cleaners:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET ALL BOOKINGS
app.get("/api/bookings", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        b.id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.booking_date,
        b.total_amount,
        b.number_of_guests,
        b.special_requests,
        b.notes,
        bs.name AS status_name,
        u.first_name + ' ' + u.last_name AS user_name,
        u.email AS guest_email,
        r.room_number
      FROM HotelManagement.dbo.bookings b
      LEFT JOIN HotelManagement.dbo.booking_statuses bs ON b.status_id = bs.id
      LEFT JOIN HotelManagement.dbo.users u ON b.user_id = u.id
      LEFT JOIN HotelManagement.dbo.rooms r ON b.room_id = r.id
      ORDER BY b.booking_date DESC
    `);

    res.status(200).json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST CREATE BOOKING (with Stripe payment session)
app.post("/api/bookings", async (req, res) => {
  try {
    const { room_id, check_in_date, check_out_date, number_of_guests, price, special_requests } = req.body;

    if (!room_id || !check_in_date || !check_out_date || !number_of_guests) {
      return res.status(400).json({ 
        success: false, 
        message: "room_id, check_in_date, check_out_date, and number_of_guests are required" 
      });
    }

    const pool = await poolPromise;
    const userId = await getRequestUserId(pool, req);
    
    // Get room price if not provided
    let roomPrice = price;
    if (!roomPrice) {
      const roomResult = await pool.request()
        .input("room_id", sql.Int, room_id)
        .query("SELECT price FROM HotelManagement.dbo.rooms WHERE id = @room_id");
      
      if (roomResult.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Room not found" });
      }
      roomPrice = roomResult.recordset[0].price;
    }

    // Calculate total amount (price per night * number of nights)
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = parseFloat(roomPrice) * nights;

    // Get default status_id for 'Pending'
    const statusResult = await pool.request()
      .query("SELECT id FROM HotelManagement.dbo.booking_statuses WHERE name = 'Pending'");
    
    const statusId = statusResult.recordset[0]?.id || 2; // Default to 2 if Pending not found

    // Create booking
    const insertResult = await pool.request()
      .input("user_id", sql.Int, userId)
      .input("room_id", sql.Int, room_id)
      .input("check_in_date", sql.Date, check_in_date)
      .input("check_out_date", sql.Date, check_out_date)
      .input("number_of_guests", sql.Int, number_of_guests)
      .input("total_amount", sql.Decimal(10, 2), totalAmount)
      .input("status_id", sql.Int, statusId)
      .input("special_requests", sql.VarChar, special_requests || null)
      .query(`
        INSERT INTO HotelManagement.dbo.bookings 
        (user_id, room_id, check_in_date, check_out_date, number_of_guests, total_amount, status_id, special_requests)
        OUTPUT INSERTED.id
        VALUES (@user_id, @room_id, @check_in_date, @check_out_date, @number_of_guests, @total_amount, @status_id, @special_requests)
      `);

    const bookingId = insertResult.recordset[0].id;

    // Check if Stripe is configured
    const stripe = require('stripe');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (stripeKey) {
      try {
        const stripeInstance = stripe(stripeKey);
        const session = await stripeInstance.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Hotel Booking #${bookingId}`,
                description: `Room booking from ${check_in_date} to ${check_out_date}`,
              },
              unit_amount: Math.round(totalAmount * 100), // Convert to cents
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bookings?success=true`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bookings?canceled=true`,
          metadata: {
            booking_id: bookingId.toString(),
          },
        });

        res.status(200).json({ 
          success: true, 
          message: "Booking created successfully",
          booking_id: bookingId,
          session_id: session.id 
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        // Still return success with booking_id even if Stripe fails
        res.status(200).json({ 
          success: true, 
          message: "Booking created but payment session failed",
          booking_id: bookingId,
          session_id: null
        });
      }
    } else {
      // No Stripe configured, just return the booking
      res.status(200).json({ 
        success: true, 
        message: "Booking created successfully",
        booking_id: bookingId,
        session_id: null
      });
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
/////////////////////////////////////////////////////////////

// Get all fabrika
app.get('/api/fabrikas', async (_req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT FabrikaID, Emri, Lokacioni, Shteti
      FROM HotelManagement.dbo.Fabrika
      ORDER BY FabrikaID
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create fabrika
app.post('/api/fabrikas', async (req, res) => {
  try {
    const { FabrikaID, Emri, Lokacioni, Shteti } = req.body;
    if (FabrikaID == null || !Emri || !Lokacioni || !Shteti) {
      return res.status(400).json({ message: 'FabrikaID and Name are required' });
    }
    const pool = await poolPromise;
    await pool.request()
      .input('FabrikaID', sql.Int, FabrikaID)
      .input('Emri', sql.VarChar(100), Emri)
      .input('Lokacioni', sql.VarChar(100), Lokacioni)
      .input('Shteti', sql.VarChar(100), Shteti)
      .query(`
        INSERT INTO HotelManagement.dbo.Fabrika (FabrikaID, Emri, Lokacioni, Shteti)
        VALUES (@FabrikaID, @Emri, @Lokacioni, @Shteti)
      `);
    res.status(201).json({ message: 'Fabrika created' });
  } catch (error) {
    if (error.originalError?.info?.number === 2627) {
      return res.status(400).json({ message: 'Fabrika ID' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update fabrika
app.put('/api/fabrikas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Emri, Lokacioni, Shteti } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('FabrikaID', sql.Int, Number(id))
      .input('Emri', sql.VarChar(100), Emri)
      .input('Lokacioni', sql.VarChar(100), Lokacioni)
      .input('Shteti', sql.VarChar(100), Shteti)
      .query(`
        UPDATE HotelManagement.dbo.Fabrika
        SET Emri=@Emri, Lokacioni=@Lokacioni, Shteti=@Shteti
        WHERE FabrikaID=@FabrikaID
      `);
    res.json({ message: 'Fabrika updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete fabrika
app.delete('/api/fabrikas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('FabrikaID', sql.Int, Number(id))
      .query(`
        UPDATE HotelManagement.dbo.Roboti SET FabrikaID = NULL WHERE FabrikaID=@FabrikaID;
        DELETE FROM HotelManagement.dbo.Fabrika WHERE FabrikaID=@FabrikaID;
      `);
    res.json({ message: 'Fabrika deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get roboti
app.get('/api/robotis', async (_req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT l.RobotiID, l.Emri, l.Modeli, l.VitiProdhimit, g.FabrikaID
      FROM HotelManagement.dbo.Roboti l
      LEFT JOIN HotelManagement.dbo.Fabrika g ON l.FabrikaID = g.FabrikaID
      ORDER BY l.RobotiID
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create roboti
app.post('/api/robotis', async (req, res) => {
  try {
    const { RobotiID, Emri, Modeli, VitiProdhimit, FabrikaID } = req.body;
    if (RobotiID == null || !Emri || !Modeli || !VitiProdhimit) {
      return res.status(400).json({ message: 'RobotiID and Title are required' });
    }
    const pool = await poolPromise;
    await pool.request()
      .input('RobotiID', sql.Int, RobotiID)
      .input('Emri', sql.VarChar(100), Emri)
      .input('Modeli', sql.VarChar(100), Modeli)
      .input('VitiProdhimit', sql.VarChar(100), VitiProdhimit)
      .input('FabrikaID', sql.Int, FabrikaID || null)
      .query(`
        INSERT INTO HotelManagement.dbo.Roboti (RobotiID, Emri, Modeli,VitiProdhimit, FabrikaID)
        VALUES (@RobotiID, @Emri, @Modeli, @VitiProdhimit, @FabrikaID)
      `);
    res.status(201).json({ message: 'Roboti created' });
  } catch (error) {
    if (error.originalError?.info?.number === 2627) {
      return res.status(400).json({ message: 'Duplicate RobotiID' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update roboti
app.put('/api/robotis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Emri, Modeli,VitiProdhimit, FabrikaID } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('RobotiID', sql.Int, Number(id))
      .input('Emri', sql.VarChar(100), Emri)
      .input('Modeli', sql.VarChar(100), Modeli)
      .input('VitiProdhimit', sql.VarChar(100), VitiProdhimit)
      .input('FabrikaID', sql.Int, FabrikaID || null)
      .query(`
        UPDATE HotelManagement.dbo.Roboti
        SET Emri=@Emri, Modeli=@Modeli,VitiProdhimit=@VitiProdhimit, FabrikaID=@FabrikaID
        WHERE RobotiID=@RobotiID
      `);
    res.json({ message: 'Roboti updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete roboti
app.delete('/api/robotis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('RobotiID', sql.Int, Number(id))
      .query('DELETE FROM HotelManagement.dbo.Roboti WHERE RobotiID=@RobotiID');
    res.json({ message: 'Roboti deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
