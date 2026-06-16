const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS references_posts (
            id TEXT PRIMARY KEY,
            title TEXT DEFAULT '',
            image TEXT,
            text TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await pool.query(`
        ALTER TABLE references_posts ADD COLUMN IF NOT EXISTS title TEXT DEFAULT ''
    `).catch(() => {});
    console.log('Database initialized');
}

// GET all references (newest first)
app.get('/api/references', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM references_posts ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/references error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST new reference
app.post('/api/references', async (req, res) => {
    try {
        const { id, title, image, text, created_at } = req.body;
        const refId = id || 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const result = await pool.query(
            'INSERT INTO references_posts (id, title, image, text, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [refId, title || '', image || '', text || '', created_at || new Date().toISOString()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/references error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT update reference
app.put('/api/references/:id', async (req, res) => {
    try {
        const { title, image, text, created_at } = req.body;
        const result = await pool.query(
            'UPDATE references_posts SET title = $1, image = $2, text = $3, created_at = COALESCE($4, created_at), updated_at = NOW() WHERE id = $5 RETURNING *',
            [title || '', image || '', text || '', created_at || null, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Référence non trouvée' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('PUT /api/references error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE reference
app.delete('/api/references/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM references_posts WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Référence non trouvée' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/references error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
});
