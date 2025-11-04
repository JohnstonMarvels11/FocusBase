
import React from 'react';

export const LoadingIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="currentColor"
    className={`w-6 h-6 text-current ${className}`}
  >
    <circle cx="4" cy="12" r="3">
        <animate id="a" begin="0;c.end-0.25s" attributeName="r" dur="0.75s" values="3;1;3"/>
    </circle>
    <circle cx="12" cy="12" r="3">
        <animate begin="a.end-0.6s" attributeName="r" dur="0.75s" values="3;1;3"/>
    </circle>
    <circle cx="20" cy="12" r="3">
        <animate id="c" begin="a.end-0.45s" attributeName="r" dur="0.75s" values="3;1;3"/>
    </circle>
  </svg>
);