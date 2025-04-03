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

// SHOW ALL USERS API - Kontrollim i lidhjes me databaz

app.get("/users", async(req,res) =>{
    try{
        const pool = await poolPromise;
        const result = await pool.request().query(
            "Select * from HotelManagement.dbo.users"
        );
        res.status(200).json({
            success: true,
            data: result.recordset
        });
    }catch(error){
        res.status(404).json({
            success:false,
            error: error.message
        })
    }
})

// register user api

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
            .query("INSERT INTO HotelManagement.dbo.users (first_name, last_name, email, phone, password) VALUES (@first_name, @last_name, @email, @phone, @password)");

        res.status(201).json({ success: true, message: "User registered successfully" });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

//sign in api

app.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false, message: "All fields are required"
            });
        }

        const pool = await poolPromise; 
        const result = await pool.request()
            .input("email", sql.VarChar, email)
            .query("SELECT * FROM HotelManagement.dbo.users WHERE email = @email");

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false, message: "User doesn't exist"
            });
        }

        const user = result.recordset[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false, message: "Password is incorrect"
            });
        }

        res.status(200).json({
            success: true,
            message: "User authenticated successfully",
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Lista e punetorve API (Staf, Admin)

app.get('/users', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("Select * from users where role IN ('staff', 'admin')");
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
})