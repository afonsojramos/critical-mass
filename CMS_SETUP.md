# Sveltia CMS Setup Guide

Sveltia CMS has been integrated into your Critical Mass Portugal website with full internationalization support. Here's how to set it up and use it.

## 🚀 Quick Setup

### 1. GitHub Authentication Setup

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Developer settings** → **OAuth Apps**
3. Click **New OAuth App**
4. Fill in the details:
   - **Application name**: `Critical Mass CMS`
   - **Homepage URL**: `https://massacritica.pt`
   - **Authorization callback URL**: `https://massacritica.pt/admin/`
5. Note down the **Client ID** and generate a **Client Secret**

### 2. Configure GitHub OAuth

Update the `public/admin/config.yml` file with your GitHub repository details:

```yaml
backend:
  name: github
  repo: your-username/your-repo-name  # Update this!
  branch: main  # or master
```

### 3. Enable GitHub Pages or Deploy

Make sure your site is deployed and accessible at your domain. The CMS will be available at:
`https://massacritica.pt/admin/`

## 🌐 Multi-language Content Management

Your CMS is configured for Portuguese (default) and English content:

### Blog Posts
- **Portuguese**: `src/content/blog/pt/`
- **English**: `src/content/blog/en/`
- **Fields**: Title, Date, Author, Images, Tags, Summary, Type, Content

### Events
- **Portuguese**: `src/content/events/pt/`
- **English**: `src/content/events/en/`
- **Fields**: Title, Image, Description, Featured status, Content

### Pages
- **Portuguese**: `src/content/pages/home-pt.md`
- **English**: `src/content/pages/home-en.md`
- **Fields**: Title, Hero Title, Hero Subtitle, Content

## 🖼️ Media Management

- **Upload folder**: `public/images/uploads/`
- **Public URL**: `/images/uploads/`
- All images uploaded through the CMS will be stored here and can be used across all languages

## 📝 Content Workflow

1. **Create Portuguese Content**: Start with Portuguese (your default locale)
2. **Create English Translation**: Create corresponding English versions
3. **Manage Images**: Upload images once, use in both languages
4. **Preview Changes**: Use your Astro dev server to preview changes

## 🔧 Customization

To modify the CMS configuration:

1. Edit `public/admin/config.yml`
2. Add new fields, collections, or widgets as needed
3. Refer to the [Sveltia CMS documentation](https://github.com/sveltia/sveltia-cms) for advanced configurations

## 🚨 Important Notes

1. **Repository Access**: Make sure the GitHub OAuth app has access to your repository
2. **Branch Protection**: If you have branch protection rules, ensure the CMS can create pull requests
3. **File Permissions**: The CMS needs write access to the content folders
4. **Locale Structure**: The CMS respects your existing i18n folder structure
5. **Content Consistency**: Keep content structure consistent between languages

## 🆘 Troubleshooting

### CMS won't load
- Check if the GitHub OAuth app is configured correctly
- Verify the repository name in `config.yml`
- Ensure the site is deployed and accessible

### Can't see blog/events content
- Verify the folder paths match your actual i18n structure:
  - `src/content/blog/pt/` and `src/content/blog/en/`
  - `src/content/events/pt/` and `src/content/events/en/`

### Can't save content
- Check GitHub repository permissions
- Verify branch protection settings
- Ensure the file paths in config match your actual structure

### Images not uploading
- Check if the `public/images/uploads/` directory exists
- Verify media folder permissions
- Ensure the public folder path is correct

## 📚 Resources

- [Sveltia CMS Documentation](https://github.com/sveltia/sveltia-cms)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Paraglide JS i18n](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps) 