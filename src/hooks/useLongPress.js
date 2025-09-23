import { useRef, useCallback } from 'react';

/**
 * A custom React hook to handle long press events on touch devices
 * and right-click events on desktop.
 * @param {function} callback - The function to call when the event is detected.
 * @param {number} [duration=500] - The duration for touch long press.
 * @returns {object} Event handlers to spread onto the target component.
 */
export function useLongPress(callback, duration = 500) {
    const timerRef = useRef(null);

    const start = useCallback((event) => {
        // Check the event type.
        // If it's a right-click, call the callback immediately.
        if (event.type === 'contextmenu') {
            event.preventDefault();
            callback(event);
            return;
        }

        // For touch events, we want to allow dnd-kit to handle drag start.
        // We don't call `event.preventDefault()` here, as it can prevent
        // dnd-kit's sensors from working correctly. The `touch-none` CSS
        // class on the draggable item should be used to prevent scrolling.

        // For touch events, continue using the timer for long press detection.
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            callback(event);
        }, duration);
    }, [callback, duration]);

    const clear = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return {
        onTouchStart: start,
        onTouchEnd: clear,
        onTouchMove: clear,
        onContextMenu: start, // Right-click still triggers the 'start' function
    };
}