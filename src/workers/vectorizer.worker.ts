import ImageTracer from 'imagetracerjs';
import type { Options } from 'imagetracerjs';

export type WorkerRequest = {
  type: "convert";
  imageData: ImageData;
  settings: {
    mode: 'color' | 'grayscale' | 'bw';
    detail: 'low' | 'medium' | 'high';
    colors: number;
  };
};

export type WorkerResponse = {
  type: "progress" | "success" | "error";
  progress?: number;
  svg?: string;
  error?: string;
};

// Handle incoming messages from the main thread
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, imageData, settings } = e.data;

  if (type === 'convert') {
    try {
      // Build options based on settings
      const options: Options = buildOptions(settings);
      
      // Perform vectorization (this is a synchronous, CPU-intensive call in imagetracerjs)
      // So it will block this worker thread until complete, but keep the main UI thread free.
      const svgString = ImageTracer.imagedataToSVG(imageData, options);
      
      // Send success back to main thread
      self.postMessage({
        type: 'success',
        svg: svgString
      } as WorkerResponse);

    } catch (err: any) {
      self.postMessage({
        type: 'error',
        error: err.message || "Vectorization failed"
      } as WorkerResponse);
    }
  }
};

function buildOptions(settings: WorkerRequest['settings']): Options {
  // Start with some baseline defaults
  const opt: Options = {
    viewbox: true,
    scale: 1,
    desc: false,
    colorsampling: 0,
  };

  // 1. Detail Level mapping
  // ltres (straight line error threshold) and qtres (quadratic spline error threshold)
  // lower = more detailed
  switch (settings.detail) {
    case 'low':
      opt.ltres = 10;
      opt.qtres = 10;
      opt.pathomit = 16;
      opt.blurradius = 5;
      opt.blurdelta = 64;
      break;
    case 'medium':
      opt.ltres = 1;
      opt.qtres = 1;
      opt.pathomit = 8;
      opt.blurradius = 1;
      opt.blurdelta = 20;
      break;
    case 'high':
      opt.ltres = 0.1;
      opt.qtres = 0.1;
      opt.pathomit = 0;
      opt.blurradius = 0;
      opt.blurdelta = 0;
      break;
  }

  // 2. Mode and Colors
  if (settings.mode === 'bw') {
    opt.colorquantcycles = 3;
    opt.numberofcolors = 2; // Black and white (or mostly)
    // For pure B/W we could tweak palettes, but numberofcolors=2 usually gives 2 colors.
  } else if (settings.mode === 'grayscale') {
    opt.colorquantcycles = 3;
    opt.numberofcolors = settings.colors || 8;
    opt.colorsampling = 0;
    // Grayscale requires color quantization to produce grayscale palette,
    // imagetracerjs doesn't have a strict grayscale enforcer without customizing palettes, 
    // so we just rely on standard quantization for this MVP, or we can preprocess image in canvas!
    // But for now, we pass standard options.
  } else {
    // Color mode
    opt.colorquantcycles = 3;
    opt.numberofcolors = settings.colors;
    opt.colorsampling = 0;
  }

  return opt;
}
