import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * A custom hook to fetch all available starter packs from the 'starterPacks'
 * collection in Firestore. This fetch is performed once when the hook is mounted.
 *
 * @returns {{packs: object[], isLoading: boolean}} An object containing the list of starter packs and the loading state.
 * @property {object[]} packs - An array of starter pack objects after they have been fetched.
 * @property {boolean} isLoading - True while the starter packs are being fetched.
 */
export function useStarterPacks() {
    const [packs, setPacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPacks = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'starterPacks'));
                const packList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPacks(packList);
            } catch (error) {
                console.error("Error fetching starter packs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPacks();
    }, []);

    return { packs, isLoading };
}