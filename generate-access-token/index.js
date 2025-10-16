const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const API_KEY_SID = process.env.API_KEY_SID;
const API_KEY_SECRET = process.env.API_KEY_SECRET;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', (req, res) => {
  try {
    const username = req.query.u;

    if (!username) {
      return res.json({ access_token: '' });
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { cty: 'stringee-api;v=1' };
    const payload = {
      jti: `${API_KEY_SID}-${now}`,
      iss: API_KEY_SID,
      exp: now + 3600,
      userId: username
    };

    const token = jwt.sign(payload, API_KEY_SECRET, { header });

    res.json({ access_token: token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});