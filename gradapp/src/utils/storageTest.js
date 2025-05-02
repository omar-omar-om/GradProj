import { storage } from '../firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const testStorageConnection = async () => {
  try {
    // Create a test reference
    const testRef = ref(storage, 'test/connection-test.txt');
    
    // Try to upload a small string
    await uploadString(testRef, 'Test connection');
    
    // Try to get the download URL
    const url = await getDownloadURL(testRef);
    
    console.log('Storage test successful:', url);
    return true;
  } catch (error) {
    console.error('Storage test failed:', error);
    return false;
  }
}; 