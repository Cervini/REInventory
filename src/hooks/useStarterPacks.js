import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

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