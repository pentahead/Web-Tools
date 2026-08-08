declare module 'imagetracerjs' {
  export interface Options {
    // Edge node options
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    
    // Color options
    colorquantcycles?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorsampling?: number;
    
    // SVG options
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
    
    // Blur
    blurradius?: number;
    blurdelta?: number;
  }

  // imagedataToSVG(imgd, options)
  export function imagedataToSVG(
    imgd: ImageData,
    options?: Options | string
  ): string;
  
  export function imageToSVG(
    url: string,
    callback: (svgStr: string) => void,
    options?: Options | string
  ): void;

  export function appendSVGString(svgStr: string, parentId: string): void;
}
