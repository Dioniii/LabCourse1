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

const PORT = process.env.PORT || 4000;
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

