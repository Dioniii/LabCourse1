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
        INSERT INTO HotelManagement.dbo.guest (user_id)
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
    res.status(500).json({ success: false, error: error.message });
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

// Get all rooms
app.get("/rooms", authenticateJWT, async (req, res) => {
  try {

    if (req.user.role === "guest") {
      return res.status(403).json({ success: false, message: "Guests are not allowed to view rooms." });
    }
    
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT * FROM HotelManagement.dbo.rooms");

    res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update room category and status
app.put("/rooms/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { category, status, maintenance_notes } = req.body;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("id", id)
      .input("category", category)
      .input("status", status)
      .input("maintenance_notes", maintenance_notes)
      .query(`
        UPDATE HotelManagement.dbo.rooms 
        SET category = @category, status = @status, maintenance_notes = @maintenance_notes
        WHERE id = @id
      `);

    res.status(200).json({ success: true, message: "Room updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE ROOM
app.post("/rooms", authenticateJWT, async (req, res) => {
  const { room_number, category, price, status, maintenance_notes } = req.body;
  const validCategories = ["Standard", "Deluxe", "Suite"];
  const validStatuses = ["Available", "Occupied", "Maintenance"];

  if (!room_number || !category || !price) {
    return res.status(400).json({ success: false, message: "room_number, category, and price are required" });
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, message: "Invalid category" });
  }

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const pool = await poolPromise;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can create rooms" });
    }

    await pool.request()
      .input("room_number", sql.VarChar, room_number)
      .input("category", sql.VarChar, category)
      .input("price", sql.Decimal(10, 2), price)
      .input("status", sql.VarChar, status || "Available")
      .input("maintenance_notes", sql.VarChar, maintenance_notes || null)
      .query(`
        INSERT INTO HotelManagement.dbo.rooms 
        (room_number, category, price, status, maintenance_notes)
        VALUES (@room_number, @category, @price, @status, @maintenance_notes)
      `);

    res.status(201).json({ success: true, message: "Room created successfully" });

  } catch (error) {
    if (error.originalError?.info?.number === 2627) { // duplicate key
      res.status(400).json({ success: false, message: "Room number already exists" });
    } else {
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
