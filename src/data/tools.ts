import { ImageIcon, FileText, FileImage, FileDown, Layers } from 'lucide-react';
import type { Tool } from '../types/tools';

export const tools: Tool[] = [
  {
    id: "image-to-svg",
    name: "Image to SVG",
    description: "Convert PNG and JPG images into SVG.",
    category: "image",
    icon: ImageIcon,
    href: "/tools/image-to-svg",
    status: "available",
  },
  {
    id: "image-to-pdf",
    name: "Image to PDF",
    description: "Convert images into PDF documents.",
    category: "image",
    icon: FileText,
    href: "/tools/image-to-pdf",
    status: "available",
  },
  {
    id: "pdf-to-image",
    name: "PDF to Image",
    description: "Convert PDF pages into images.",
    category: "pdf",
    icon: FileImage,
    status: "coming-soon",
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce PDF file size.",
    category: "pdf",
    icon: FileDown,
    status: "coming-soon",
  },
  {
    id: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one.",
    category: "pdf",
    icon: Layers,
    status: "coming-soon",
  },
];
