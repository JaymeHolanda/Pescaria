import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase web configuration is public. Access is enforced by Authentication and database.rules.json.
const firebaseConfig = {
  apiKey: 'AIzaSyDP993Ise4vippiF2RYTJIdEvMuDTcW0Aw',
  authDomain: 'teste-b81e2.firebaseapp.com',
  databaseURL: 'https://teste-b81e2-default-rtdb.firebaseio.com',
  projectId: 'teste-b81e2',
  storageBucket: 'teste-b81e2.firebasestorage.app',
  messagingSenderId: '718198850565',
  appId: '1:718198850565:web:528f8209d1645ae777486c',
  measurementId: 'G-F1Z3GZEHN3'
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
