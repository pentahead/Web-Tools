import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ResizePreset, ResizeOptions } from '@/lib/imageUtils';
import { calculateTargetDimensions } from '@/lib/imageUtils';
import { Lock, Unlock } from 'lucide-react';

interface ImageResizeControlsProps {
  originalWidth: number;
  originalHeight: number;
  value: ResizeOptions;
  onChange: (options: ResizeOptions) => void;
}

export default function ImageResizeControls({
  originalWidth,
  originalHeight,
  value,
  onChange,
}: ImageResizeControlsProps) {
  const [widthInput, setWidthInput] = useState<string>(
    value.customWidth ? String(value.customWidth) : String(originalWidth)
  );
  const [heightInput, setHeightInput] = useState<string>(
    value.customHeight ? String(value.customHeight) : String(originalHeight)
  );

  useEffect(() => {
    const target = calculateTargetDimensions(originalWidth, originalHeight, value);
    setWidthInput(String(target.width));
    setHeightInput(String(target.height));
  }, [originalWidth, originalHeight, value.preset, value.maintainAspectRatio]);

  const handlePresetChange = (preset: ResizePreset) => {
    if (preset === 'custom') {
      const target = calculateTargetDimensions(originalWidth, originalHeight, value);
      onChange({
        ...value,
        preset: 'custom',
        customWidth: target.width,
        customHeight: target.height,
      });
    } else {
      const target = calculateTargetDimensions(originalWidth, originalHeight, {
        ...value,
        preset,
      });
      onChange({
        ...value,
        preset,
        customWidth: target.width,
        customHeight: target.height,
      });
    }
  };

  const handleWidthChange = (valStr: string) => {
    setWidthInput(valStr);
    const newWidth = parseInt(valStr, 10);

    if (!isNaN(newWidth) && newWidth > 0) {
      let newHeight = value.customHeight || originalHeight;
      if (value.maintainAspectRatio && originalWidth > 0) {
        newHeight = Math.max(1, Math.round((newWidth * originalHeight) / originalWidth));
        setHeightInput(String(newHeight));
      }
      onChange({
        ...value,
        preset: 'custom',
        customWidth: newWidth,
        customHeight: newHeight,
      });
    }
  };

  const handleHeightChange = (valStr: string) => {
    setHeightInput(valStr);
    const newHeight = parseInt(valStr, 10);

    if (!isNaN(newHeight) && newHeight > 0) {
      let newWidth = value.customWidth || originalWidth;
      if (value.maintainAspectRatio && originalHeight > 0) {
        newWidth = Math.max(1, Math.round((newHeight * originalWidth) / originalHeight));
        setWidthInput(String(newWidth));
      }
      onChange({
        ...value,
        preset: 'custom',
        customWidth: newWidth,
        customHeight: newHeight,
      });
    }
  };

  const toggleAspectRatio = () => {
    const nextAspect = !value.maintainAspectRatio;
    if (nextAspect && originalWidth > 0 && originalHeight > 0) {
      const curW = parseInt(widthInput, 10) || originalWidth;
      const calcH = Math.max(1, Math.round((curW * originalHeight) / originalWidth));
      setHeightInput(String(calcH));
      onChange({
        ...value,
        maintainAspectRatio: true,
        preset: value.preset === 'original' ? 'original' : 'custom',
        customWidth: curW,
        customHeight: calcH,
      });
    } else {
      onChange({
        ...value,
        maintainAspectRatio: nextAspect,
      });
    }
  };

  const currentDims = calculateTargetDimensions(originalWidth, originalHeight, value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[14px] font-display font-medium text-foreground">
          Resize
        </label>
        <span className="text-[11px] font-display font-medium text-muted-foreground">
          {currentDims.width} × {currentDims.height} px
        </span>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-secondary rounded-[8px] border border-border">
        {(['original', '75%', '50%', '25%', 'custom'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePresetChange(p)}
            className={cn(
              "py-1.5 text-[11px] font-display font-medium rounded-[6px] capitalize transition-all text-center truncate",
              value.preset === p
                ? "bg-card text-foreground shadow-sm font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === 'original' ? 'Original' : p === 'custom' ? 'Custom' : p}
          </button>
        ))}
      </div>

      {/* Custom width/height inputs */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-display font-medium text-muted-foreground mb-1 block">
              Width (px)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={widthInput}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-full bg-secondary border border-border rounded-[6px] px-3 py-2 text-[14px] font-display text-foreground focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
          <div>
            <label className="text-[12px] font-display font-medium text-muted-foreground mb-1 block">
              Height (px)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={heightInput}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-full bg-secondary border border-border rounded-[6px] px-3 py-2 text-[14px] font-display text-foreground focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAspectRatio}
          className={cn(
            "flex items-center gap-2 text-[12px] font-display transition-colors py-1.5 px-2.5 rounded-[6px] border w-full justify-center",
            value.maintainAspectRatio
              ? "text-primary hover:text-primary-hover bg-primary/5 border-primary/20"
              : "text-muted-foreground hover:text-foreground bg-secondary/50 border-border"
          )}
        >
          {value.maintainAspectRatio ? (
            <>
              <Lock size={14} strokeWidth={2} />
              <span>Maintain aspect ratio (ON)</span>
            </>
          ) : (
            <>
              <Unlock size={14} strokeWidth={2} />
              <span>Maintain aspect ratio (OFF)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
