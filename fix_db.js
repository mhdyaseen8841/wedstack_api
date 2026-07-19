const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://yaseen:5LzUmReTjZ5dWxt2@cluster0.4qw1v.mongodb.net/wedstack';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Wedding = mongoose.model('Wedding', new mongoose.Schema({}, { strict: false }));

  const result = await Wedding.updateOne(
    { _id: '6a5b7efef167557c7b25f9c7' },
    { 
      $set: { 
        groomId: new mongoose.Types.ObjectId('6a5b7efef167557c7b25f9c8'),
        groomName: 'Mohammed Yaseen' 
      }, 
      $unset: { brideId: 1, brideName: 1 } 
    }
  );
  console.log('Update result:', result);

  await mongoose.disconnect();
}

run().catch(console.error);
