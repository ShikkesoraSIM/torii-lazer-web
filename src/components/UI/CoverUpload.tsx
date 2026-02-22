import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiUpload, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { userAPI } from '../../utils/api';
import ImageCropper from './ImageCropper';
import ConfirmationDialog from './ConfirmationDialog';

interface CoverUploadProps {
  userId?: number;
  currentCoverUrl?: string;
  onUploadSuccess: (coverUrl: string) => void;
  onClose: () => void;
}

const CoverUpload: React.FC<CoverUploadProps> = ({
  userId,
  currentCoverUrl,
  onUploadSuccess,
  onClose,
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'select' | 'crop'>('select');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
  const [showNsfwPrompt, setShowNsfwPrompt] = useState(false);
  const [pendingCroppedFile, setPendingCroppedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      toast.error('Only PNG, JPEG, and GIF images are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size cannot exceed 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImgSrc(e.target?.result as string);
      setOriginalFileName(file.name);
      setStep('crop');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const uploadCover = async (croppedFile: File, nsfwFlag: boolean) => {
    if (!userId) {
      toast.error('Missing user ID.');
      return;
    }

    setIsUploading(true);
    try {
      const response = await userAPI.uploadCover(croppedFile, nsfwFlag);
      toast.success('Cover uploaded successfully.');
      onUploadSuccess(response.cover_url);
      onClose();
    } catch (error: any) {
      console.error('Cover upload failed:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Cover upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (isNsfw) {
      await uploadCover(croppedFile, true);
      return;
    }

    // Close cropper first so the confirmation dialog is always fully visible.
    setStep('select');
    setImgSrc('');
    setPendingCroppedFile(croppedFile);
    setShowNsfwPrompt(true);
  };

  const handleNsfwPromptChoice = async (nsfwChoice: boolean) => {
    const fileToUpload = pendingCroppedFile;
    setShowNsfwPrompt(false);
    setPendingCroppedFile(null);
    setIsNsfw(nsfwChoice);

    if (!fileToUpload) {
      return;
    }

    await uploadCover(fileToUpload, nsfwChoice);
  };

  const closeNsfwPrompt = () => {
    setShowNsfwPrompt(false);
    setPendingCroppedFile(null);
  };

  const handleCropCancel = () => {
    setStep('select');
    setImgSrc('');
    setOriginalFileName('');
    setShowNsfwPrompt(false);
    setPendingCroppedFile(null);
  };

  return createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
    >
      <div
        className="bg-card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 'select' ? 'Upload Cover' : 'Crop Cover'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {currentCoverUrl && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Cover</p>
                  <img
                    src={currentCoverUrl}
                    alt="Current cover"
                    className="w-full max-w-md h-32 mx-auto object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 mb-4 transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-osu-pink bg-osu-pink/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-osu-pink/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-osu-pink' : 'text-gray-400'}`} />
                <p className={`mb-2 ${isDragOver ? 'text-osu-pink' : 'text-gray-600 dark:text-gray-400'}`}>
                  {isDragOver ? 'Drop file to upload' : 'Click to select an image or drag it here'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Supports PNG, JPEG, GIF. Max 10MB.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  Recommended size: 2000x500 (4:1).
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto mt-2 block bg-osu-pink hover:bg-osu-pink/90 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Select Image
              </button>

              <button
                type="button"
                onClick={() => setIsNsfw((prev) => !prev)}
                className={`mt-6 inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                  isNsfw
                    ? 'bg-red-500/30 border-red-300/60 text-red-50 shadow-[0_0_0_2px_rgba(239,68,68,0.28)]'
                    : 'bg-red-500/14 border-red-400/35 text-red-100/95 hover:bg-red-500/20 hover:border-red-300/45'
                }`}
              >
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${isNsfw ? 'bg-red-200 animate-pulse' : 'bg-red-300/85'}`} />
                Is this NSFW / suggestive?
              </button>
            </div>
          )}
        </div>
      </div>

      {step === 'crop' && imgSrc && !showNsfwPrompt && (
        <ImageCropper
          src={imgSrc}
          aspectRatio={4}
          maxWidth={2000}
          maxHeight={500}
          quality={0.9}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          fileName={originalFileName}
          isUploading={isUploading}
          uploadingText="Uploading cover..."
        />
      )}

      <ConfirmationDialog
        isOpen={showNsfwPrompt}
        title="Is this image NSFW?"
        message="Our server allows NSFW assets as long as you point it out. We use this flag to protect users who should not or do not want to see suggestive media."
        confirmLabel="Yes, mark as NSFW"
        secondaryLabel="No, upload as safe"
        cancelLabel="Cancel"
        onConfirm={() => void handleNsfwPromptChoice(true)}
        onSecondary={() => void handleNsfwPromptChoice(false)}
        onCancel={closeNsfwPrompt}
        isDanger
      />
    </div>,
    document.body
  );
};

export default CoverUpload;
