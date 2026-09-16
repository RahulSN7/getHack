import { useEffect } from "react";

/**
 * Custom hook to update document title and meta description dynamically.
 * @param {string} title - The page title
 * @param {string} description - The meta description
 */
export function useSEO(title, description) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }
  }, [title, description]);
}

export default useSEO;
