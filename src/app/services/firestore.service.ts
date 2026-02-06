import { Injectable } from '@angular/core';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  DocumentData
} from 'firebase/firestore';
import { firestore } from '../firebase/init';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  // add a new document to a collection, returns created doc id
  async addDocument(collectionPath: string, data: DocumentData): Promise<string> {
    const colRef = collection(firestore, collectionPath);
    const ref = await addDoc(colRef, data);
    return ref.id;
  }

  // set/overwrite a document by id
  async setDocument(collectionPath: string, id: string, data: DocumentData): Promise<void> {
    const docRef = doc(firestore, collectionPath, id);
    await setDoc(docRef, data);
  }

  // get a single document
  async getDocument(collectionPath: string, id: string): Promise<DocumentData | null> {
    const docRef = doc(firestore, collectionPath, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  // list documents in a collection (simple list)
  async listCollection(collectionPath: string): Promise<Array<{ id: string; data: DocumentData }>> {
    const colRef = collection(firestore, collectionPath);
    const q = query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  }
}
