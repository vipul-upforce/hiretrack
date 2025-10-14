/**
 * Migration script to update all users in the users collection
 * by adding "77" to their names.
 * 
 * This script can be run with: node migration.cjs
 */

const { MongoClient } = require('mongodb');

// Database connection configuration
// Load environment variables from .env file if it exists
require('dotenv').config();

const config = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
};

// Log the URI being used to help with debugging
console.log('Using MongoDB URI:', process.env.MONGODB_URI ? 'From environment variable' : 'Default fallback');

async function updateUserNames() {
    console.log("MONGODB_URI: ", process.env.MONGODB_URI);
  const client = new MongoClient(config.uri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    // Extract database name from the connection string or use default
    const dbName = process.env.MONGODB_URI ? 
      process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'myapp' : 
      'myapp';
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to update`);
    
    let updatedCount = 0;
    
    // Update each user's name to include "77"
    for (const user of users) {
      const currentName = user.name || '';
      const newName = currentName.includes('77') ? currentName : `${currentName}77`;
      
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { $set: { name: newName } }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`Updated user: ${user._id}, name changed from "${currentName}" to "${newName}"`);
      }
    }
    
    console.log(`Migration completed: ${updatedCount} users updated out of ${users.length}`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Execute the migration
updateUserNames()
  .then(() => console.log('Migration script finished'))
  .catch(err => console.error('Migration script failed:', err));
