const session = require('express-session');
const mongoose = require('mongoose');

class MongoSessionStore extends session.Store {
  constructor() {
    super();
    this.collectionName = 'sessions';
  }

  collection() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB no está conectado para almacenar sesiones.');
    return db.collection(this.collectionName);
  }

  get(sid, callback) {
    this.collection().findOne({ _id: sid, expires: { $gt: new Date() } })
      .then((record) => callback(null, record ? record.session : null))
      .catch(callback);
  }

  set(sid, sessionData, callback = () => {}) {
    const expires = sessionData.cookie && sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    this.collection().updateOne(
      { _id: sid },
      { $set: { session: sessionData, expires } },
      { upsert: true }
    ).then(() => callback(null)).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this.collection().deleteOne({ _id: sid })
      .then(() => callback(null))
      .catch(callback);
  }

  touch(sid, sessionData, callback = () => {}) {
    const expires = sessionData.cookie && sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    this.collection().updateOne(
      { _id: sid },
      { $set: { expires } }
    ).then(() => callback(null)).catch(callback);
  }
}

module.exports = { MongoSessionStore };
