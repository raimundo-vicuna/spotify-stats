const mongoose = require('mongoose');
let User;
function modelUser() {
  if (!User) {
    const schema = new mongoose.Schema({
      spotifyId: { type: String, required: true, unique: true, index: true },
      displayName: { type: String, default: '' },
      accessToken: { type: String, required: true, select: false },
      refreshToken: { type: String, default: '', select: false },
      expiresIn: { type: Number, default: 3600 }
    }, { timestamps: true });
    User = mongoose.models.User || mongoose.model('User', schema);
  }
  return User;
}
async function connectdb() {
  if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI. Configúrala en server/.env.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB conectado correctamente');
}
module.exports = { connectdb, modelUser };
