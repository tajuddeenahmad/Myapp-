import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBe6f1BEJviFNi2vDgxQ5UvguwFrod0P2s',
  authDomain: 'myapp-f2d44.firebaseapp.com',
  projectId: 'myapp-f2d44',
  storageBucket: 'myapp-f2d44.firebasestorage.app',
  messagingSenderId: '536239572478',
  appId: '1:536239572478:web:6b4c76c3fc5540aa4c2caf',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
