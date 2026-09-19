import { useEffect } from "react";

const SITE_BASE_URL = "https://gethack-tau.vercel.app";
const DEFAULT_OG_IMAGE = "https://gethack-tau.vercel.app/gethack-icon.png";

/**
 * Custom hook to manage page SEO metadata dynamically in DOM.
 * Supports title, description, canonical URL, Open Graph, Twitter cards, and noindex directives.
 * @param {string|object} optionsOrTitle - Page title string OR options object
 * @param {string} [descriptionParam] - Page meta description (if optionsOrTitle is title string)
 * @param {object} [extraOptions] - Additional SEO metadata options
 */
export function useSEO(optionsOrTitle, descriptionParam, extraOptions = {}) {
  let options = {};
  if (typeof optionsOrTitle === "object" && optionsOrTitle !== null) {
    options = optionsOrTitle;
  } else {
    options = {
      title: optionsOrTitle,
      description: descriptionParam,
      ...extraOptions,
    };
  }

  const {
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType = "website",
    twitterCard = "summary_large_image",
    twitterTitle,
    twitterDescription,
    twitterImage,
    noIndex = false,
  } = options;

  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = title;
    }

    // Helper to create/update <meta> tag
    const setMetaTag = (selector, attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Helper to remove element if present
    const removeElement = (selector) => {
      const el = document.querySelector(selector);
      if (el) el.remove();
    };

    // 2. Meta Description
    if (description) {
      setMetaTag('meta[name="description"]', "name", "description", description);
    }

    // 3. Robots Meta (noindex, nofollow)
    if (noIndex) {
      setMetaTag('meta[name="robots"]', "name", "robots", "noindex, nofollow");
    } else {
      removeElement('meta[name="robots"]');
    }

    // 4. Canonical Link
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    const resolvedCanonical = canonical
      ? (canonical.startsWith("http") ? canonical : `${SITE_BASE_URL}${canonical.startsWith("/") ? "" : "/"}${canonical}`)
      : `${SITE_BASE_URL}${currentPath === "/" ? "/" : currentPath}`;

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", resolvedCanonical);

    // 5. Open Graph Meta Tags
    const resolvedOgTitle = ogTitle || title;
    const resolvedOgDesc = ogDescription || description;
    const resolvedOgUrl = ogUrl || resolvedCanonical;
    const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;

    setMetaTag('meta[property="og:title"]', "property", "og:title", resolvedOgTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", resolvedOgDesc);
    setMetaTag('meta[property="og:url"]', "property", "og:url", resolvedOgUrl);
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    setMetaTag('meta[property="og:image"]', "property", "og:image", resolvedOgImage);

    // 6. Twitter Meta Tags
    const resolvedTwTitle = twitterTitle || resolvedOgTitle;
    const resolvedTwDesc = twitterDescription || resolvedOgDesc;
    const resolvedTwImage = twitterImage || resolvedOgImage;

    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", twitterCard);
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", resolvedTwTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", resolvedTwDesc);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", resolvedTwImage);

  }, [
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    noIndex,
  ]);
}

export default useSEO;
