// Utility to export board data as a downloadable JSON file in the browser
export function exportBoardToJson(
  boardData: object,
  filename = "driftboard-export.json",
) {
  const json = JSON.stringify(boardData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts URLs in text to clickable links with comprehensive pattern recognition.
 *
 * This function detects and converts various URL patterns into clickable React elements:
 * - HTTP/HTTPS protocols (e.g., https://example.com, http://site.org/path)
 * - www patterns without protocol (e.g., www.example.com) - normalized to https://
 * - localhost with port numbers (e.g., localhost:3000/dashboard) - normalized to http://
 *
 * Features:
 * - Opens links in new tabs with security attributes (target="_blank", rel="noopener noreferrer")
 * - Professional styling with Tailwind CSS classes including hover effects
 * - URL normalization for proper navigation (adds protocol when missing)
 * - Preserves original text structure and whitespace
 * - Handles multiple URLs within the same text content
 *
 * Security considerations:
 * - Uses noopener noreferrer to prevent security vulnerabilities
 * - Client-side processing maintains data integrity
 * - No modification of stored data, preserving export compatibility
 *
 * @param text - The input text that may contain URLs to be converted to links
 * @returns React nodes with URLs converted to clickable links, or the original text if no URLs found
 *
 * @example
 * // Basic usage with HTTP URL
 * linkifyText("Visit https://example.com for more info")
 * // Returns: ["Visit ", <a href="https://example.com" ...>https://example.com</a>, " for more info"]
 *
 * @example
 * // www URL normalization
 * linkifyText("Check out www.google.com")
 * // Returns: ["Check out ", <a href="https://www.google.com" ...>www.google.com</a>]
 *
 * @example
 * // localhost development URLs
 * linkifyText("Server at localhost:3000")
 * // Returns: ["Server at ", <a href="http://localhost:3000" ...>localhost:3000</a>]
 *
 * @example
 * // Multiple URLs
 * linkifyText("See https://docs.com and www.example.org")
 * // Returns: ["See ", <link1>, " and ", <link2>]
 */
export function linkifyText(text: string): React.ReactNode {
  if (!text) return "";

  // Enhanced URL regex for multiple patterns:
  // 1. http/https protocols: https://example.com
  // 2. www. patterns without protocol: www.example.com
  // 3. localhost with port numbers: localhost:3000
  // 4. file:// protocol: file:///path/to/file
  const urlRegex =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(localhost:[0-9]+[^\s]*)|(file:\/\/[^\s]+)/g;

  // Function to normalize URL for href attribute
  const normalizeUrl = (url: string): string => {
    if (url.startsWith("www.")) {
      return `http://${url}`;
    }
    if (url.startsWith("localhost")) {
      return `http://${url}`;
    }
    // file:// URLs don't need normalization, they are already valid
    return url;
  };

  // Split text by URLs, keeping the URLs in the result
  const parts = text.split(urlRegex);

  // Create array of React nodes
  const result: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (part === undefined) return; // Skip undefined parts

    // Reset regex for testing each part
    urlRegex.lastIndex = 0;

    // Check if this part is a URL (and not empty)
    if (part && urlRegex.test(part)) {
      result.push(
        React.createElement(
          "a",
          {
            key: index,
            href: normalizeUrl(part),
            target: "_blank",
            rel: "noopener noreferrer",
            className:
              "text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 font-medium cursor-pointer decoration-1 underline-offset-2 url-text",
          },
          part,
        ),
      );
    } else if (part) {
      // Regular text (only if not empty)
      result.push(part);
    }
  });

  return result.length === 1 ? result[0] : result;
}
