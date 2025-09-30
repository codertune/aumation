const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function promoteUserToAdmin(email) {
  try {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'database', 'app.db');

    if (!fs.existsSync(dbPath)) {
      console.error('? Database file not found at:', dbPath);
      console.error('Please ensure your server has run at least once to create the database.');
      return;
    }

    const dbData = fs.readFileSync(dbPath);
    const db = new SQL.Database(dbData);

    // Execute the update query
    const stmt = db.prepare("UPDATE users SET role = 'admin' WHERE email = :email");
    stmt.run({ ':email': email });
    stmt.free(); // Free the statement to clear memory

    // Export and save the modified database
    const newDbData = db.export();
    fs.writeFileSync(dbPath, Buffer.from(newDbData));
    db.close();

    console.log(`? User '${email}' has been successfully promoted to admin.`);
    console.log('Please restart your server (if running) for changes to take effect.');

  } catch (error) {
    console.error('? Error promoting user to admin:', error);
  }
}

// Get email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node promoteAdmin.js <user_email>');
  console.log('Example: node promoteAdmin.js izajahmad@gmail.com');
} else {
  promoteUserToAdmin(userEmail);
}
