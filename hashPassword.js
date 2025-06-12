const bcrypt = require('bcrypt');

const password = 'admin123'; // Your desired admin password
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  // console.log('Hashed Password:', hash);
});