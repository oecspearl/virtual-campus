/**
 * Skip to Content Link Component
 * 
 * Provides keyboard users with a way to skip navigation and jump to main content.
 * This is a WCAG 2.1 AA requirement.
 */

'use client';

import React from 'react';

export default function SkipToContent() {
    return (
        <a
            href="#main-content"
            className="skip-to-content"
            onClick={(e) => {
                e.preventDefault();
                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.focus();
                    mainContent.scrollIntoView();
                }
            }}
        >
            Skip to main content
        </a>
    );
}

/**
 * Add this CSS to globals.css:
 * 
 * .skip-to-content {
 *   position: absolute;
 *   left: -9999px;
 *   z-index: 999;
 *   padding: 1em;
 *   background-color: #000;
 *   color: #fff;
 *   text-decoration: none;
 *   border-radius: 0.25rem;
 * }
 * 
 * .skip-to-content:focus {
 *   left: 50%;
 *   transform: translateX(-50%);
 *   top: 1rem;
 * }
 */
