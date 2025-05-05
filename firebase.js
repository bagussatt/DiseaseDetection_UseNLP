var admin = require("firebase-admin");

var serviceAccount = require("./config/serviceAccountKey.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://deteksipenyakit-e049c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

module.exports = db;


