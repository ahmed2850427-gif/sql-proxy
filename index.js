const express = require('express');
const sql = require('mssql');
const app = express();

app.use(express.json({ limit: '50mb' }));

// Database connection configuration using environment variables for security
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || 'TransportManagement',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

app.get('/api/sqlproxy/test', (req, res) => {
    res.send("مرحباً بك! الـ API يعمل بنجاح على Render.");
});

app.post('/api/sqlproxy/execute', async (req, res) => {
    const { Query, Parameters, SecretKey } = req.body;

    // Security check to prevent unauthorized access
    if (SecretKey !== "TransportManagement@2026") {
        return res.status(401).json({ Success: false, Error: "Invalid Secret Key" });
    }

    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();

        // Add parameters if they exist
        if (Parameters) {
            for (const [key, value] of Object.entries(Parameters)) {
                // We pass the value directly. mssql driver handles conversions automatically
                // similar to C#'s AddWithValue
                request.input(key, value);
            }
        }

        const isSelect = Query.trim().toUpperCase().startsWith('SELECT');
        const result = await request.query(Query);

        if (isSelect) {
            res.json({
                Success: true,
                RowsAffected: 0,
                Data: result.recordset || []
            });
        } else {
            res.json({
                Success: true,
                RowsAffected: result.rowsAffected ? result.rowsAffected[0] : 0,
                Data: null
            });
        }
    } catch (err) {
        console.error("SQL Error:", err.message);
        res.status(400).json({ Success: false, Error: err.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`SQL Proxy listening on port ${port}`);
});
