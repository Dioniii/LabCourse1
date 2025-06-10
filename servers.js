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

// JWT Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET ALL USERS (with role object)
app.get("/users", authenticateJWT, async (req, res) => {
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
app.put("/users/:id/role", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = Object.keys(roleTableMap);

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    const pool = await poolPromise;

    const currentUserRole = await getUserRoleNameById(pool, req.user.id);
    if (currentUserRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can change roles" });
    }

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
app.post("/users", authenticateJWT, async (req, res) => {
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

    const currentUserRole = await getUserRoleNameById(pool, req.user.id);
    if (currentUserRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can create users" });
    }

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
app.delete("/users/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    const currentUserRole = await getUserRoleNameById(pool, req.user.id);
    if (currentUserRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can delete users" });
    }

    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM HotelManagement.dbo.users WHERE id = @id");

    res.status(200).json({ success: true, message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/me', authenticateJWT, async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
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

app.put('/editProfile', authenticateJWT, async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;

    // Validimi bazik
    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const pool = await poolPromise;

    // Përditëso të dhënat në databazë
    await pool.request()
      .input("id", sql.Int, req.user.id)
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
      .input("id", sql.Int, req.user.id)
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
app.get("/room-categories", authenticateJWT, async (req, res) => {
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
app.get("/room-statuses", authenticateJWT, async (req, res) => {
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
app.get("/rooms", authenticateJWT, async (req, res) => {
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
app.put("/rooms/:id", authenticateJWT, async (req, res) => {
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
app.post("/rooms", authenticateJWT, async (req, res) => {
  const { room_number, category_id, price, status_id, maintenance_notes } = req.body;

  if (!room_number || !category_id || !price) {
    return res.status(400).json({ success: false, message: "room_number, category_id, and price are required" });
  }

  try {
    const pool = await poolPromise;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can create rooms" });
    }

    // Get the Available status ID if status_id is not provided
    let finalStatusId = status_id;
    if (!finalStatusId) {
      const statusResult = await pool.request()
        .input("statusName", sql.VarChar, "Available")
        .query("SELECT id FROM HotelManagement.dbo.room_statuses WHERE name = @statusName");
      
      if (!statusResult.recordset[0]) {
        return res.status(500).json({ success: false, message: "Available status not found in room_statuses" });
      }
      finalStatusId = statusResult.recordset[0].id;
    }

    await pool.request()
      .input("room_number", sql.VarChar, room_number)
      .input("category_id", sql.Int, category_id)
      .input("price", sql.Decimal(10, 2), price)
      .input("status_id", sql.Int, finalStatusId)
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
      console.error("Error creating room:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// DELETE ROOM
app.delete("/rooms/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can delete rooms" });
    }

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
app.put("/users/:id", authenticateJWT, async (req, res) => {
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

    const currentUserRole = await getUserRoleNameById(pool, req.user.id);
    if (currentUserRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can update users" });
    }

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

// GET ROOM AVAILABILITY
app.get("/api/rooms/availability", authenticateJWT, async (req, res) => {
  try {
    const { start_date, end_date, room_category } = req.query;
    const pool = await poolPromise;

    let query = `
      SELECT 
        r.id,
        r.number,
        r.category_id,
        rc.name as category_name,
        rc.rate,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM HotelManagement.dbo.bookings b
            WHERE b.room_id = r.id
            AND b.status_id != (SELECT id FROM HotelManagement.dbo.booking_statuses WHERE name = 'Cancelled')
            AND (
              (b.check_in_date <= @end_date AND b.check_out_date >= @start_date)
            )
          ) THEN 'booked'
          ELSE 'available'
        END as status
      FROM HotelManagement.dbo.rooms r
      JOIN HotelManagement.dbo.room_categories rc ON r.category_id = rc.id
      WHERE r.status_id != (SELECT id FROM HotelManagement.dbo.room_statuses WHERE name = 'Maintenance')
    `;

    if (room_category) {
      query += ` AND rc.name = @room_category`;
    }

    const result = await pool.request()
      .input("start_date", sql.Date, start_date)
      .input("end_date", sql.Date, end_date)
      .input("room_category", sql.VarChar, room_category)
      .query(query);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET BOOKING STATUSES
app.get("/api/booking-statuses", authenticateJWT, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, name
      FROM HotelManagement.dbo.booking_statuses
      ORDER BY id
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ALL BOOKINGS
app.get("/api/bookings", authenticateJWT, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        b.id,
        b.user_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.booking_date,
        b.status_id,
        b.total_amount,
        b.number_of_guests,
        b.special_requests,
        b.notes,
        b.created_at,
        b.updated_at,
        u.first_name + ' ' + u.last_name as user_name,
        u.email as guest_email,
        r.room_number,
        r.price as room_price,
        rc.name as room_category,
        bs.name as status_name
      FROM HotelManagement.dbo.bookings b
      JOIN HotelManagement.dbo.users u ON b.user_id = u.id
      JOIN HotelManagement.dbo.rooms r ON b.room_id = r.id
      JOIN HotelManagement.dbo.room_categories rc ON r.category_id = rc.id
      JOIN HotelManagement.dbo.booking_statuses bs ON b.status_id = bs.id
      ORDER BY b.created_at DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET BOOKING BY ID
app.get("/api/bookings/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          b.*,
          u.first_name + ' ' + u.last_name as user_name,
          u.email as guest_email,
          r.room_number,
          r.price as room_price,
          rc.name as room_category,
          bs.name as status_name
        FROM HotelManagement.dbo.bookings b
        JOIN HotelManagement.dbo.users u ON b.user_id = u.id
        JOIN HotelManagement.dbo.rooms r ON b.room_id = r.id
        JOIN HotelManagement.dbo.room_categories rc ON r.category_id = rc.id
        JOIN HotelManagement.dbo.booking_statuses bs ON b.status_id = bs.id
        WHERE b.id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE NEW BOOKING
app.post("/api/bookings", authenticateJWT, async (req, res) => {
  try {
    const {
      room_id,
      check_in_date,
      check_out_date,
      number_of_guests,
      special_requests
    } = req.body;
    if (!room_id || !check_in_date || !check_out_date || !number_of_guests) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: room_id, check_in_date, check_out_date, number_of_guests"
      });
    }
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past"
      });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date"
      });
    }
    const pool = await poolPromise;
    // Get room and price
    const roomCheck = await pool.request()
      .input("room_id", sql.Int, room_id)
      .query(`SELECT * FROM HotelManagement.dbo.rooms WHERE id = @room_id`);
    if (roomCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    // Check room availability
    const availabilityCheck = await pool.request()
      .input("room_id", sql.Int, room_id)
      .input("check_in_date", sql.Date, check_in_date)
      .input("check_out_date", sql.Date, check_out_date)
      .query(`
        SELECT COUNT(*) as booking_count
        FROM HotelManagement.dbo.bookings
        WHERE room_id = @room_id
        AND status_id != (SELECT id FROM HotelManagement.dbo.booking_statuses WHERE name = 'Cancelled')
        AND (
          (check_in_date <= @check_out_date AND check_out_date >= @check_in_date)
        )
      `);
    if (availabilityCheck.recordset[0].booking_count > 0) {
      return res.status(400).json({
        success: false,
        message: "Room is not available for the selected dates"
      });
    }
    // Calculate total amount using rooms.price
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const total_amount = days * parseFloat(roomCheck.recordset[0].price);
    // Get pending status ID
    const statusResult = await pool.request()
      .input("statusName", sql.VarChar, "Pending")
      .query("SELECT id FROM HotelManagement.dbo.booking_statuses WHERE name = @statusName");
    const statusId = statusResult.recordset[0]?.id;
    if (!statusId) {
      return res.status(500).json({ success: false, message: "Booking status not found" });
    }
    // Create booking
    const result = await pool.request()
      .input("user_id", sql.Int, req.user.id)
      .input("room_id", sql.Int, room_id)
      .input("check_in_date", sql.Date, check_in_date)
      .input("check_out_date", sql.Date, check_out_date)
      .input("status_id", sql.Int, statusId)
      .input("total_amount", sql.Decimal(10, 2), total_amount)
      .input("number_of_guests", sql.Int, number_of_guests)
      .input("special_requests", sql.VarChar(sql.MAX), special_requests)
      .query(`
        INSERT INTO HotelManagement.dbo.bookings
        (user_id, room_id, check_in_date, check_out_date, status_id, total_amount, number_of_guests, special_requests, booking_date)
        VALUES (@user_id, @room_id, @check_in_date, @check_out_date, @status_id, @total_amount, @number_of_guests, @special_requests, GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    const bookingId = result.recordset[0].id;
    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: { id: bookingId }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE BOOKING
app.put("/api/bookings/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    let {
      room_id,
      check_in_date,
      check_out_date,
      status_id,
      number_of_guests,
      special_requests,
      notes
    } = req.body;
    const pool = await poolPromise;
    // Get booking and room price
    const bookingCheck = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT b.*, r.price as room_price
        FROM HotelManagement.dbo.bookings b
        JOIN HotelManagement.dbo.rooms r ON b.room_id = r.id
        WHERE b.id = @id
      `);
    if (bookingCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (req.user.role !== "admin" && bookingCheck.recordset[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this booking" });
    }
    // If dates or room changed, check availability
    if (check_in_date || check_out_date || room_id) {
      const availabilityCheck = await pool.request()
        .input("room_id", sql.Int, room_id || bookingCheck.recordset[0].room_id)
        .input("check_in_date", sql.Date, check_in_date || bookingCheck.recordset[0].check_in_date)
        .input("check_out_date", sql.Date, check_out_date || bookingCheck.recordset[0].check_out_date)
        .input("booking_id", sql.Int, id)
        .query(`
          SELECT COUNT(*) as booking_count
          FROM HotelManagement.dbo.bookings
          WHERE room_id = @room_id
          AND id != @booking_id
          AND status_id != (SELECT id FROM HotelManagement.dbo.booking_statuses WHERE name = 'Cancelled')
          AND (
            (check_in_date <= @check_out_date AND check_out_date >= @check_in_date)
          )
        `);
      if (availabilityCheck.recordset[0].booking_count > 0) {
        return res.status(400).json({
          success: false,
          message: "Room is not available for the selected dates"
        });
      }
    }
    // Calculate new total amount if dates or room changed
    let total_amount = bookingCheck.recordset[0].total_amount;
    let price = bookingCheck.recordset[0].room_price;
    if (check_in_date || check_out_date || room_id) {
      // If room changed, get new price
      if (room_id && room_id !== bookingCheck.recordset[0].room_id) {
        const newRoom = await pool.request()
          .input("room_id", sql.Int, room_id)
          .query(`SELECT price FROM HotelManagement.dbo.rooms WHERE id = @room_id`);
        if (newRoom.recordset.length === 0) {
          return res.status(404).json({ success: false, message: "Room not found" });
        }
        price = newRoom.recordset[0].price;
      }
      const checkIn = new Date(check_in_date || bookingCheck.recordset[0].check_in_date);
      const checkOut = new Date(check_out_date || bookingCheck.recordset[0].check_out_date);
      const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      total_amount = days * parseFloat(price);
    }
    // Use current status_id if not provided
    if (!status_id) {
      status_id = bookingCheck.recordset[0].status_id;
    }
    // Update booking
    await pool.request()
      .input("id", sql.Int, id)
      .input("room_id", sql.Int, room_id)
      .input("check_in_date", sql.Date, check_in_date)
      .input("check_out_date", sql.Date, check_out_date)
      .input("status_id", sql.Int, status_id)
      .input("total_amount", sql.Decimal(10, 2), total_amount)
      .input("number_of_guests", sql.Int, number_of_guests)
      .input("special_requests", sql.VarChar(sql.MAX), special_requests)
      .input("notes", sql.VarChar(sql.MAX), notes)
      .query(`
        UPDATE HotelManagement.dbo.bookings
        SET 
          room_id = @room_id,
          check_in_date = @check_in_date,
          check_out_date = @check_out_date,
          status_id = @status_id,
          total_amount = @total_amount,
          number_of_guests = @number_of_guests,
          special_requests = @special_requests,
          notes = @notes,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({
      success: true,
      message: "Booking updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE BOOKING (Hard delete)
app.delete("/api/bookings/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const bookingCheck = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM HotelManagement.dbo.bookings WHERE id = @id");
    if (bookingCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (req.user.role !== "admin" && bookingCheck.recordset[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this booking" });
    }
    // Hard delete the booking
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM HotelManagement.dbo.bookings WHERE id = @id");
    res.json({
      success: true,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET USER'S BOOKINGS
app.get("/api/my-bookings", authenticateJWT, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("user_id", sql.Int, req.user.id)
      .query(`
        SELECT 
          b.id,
          b.room_id,
          b.check_in_date,
          b.check_out_date,
          b.booking_date,
          b.status_id,
          b.total_amount,
          b.number_of_guests,
          b.special_requests,
          b.notes,
          b.created_at,
          b.updated_at,
          r.room_number,
          r.price as room_price,
          rc.name as room_category,
          bs.name as status_name
        FROM HotelManagement.dbo.bookings b
        JOIN HotelManagement.dbo.rooms r ON b.room_id = r.id
        JOIN HotelManagement.dbo.room_categories rc ON r.category_id = rc.id
        JOIN HotelManagement.dbo.booking_statuses bs ON b.status_id = bs.id
        WHERE b.user_id = @user_id
        ORDER BY b.created_at DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});