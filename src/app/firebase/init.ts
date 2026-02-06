import { initializeApp } from 'firebase/app';
export const firebaseApp = initializeApp(environment.firebase);
export const firestore = getFirestore(firebaseApp);

import { environment } from '../../environments/environment';
import { getFirestore } from 'firebase/firestore';
