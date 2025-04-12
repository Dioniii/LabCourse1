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

// GET all users
app.get('/users', authenticateJWT, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM HotelManagement.dbo.users");
    res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REGISTER user
app.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    await pool.request()
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone)
      .input("password", sql.VarChar, hashedPassword)
      .query("INSERT INTO HotelManagement.dbo.users (first_name, last_name, email, phone, password, role) VALUES (@first_name, @last_name, @email, @phone, @password, 'guest')");

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
      .query("SELECT * FROM HotelManagement.dbo.users WHERE email = @email");

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
        role: user.role
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
        role: user.role,
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

    // Kontrollo nëse përdoruesi është admin
    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query("SELECT role FROM HotelManagement.dbo.users WHERE id = @id");

    const currentUserRole = result.recordset[0]?.role;
    if (currentUserRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can change roles" });
    }

    // Gjej rolin aktual të përdoruesit që do të ndryshohet
    const userResult = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT role FROM HotelManagement.dbo.users WHERE id = @id");

    const previousRole = userResult.recordset[0]?.role;

    // Përditëso rolin në tabelën users
    await pool.request()
      .input("id", sql.Int, id)
      .input("role", sql.VarChar, role)
      .query("UPDATE HotelManagement.dbo.users SET role = @role WHERE id = @id");

    // Fshij nga tabela e vjetër e rolit nëse ekziston
    if (previousRole && roleTableMap[previousRole]) {
      await pool.request()
        .input("user_id", sql.Int, id)
        .query(`DELETE FROM HotelManagement.dbo.${roleTableMap[previousRole]} WHERE user_id = @user_id`);
    }

    // Shto në tabelën e re të rolit
    await pool.request()
      .input("user_id", sql.Int, id)
      .query(`INSERT INTO HotelManagement.dbo.${roleTableMap[role]} (user_id) VALUES (@user_id)`);

    res.status(200).json({ success: true, message: "User role updated successfully" });

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

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can create users" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Shto përdoruesin në tabelën users
    const insertResult = await pool.request()
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone || null)
      .input("password", sql.VarChar, hashedPassword)
      .input("role", sql.VarChar, role)
      .query(`
        INSERT INTO HotelManagement.dbo.users 
        (first_name, last_name, email, phone, password, role)
        OUTPUT INSERTED.id
        VALUES (@first_name, @last_name, @email, @phone, @password, @role)
      `);

    const newUserId = insertResult.recordset[0].id;

    // Shto në tabelën përkatëse të rolit
    await pool.request()
      .input("user_id", sql.Int, newUserId)
      .query(`INSERT INTO HotelManagement.dbo.${roleTableMap[role]} (user_id) VALUES (@user_id)`);

    res.status(201).json({ success: true, message: "User created successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/users/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admin can delete users" });
    }

    // Gjej rolin e përdoruesit për të fshirë nga tabela përkatëse
    const roleResult = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT role FROM HotelManagement.dbo.users WHERE id = @id");

    const userRole = roleResult.recordset[0]?.role;

    // Fshij nga tabela role-specifike nëse roli ekziston
    if (userRole && roleTableMap[userRole]) {
      await pool.request()
        .input("user_id", sql.Int, id)
        .query(`DELETE FROM HotelManagement.dbo.${roleTableMap[userRole]} WHERE user_id = @user_id`);
    }

    // Fshij nga tabela users
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM HotelManagement.dbo.users WHERE id = @id");

    res.status(200).json({ success: true, message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// EDIT PROFILE
app.put('/editProfile', authenticateJWT, async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;

    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const pool = await poolPromise;
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

    res.status(200).json({ success: true, message: "Profile updated successfully" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all rooms

app.get("/rooms", authenticateJWT, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT * FROM HotelManagement.dbo.rooms");

    res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});