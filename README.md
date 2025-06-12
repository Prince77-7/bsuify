# 🏡 RealtyCanvas - Professional Real Estate Photo Editor

A beautiful, modern web application designed specifically for real estate professionals to create stunning property visualizations with precise drawing tools and logo overlays.

![RealtyCanvas Interface](https://via.placeholder.com/800x400/0ea5e9/ffffff?text=RealtyCanvas+Interface)

## ✨ Features

### 🎨 Professional Drawing Tools
- **Precise Line Drawing**: Perfect for marking property boundaries
- **Shape Tools**: Rectangles, circles, and polygons for different property features
- **Text Annotations**: Add labels and descriptions
- **Move Tool**: Reposition and adjust your drawings

### 🎯 Smart Canvas System
- **High-Resolution Canvas**: 1200×800px workspace optimized for property photos
- **Zoom Controls**: 25% to 200% zoom with smooth scaling
- **Grid Overlay**: Optional grid for precise alignment
- **Layer Management**: Organize your work with multiple layers

### 🏷️ Logo & Branding Overlay
- **Logo Upload**: Support for PNG, JPG, and WebP formats
- **Precise Positioning**: Pixel-perfect X/Y coordinate controls
- **Flexible Scaling**: 10% to 200% size adjustment
- **Opacity Controls**: 10% to 100% transparency settings
- **Multiple Logos**: Add and manage multiple brand elements

### 🎨 Beautiful Design System
- **Custom Color Palette**: Carefully curated colors for real estate
- **Glass Morphism Effects**: Modern, professional aesthetic
- **Smooth Animations**: Delightful micro-interactions
- **Responsive Layout**: Works beautifully on all screen sizes

### 📸 **High-Resolution Image Support**
- **Preserves Original Resolution**: Supports 8K, 4K, and other high-resolution photos without downscaling
- **Memory Optimized**: Intelligent handling of large images with safety limits up to 16K resolution
- **Export Quality**: Maintains full resolution in exported images

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/realtycanvas.git
   cd realtycanvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 Usage Guide

### 1. Upload Your Property Photo
- Click "Import Photo" in the header
- Select a high-quality property image
- The image will automatically scale to fit the canvas

### 2. Draw Property Lines
- Select the drawing tool from the left sidebar
- Choose your preferred color and brush size
- Draw precise property boundaries and features
- Use layers to organize different elements

### 3. Add Your Branding
- Open the Logo Overlay panel on the right
- Upload your company logo
- Position and scale it perfectly
- Adjust opacity for watermark effects

### 4. Export Your Work
- Use the Save button to preserve your project
- Download the final image with all overlays

## 🛠️ Tech Stack

- **Frontend Framework**: SvelteKit 2.0
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide Svelte
- **Canvas**: HTML5 Canvas API
- **Type Safety**: TypeScript
- **Build Tool**: Vite

## 🎨 Design Philosophy

RealtyCanvas follows a **"Beauty Meets Function"** approach:

- **Professional Aesthetics**: Clean, modern interface that looks at home in any real estate office
- **Intuitive UX**: Every interaction feels natural and predictable
- **Performance First**: Smooth animations and responsive interactions
- **Accessibility**: WCAG 2.1 compliant design patterns

## 📁 Project Structure

```
src/
├── lib/
│   └── components/
│       ├── Header.svelte          # Main navigation and branding
│       ├── ToolsSidebar.svelte    # Drawing tools and controls
│       ├── Canvas.svelte          # Main editing canvas
│       ├── LogoOverlay.svelte     # Logo management panel
│       └── Welcome.svelte         # Onboarding experience
├── routes/
│   ├── +layout.svelte            # App layout and global styles
│   └── +page.svelte              # Main application page
├── app.css                       # Global styles and Tailwind config
└── app.html                      # HTML template
```

## 🎨 Color System

```css
/* Primary Colors */
--primary-500: #0ea5e9;    /* Ocean Blue */
--forest-500: #22c55e;     /* Forest Green */
--earth-500: #e4915c;      /* Warm Earth */

/* Usage */
- Primary: Actions, highlights, interactive elements
- Forest: Success states, property features
- Earth: Warm accents, logo elements
```

## 🔧 Customization

### Adding New Drawing Tools
1. Add your tool to the `tools` array in `ToolsSidebar.svelte`
2. Implement the tool logic in `Canvas.svelte`
3. Add appropriate icons from Lucide

### Custom Color Themes
Update the `colors` object in `tailwind.config.js`:

```javascript
colors: {
  // Add your brand colors here
  brand: {
    50: '#...',
    // ... your color scale
  }
}
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
npx @vercel/cli --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Svelte Team** for the amazing framework
- **Tailwind CSS** for the utility-first approach
- **Lucide** for the beautiful icon system
- **Real Estate Professionals** who inspired this tool

---

**Built with ❤️ for Real Estate Professionals**

*Transform your property photos into professional visualizations with RealtyCanvas.*
