import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { CaseFile } from '../types';

/**
 * Uploads a file to a specific case's folder in Firebase Storage under the user's private directory.
 * @param userId The ID of the user uploading the file.
 * @param caseId The ID of the case.
 * @param file The file to upload.
 * @returns A promise that resolves to a CaseFile object containing the name and URL.
 */
export const uploadCaseFile = async (userId: string, caseId: string, file: File): Promise<CaseFile> => {
    // Security Update: Files are stored in a user-specific path to enforce ownership.
    const filePath = `users/${userId}/cases/${caseId}/${file.name}`;
    const storageRef = ref(storage, filePath);
    
    // Security Update: Add userId to metadata for an extra layer of validation in security rules.
    const metadata = {
        customMetadata: {
            'userId': userId,
            'caseId': caseId,
        }
    };

    await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(storageRef);
    
    return { name: file.name, url };
};

/**
 * Deletes a file from a specific case's folder in Firebase Storage.
 * @param userId The ID of the user who owns the file.
 * @param caseId The ID of the case.
 * @param fileName The name of the file to delete.
 */
export const deleteCaseFile = async (userId: string, caseId: string, fileName: string): Promise<void> => {
    // Security Update: The path must include the userId to ensure the correct file is targeted.
    const filePath = `users/${userId}/cases/${caseId}/${fileName}`;
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
};