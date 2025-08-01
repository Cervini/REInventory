import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';

// THIS IS THE FIX: A new function to manage the cached Global Compendium
const getGlobalCompendium = async () => {
    const CACHE_KEY = 'globalCompendiumCache';
    const CACHE_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const { timestamp, items } = JSON.parse(cachedData);
            // If the cache is still fresh, return the cached items
            if (Date.now() - timestamp < CACHE_DURATION_MS) {
                console.log("Loaded Global Compendium from cache.");
                return items;
            }
        }
    } catch (error) {
        console.error("Could not read compendium from cache:", error);
    }

    // If cache is empty or stale, fetch from Firestore
    console.log("Fetching Global Compendium from Firestore...");
    const querySnapshot = await getDocs(collection(db, 'globalCompendium'));
    const items = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // Save the new data and a timestamp to the cache
    try {
        const cachePayload = {
            timestamp: Date.now(),
            items: items,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
    } catch (error) {
        console.error("Could not save compendium to cache:", error);
    }
    
    return items;
};


export function useCompendium() {
    const [globalItems, setGlobalItems] = useState([]);
    const [customItems, setCustomItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        };

        // Fetch the global items using our new caching logic
        getGlobalCompendium().then(items => {
            setGlobalItems(items);
        });

        // Your custom items will still be fetched in real-time
        const customUnsubscribe = onSnapshot(collection(db, 'compendiums', currentUser.uid, 'masterItems'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setCustomItems(items);
            setIsLoading(false); // Set loading to false after custom items are loaded
        });

        return () => {
            customUnsubscribe();
        };
    }, [currentUser]);

    // Combine both lists, ensuring custom items appear first
    return { allItems: [...customItems, ...globalItems], isLoading };
}