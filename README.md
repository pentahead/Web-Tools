# pentTools

pentTools is a production-quality, client-side web application that converts PNG/JPG/JPEG raster images into SVG vector graphics. The entire conversion process happens securely in the browser using Web Workers to ensure a responsive user experience.

## Features

- **Client-Side Processing**: No server or cloud required. Your images never leave your device.
- **Web Worker Vectorization**: Expensive processing happens on a separate thread, keeping the UI smooth.
- **Multiple Color Modes**: Support for full Color, Grayscale, and Black & White tracing.
- **Adjustable Detail**: Change the trace precision depending on your needs.
- **Color Quantization**: Choose how many colors to include in your output.
- **Safe Preview**: SVGs are previewed safely via Blob Object URLs, eliminating XSS risks.
- **Instant Download**: One-click download of your vectorized artwork.

## Technologies Used

- **React + TypeScript + Vite**: Fast, typed development environment.
- **Tailwind CSS v4**: Utility-first styling with modern css variable themes.
- **ImageTracer.js**: The core engine for tracing raster images into vector paths.
- **Lucide React**: Clean, consistent icon set.

## Setup Instructions

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Create a production build:
   ```bash
   npm run build
   ```

## Architecture

- **React Main Thread (`src/App.tsx`)**: Manages UI state, file drag-and-drop, image preview, and settings.
- **Image Utility Layer (`src/lib/imageUtils.ts`)**: Handles reading images via the Canvas API and applying preliminary color mode transformations (e.g., Grayscale or B/W conversions) prior to vectorization.
- **Web Worker (`src/workers/vectorizer.worker.ts`)**: Runs `ImageTracer.js` on an isolated thread. It receives `ImageData` and settings, performs the synchronous CPU-intensive tracing, and returns the SVG string to the main thread.
- **Safe SVG Handling**: The generated SVG string is converted to a Blob with MIME type `image/svg+xml`, and an Object URL is created. This URL is used in an `<img>` tag for preview, preventing the execution of any embedded scripts inside the SVG, and providing a clean way to handle downloads.

## Known Limitations

- **Complex Photographs**: Vectorization is best suited for logos, flat illustrations, and icons. Converting complex photographs can result in extremely large SVG files with thousands of paths.
- **Memory Limits**: Extremely large raster images might cause out-of-memory errors in the browser. A hard limit of 2048px (max dimension) is enforced before processing.

## Testing Performed

- Validated PNG and JPG uploads via drag-and-drop and file picker.
- Validated size constraints (max 10MB) and format constraints.
- Verified successful vectorization of images in Color, Grayscale, and Black & White modes.
- Verified responsive UI across different screen sizes.
- Verified smooth animations and interactions during Web Worker processing (UI does not block).
- Clean Object URL revocation verified on new uploads.
