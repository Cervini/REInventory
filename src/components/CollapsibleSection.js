import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

/**
 * A reusable component that creates a collapsible section with a title.
 * The section can be toggled open or closed by clicking the header.
 * @param {object} props - The component props.
 * @param {string} props.title - The title to display in the section header.
 * @param {React.ReactNode} props.children - The content to be displayed inside the collapsible area.
 * @param {boolean} [props.defaultOpen=false] - Whether the section should be open by default.
 * @returns {JSX.Element}
 */
const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-surface/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 text-left font-bold text-text-muted hover:text-text-base transition-colors"
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-4 space-y-6">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;