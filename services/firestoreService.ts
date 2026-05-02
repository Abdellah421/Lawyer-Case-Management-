import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  deleteDoc,
  DocumentSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage, serverTimestamp, auth } from '../firebase';
import { Case, Task, User, Client } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore.
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}

/**
 * Recursively scans any data structure (objects, arrays) and converts all
 * date-like objects (anything with a .toDate() method, like Firestore Timestamps or JS Dates)
 * into `YYYY-MM-DD` strings. This is a robust sanitization step to prevent
 * React rendering errors from invalid date objects.
 * @param data The data to transform.
 * @returns The transformed data with all date-like objects converted to strings.
 */
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Duck-typing for Timestamps or Dates. Safer than `instanceof`.
  if (typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString().split('T')[0];
    } catch (e) {
      // If toDate() fails for some reason, return the original data.
      console.error("Failed to convert date-like object:", data, e);
      return data;
    }
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  const transformedObject: { [key:string]: any } = {};
  for (const [key, value] of Object.entries(data)) {
    transformedObject[key] = sanitizeData(value);
  }
  return transformedObject;
};


/**
 * Transforms a Firestore document by converting ALL date-like fields,
 * even nested ones, to date strings (YYYY-MM-DD). This is the central
 * function to ensure data is safe to render in React components.
 * @param doc The Firestore document snapshot.
 * @returns A new object with all date-like objects converted to strings.
 */
export const transformDoc = (docSnap: DocumentSnapshot): object => {
    const data = docSnap.data();
    if (!data) return { id: docSnap.id };
    const transformedData = sanitizeData(data);
    return { id: docSnap.id, ...transformedData };
};


// User Management
export const createUserProfile = async (user: User) => {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    // Only include 'phone' if it has a real value.
    // The Firestore rule rejects an empty phone string, so we omit the field entirely
    // when there is no phone number yet. This satisfies the `hasOnly` + optional-phone check.
    const profileData: Record<string, any> = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    if (user.phone && user.phone.trim().length > 0) {
      profileData.phone = user.phone.trim();
    }
    await setDoc(userRef, profileData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const path = `users/${userId}`;
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
          return transformDoc(userDocSnap) as User;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
}

export const updateUserProfile = async (userId: string, data: { name: string; phone: string }) => {
    const path = `users/${userId}`;
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
}


// Case Management
export const getCases = (userId: string, callback: (cases: Case[]) => void) => {
  const path = `users/${userId}/cases`;
  const casesCollection = collection(db, 'users', userId, 'cases');
  return onSnapshot(casesCollection, (querySnapshot) => {
    const cases = querySnapshot.docs.map(doc => transformDoc(doc) as Case);
    callback(cases);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const getCase = async (userId: string, caseId: string): Promise<Case | null> => {
    const path = `users/${userId}/cases/${caseId}`;
    try {
      const caseDocRef = doc(db, 'users', userId, 'cases', caseId);
      const docSnap = await getDoc(caseDocRef);
      if (docSnap.exists()) {
          return transformDoc(docSnap) as Case;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
}

export const addCase = async (caseData: Omit<Case, 'id'>) => {
  const path = `users/${caseData.userId}/cases`;
  try {
    const casesCollection = collection(db, 'users', caseData.userId, 'cases');
    // Include createdAt for a complete data structure and sort capability.
    const docRef = await addDoc(casesCollection, {
      ...caseData,
      createdAt: serverTimestamp(),
    });
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const updateCase = async (userId: string, caseId: string, caseData: Partial<Omit<Case, 'id' | 'userId'>>) => {
  const path = `users/${userId}/cases/${caseId}`;
  try {
    const caseDocRef = doc(db, 'users', userId, 'cases', caseId);
    // Strip 'id' and 'userId' from the update payload. updateDoc performs a
    // MERGE, so sending them is redundant and can cause the Firestore validator
    // to fail if those fields interact with hasOnly() checks in security rules.
    const { id: _id, userId: _userId, ...safeData } = caseData as Case;
    await updateDoc(caseDocRef, safeData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteCase = async (userId: string, caseId: string) => {
  const path = `users/${userId}/cases/${caseId}`;
  // Delete associated files from storage first
  const folderRef = ref(storage, `users/${userId}/cases/${caseId}`);
  try {
    const fileList = await listAll(folderRef);
    for (const fileRef of fileList.items) {
      await deleteObject(fileRef);
    }
  } catch (error) {
    console.error("Failed to delete associated files from Firebase Storage. The case document will still be deleted.", error);
  }

  // Then delete the firestore document
  try {
    const caseDocRef = doc(db, 'users', userId, 'cases', caseId);
    await deleteDoc(caseDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};


// Task Management
export const getTasks = (userId: string, callback: (tasks: Task[]) => void) => {
  const path = `users/${userId}/tasks`;
  const tasksCollection = collection(db, 'users', userId, 'tasks');
  return onSnapshot(tasksCollection, (querySnapshot) => {
    const tasks = querySnapshot.docs.map(doc => transformDoc(doc) as Task);
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addTask = async (taskData: Omit<Task, 'id'>) => {
  const path = `users/${taskData.userId}/tasks`;
  try {
    const tasksCollection = collection(db, 'users', taskData.userId, 'tasks');
    await addDoc(tasksCollection, taskData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateTask = async (userId: string, taskId: string, taskData: Partial<Omit<Task, 'id' | 'userId'>>) => {
    const path = `users/${userId}/tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
      await updateDoc(taskDocRef, taskData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const deleteTask = async (userId: string, taskId: string) => {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};


// Client Management
export const getClients = (userId: string, callback: (clients: Client[]) => void) => {
  const path = `users/${userId}/clients`;
  const clientsCollection = collection(db, 'users', userId, 'clients');
  return onSnapshot(clientsCollection, (querySnapshot) => {
    const clients = querySnapshot.docs.map(doc => transformDoc(doc) as Client);
    callback(clients);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addClient = async (clientData: Omit<Client, 'id'>) => {
  const path = `users/${clientData.userId}/clients`;
  try {
    const clientsCollection = collection(db, 'users', clientData.userId, 'clients');
    await addDoc(clientsCollection, clientData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateClient = async (userId: string, clientId: string, clientData: Partial<Omit<Client, 'id' | 'userId'>>) => {
    const path = `users/${userId}/clients/${clientId}`;
    try {
      const clientDocRef = doc(db, 'users', userId, 'clients', clientId);
      await updateDoc(clientDocRef, clientData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

export const deleteClient = async (userId: string, clientId: string) => {
  const path = `users/${userId}/clients/${clientId}`;
  try {
    const clientDocRef = doc(db, 'users', userId, 'clients', clientId);
    await deleteDoc(clientDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Logs a critical security or data-related event to Firestore for auditing.
 * @param userId The ID of the user performing the action.
 * @param action A string identifying the action (e.g., 'LOGIN_FAIL').
 * @param details An optional object for extra context.
 */
export const logEvent = async (userId: string, action: string, details?: object) => {
  const path = 'logs';
  try {
    const logsCollection = collection(db, 'logs');
    await addDoc(logsCollection, {
        userId,
        action,
        details: details || {},
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to log event:', { userId, action, details, error });
    // We don't use handleFirestoreError here to avoid infinite loops if logging fails
  }
};
