# 🚴‍♀️ Critical Mass Portugal

> **Reclaiming the streets, one pedal at a time** 🌟

Welcome to the official website for Critical Mass Portugal - a grassroots movement uniting cyclists across Portuguese cities to advocate for sustainable transportation, safer streets, and vibrant cycling communities.

**Critical Mass** is a worldwide cycling event where cyclists gather monthly to ride together through city streets, demonstrating that bicycles are a viable form of transportation and advocating for better cycling infrastructure. Born in San Francisco in 1992, the movement has spread globally, and now thrives in cities across Portugal including Porto, Lisboa, Coimbra, and more.

## 🌍 What is Critical Mass?

Critical Mass is **not a protest, but a celebration** - a monthly gathering that:

- 🚲 Promotes cycling as sustainable urban mobility
- 🛡️ Advocates for cyclist safety and infrastructure
- 🤝 Builds community among cycling enthusiasts
- 🌱 Raises awareness about environmental issues
- 🎉 Creates joyful, inclusive experiences for all skill levels

Join us on the last Friday of every month as we ride together through Portuguese cities, creating positive change one revolution at a time!

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command             | Action                                            |
| :------------------ | :------------------------------------------------ |
| `nub install`       | Installs dependencies                             |
| `nub run dev`       | Starts local dev server at `localhost:4321`       |
| `nub run build`     | Builds the production site to `./dist/`           |
| `nub run preview`   | Previews the production build locally             |
| `nub run astro ...` | Runs CLI commands like `astro add`, `astro check` |

Editors can use **Gallery bulk upload** in the Emdash admin to upload several
posters as linked Portuguese and English drafts, then adjust each title and
month individually before publishing.

Performance measurements and regression checks are defined in the
[`web performance playbook`](docs/web-performance-playbook.md).

## ✨ Features

### 🌐 **Multilingual Experience**

- **Portuguese** and **English** support with seamless language switching
- Interface copy managed in Paraglide message catalogs; editorial content managed in Emdash
- SEO-optimized

### 📝 **Dynamic Content**

- Blog system for movement updates and cycling advocacy
- Database-first content management with Emdash and localized content variants
- Community-driven event submissions via CMS

### 🎨 **Modern Web Experience**

- Lightning-fast performance with server-side rendering
- Responsive design optimized for mobile and desktop

## 🛠️ Tech Stack

This project leverages modern web technologies for optimal performance and developer experience:

### **Frontend Framework**

- **[Astro](https://astro.build/)** - Fast, content-focused static site generator
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework for rapid styling

### **Internationalization**

- **[Paraglide.js](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)** - Type-safe interface translations
- **[Inlang](https://inlang.com/)** - Translation catalog tooling

### **Content Management**

- **[Emdash](https://emdashcms.com/)** - D1-backed editorial content, references, revisions, and editing
- **Astro Live Content Collections** - Runtime content backed by Emdash

### **Infrastructure**

- **[Cloudflare](https://www.cloudflare.com/)** - Global CDN with edge rendering
- **[Nub](https://nubjs.com/)** - Node.js runtime and package manager toolkit
- **Server-Side Rendering (SSR)** - Dynamic content with optimal performance

### **Code Quality**

- **[Vite+](https://viteplus.dev/)** - Oxlint and Oxfmt for code quality
- **TypeScript** - Type safety and enhanced developer experience

## 🤝 Contributing

We welcome contributions from the cycling community! Here's how you can help:

### **For Cyclists & Community Organizers**

- 📝 Submit ride reports and community stories through the website
- 📸 Share photos from your local Critical Mass events
- 🗣️ Help improve translations for better accessibility
- 📢 Spread the word about upcoming rides

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
