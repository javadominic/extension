import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyBGTkNDcYZoYgmkDAiMA2jJ0y7UtIcxVMg',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'protfolio-b8314.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'protfolio-b8314',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'protfolio-b8314.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '367359110826',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:367359110826:web:fad3760ce4a336c9862ad3',
}

export const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
