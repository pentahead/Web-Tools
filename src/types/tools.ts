import type { LucideIcon } from 'lucide-react';

export type ToolCategory = 'image' | 'pdf';

export type Tool = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  href?: string;
  status: 'available' | 'coming-soon';
};
