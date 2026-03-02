require('./firebase');
const { db } = require('./firebase');
require('dotenv').config();

/**
 * Migration script: clean up duplicate conversations in Firestore
 * (Firestore has no native unique indexes — we enforce uniqueness in application logic)
 */
const migrateConversations = async () => {
  try {
    console.log('🔥 Connected to Firebase / Firestore');

    const snap = await db.collection('conversations').get();
    const conversations = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    console.log(`Found ${conversations.length} conversations`);

    // Remove duplicate conversations (keep the most recent for each client-company pair)
    const seen = new Map();
    const toDelete = [];

    conversations.forEach(conv => {
      const key = `${conv.client}_${conv.company}`;
      if (seen.has(key)) {
        const existing = seen.get(key);
        const existingTime = existing.lastMessageTime?.toDate ? existing.lastMessageTime.toDate() : new Date(existing.lastMessageTime || 0);
        const convTime = conv.lastMessageTime?.toDate ? conv.lastMessageTime.toDate() : new Date(conv.lastMessageTime || 0);
        if (convTime > existingTime) {
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
      const batch = db.batch();
      toDelete.forEach(id => batch.delete(db.collection('conversations').doc(id)));
      await batch.commit();
      console.log(`✓ Removed ${toDelete.length} duplicate conversations`);
    } else {
      console.log('✓ No duplicate conversations found');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('Restart your backend server now.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateConversations();


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
