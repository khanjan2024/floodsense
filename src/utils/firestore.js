import { getDoc } from 'firebase/firestore'

export async function getFirestoreDocWithTimeout(reference, timeoutMs = 6000) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Firestore read timed out.')), timeoutMs)
  })

  try {
    return await Promise.race([getDoc(reference), timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}