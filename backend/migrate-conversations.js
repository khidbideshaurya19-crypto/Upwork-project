const mongoose = require('mongoose');
require('dotenv').config();

const migrateConversations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance-platform');
    console.log('Connected to MongoDB');

    const Conversation = mongoose.connection.collection('conversations');

    // Drop the old index
    try {
      await Conversation.dropIndex('project_1_company_1');
      console.log('✓ Dropped old index: project_1_company_1');
    } catch (error) {
      console.log('Old index not found or already dropped');
    }

    // Create new index on client-company
    try {
      await Conversation.createIndex({ client: 1, company: 1 }, { unique: true });
      console.log('✓ Created new index: client_1_company_1');
    } catch (error) {
      console.log('Index might already exist:', error.message);
    }

    // Remove duplicate conversations (keep the most recent one for each client-company pair)
    const conversations = await Conversation.find({}).toArray();
    const seen = new Map();
    const toDelete = [];

    conversations.forEach(conv => {
      const key = `${conv.client}_${conv.company}`;
      if (seen.has(key)) {
        // Keep the one with more recent lastMessageTime
        const existing = seen.get(key);
        if (!existing.lastMessageTime || (conv.lastMessageTime && conv.lastMessageTime > existing.lastMessageTime)) {
          toDelete.push(existing._id);
          seen.set(key, conv);
        } else {
          toDelete.push(conv._id);
        }
      } else {
        seen.set(key, conv);
      }
    });

    if (toDelete.length > 0) {
      await Conversation.deleteMany({ _id: { $in: toDelete } });
      console.log(`✓ Removed ${toDelete.length} duplicate conversations`);
    } else {
      console.log('✓ No duplicate conversations found');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('Restart your backend server now.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

migrateConversations();
