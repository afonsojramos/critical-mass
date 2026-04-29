import { slugify } from "./slugify";

export default function jsonLDGenerator({ type, post, url }) {
  if (type === "post") {
    const jsonLDObject = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      headline: post.title,
      description: post.description,
      image: post.image.src,
      author: {
        "@type": "Person",
        name: post.author,
        url: `/author/${slugify(post.author)}`,
      },
      datePublished: post.date,
    };
    return `<script type="application/ld+json">${JSON.stringify(jsonLDObject)}</script>`;
  }

  const jsonLDObject = {
    "@context": "https://schema.org/",
    "@type": "WebSite",
    name: "Critical Mass Portugal",
    url: import.meta.env.SITE,
  };
  return `<script type="application/ld+json">${JSON.stringify(jsonLDObject)}</script>`;
}
