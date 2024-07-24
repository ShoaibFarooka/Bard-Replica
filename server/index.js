const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());

// Enable CORS for all routes or specify allowed origins
// For development, you can allow all origins using "*"
app.use(cors());

// Replace this with your actual secret key
const secretKey = process.env.SECRET_KEY;

// Authentication middleware
function authenticate(req, res, next) {
  console.log('Request Incoming for Authorization.....');
  const userKey = req.body.key; // Assuming the key is sent in the request body
  if (userKey === secretKey) {
    next(); // Allow access if the key matches
  } else {
    res.status(401).json({ message: 'Unauthorized' }); // Deny access if the key is incorrect
  }
}

// Protected route (e.g., ChatApp)
app.post('/chatapp', authenticate, (req, res) => {
  res.json({ message: 'Access granted' });
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
