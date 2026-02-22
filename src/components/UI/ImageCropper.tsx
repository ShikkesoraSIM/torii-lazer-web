import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import { FiX, FiCheck, FiRotateCw } from 'react-icons/fi';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  src: string;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onCropComplete: (croppedImage: File) => void;
  onCancel: () => void;
  fileName?: string;
  isUploading?: boolean;
  uploadingText?: string;
}

const compressImage = (
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve) => {
    const { width, height } = canvas;
    let newWidth = width;
    let newHeight = height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      newWidth = width * ratio;
      newHeight = height * ratio;
    }

    const compressCanvas = document.createElement('canvas');
    const compressCtx = compressCanvas.getContext('2d')!;
    compressCanvas.width = newWidth;
    compressCanvas.height = newHeight;

    compressCtx.imageSmoothingEnabled = true;
    compressCtx.imageSmoothingQuality = 'high';
    compressCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

    compressCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
  });
};

const getCroppedImg = async (
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation: number,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const rotRad = (rotation * Math.PI) / 180;

  if (rotation % 180 === 90) {
    canvas.width = crop.height;
    canvas.height = crop.width;
  } else {
    canvas.width = crop.width;
    canvas.height = crop.height;
  }

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotRad);

  const drawWidth = crop.width;
  const drawHeight = crop.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();

  return compressImage(canvas, maxWidth, maxHeight, quality);
};

const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  aspectRatio,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.8,
  onCropComplete,
  onCancel,
  fileName = 'cropped-image.jpg',
  isUploading = false,
  uploadingText = 'Uploading...'
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    };
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    let initialCrop: Crop;

    if (aspectRatio) {
      initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 80,
          },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      );
    } else {
      initialCrop = {
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      };
    }

    setCrop(initialCrop);
  }, [aspectRatio]);

  const handleCropConfirm = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        rotation,
        maxWidth,
        maxHeight,
        quality
      );

      const croppedFile = new File([croppedImageBlob], fileName, {
        type: 'image/jpeg',
      });

      onCropComplete(croppedFile);
    } catch (error) {
      console.error('Image crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [completedCrop, rotation, maxWidth, maxHeight, quality, fileName, onCropComplete]);

  const handleRotate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Crop Image
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              disabled={isProcessing || isUploading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRotateCw className="w-4 h-4" />
              Rotate
            </button>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {aspectRatio ? `Ratio ${aspectRatio}:1` : 'Free crop'} | Max {maxWidth}x{maxHeight}px
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={50}
              minHeight={50}
              keepSelection
            >
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full max-h-[500px] object-contain"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease',
                }}
              />
            </ReactCrop>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropConfirm}
            disabled={!completedCrop || isProcessing || isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploadingText}
              </>
            ) : isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FiCheck className="w-4 h-4" />
                Confirm Crop
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
