'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useUpload } from '@/hooks/useUpload';
import { LanguageOption, CAPTION_OUTPUT_MODES } from '@/types/project';
import { useAuth } from '@/lib/auth-context';
import { addRecentProject } from '@/lib/recentProjects';

const LANGUAGES: LanguageOption[] = CAPTION_OUTPUT_MODES;

const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { uploadVideo, isUploading, uploadProgress, error: uploadError, setError } = useUpload();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  const allowedExtensions = ['.mp4', '.mov', '.webm'];

  const validateAndSetFile = (file: File) => {
    setError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(ext);

    if (!isValidType) {
      setError(`Invalid file format. Please select a .mp4, .mov, or .webm video.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File size (${fileSizeMb} MB) exceeds maximum allowed limit (${MAX_FILE_SIZE_MB} MB).`);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveVideo = () => {
    if (isUploading) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isContinueEnabled = Boolean(selectedFile && selectedLanguage && !isUploading);

  const handleContinue = async () => {
    if (!selectedFile || !selectedLanguage || isUploading) return;

    const data = await uploadVideo(selectedFile, selectedLanguage);
    if (data && data.project_id) {
      if (user) {
        addRecentProject(user.id, {
          id: data.project_id,
          name: data.filename.replace(/\.[^.]+$/, '') || data.filename,
          filename: data.filename,
          language: selectedLanguage,
          fileSize: data.file_size,
          duration: data.duration ?? null,
          createdAt: new Date().toISOString(),
        });
      }
      router.push(`/editor/${data.project_id}?filename=${encodeURIComponent(data.filename)}&language=${selectedLanguage}`);
    }
  };

  return (
    <AppShell title="Create Video">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Create a new video
          </h2>
          <p className="text-brand-muted text-sm mt-1">
            Upload your video and create captions in seconds.
          </p>
        </div>

        {/* Error Notification */}
        {uploadError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 flex items-start justify-between shadow-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 ml-4 w-8 h-8 shrink-0 flex items-center justify-center text-lg"
            >
              &times;
            </button>
          </div>
        )}

        {/* Step 1: Upload Card */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wider">
            1. Video File
          </label>

          {!selectedFile ? (
            /* Drag & Drop Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                  : 'border-[#262D36] bg-[#151A21] hover:border-brand-subtle hover:bg-[#1B2129]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                onChange={handleInputChange}
                className="hidden"
                disabled={isUploading}
              />

              <div className="w-16 h-16 bg-[#11151A] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#262D36] shadow-inner text-primary-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                Drag &amp; drop your video here
              </h3>
              <p className="text-brand-muted text-xs mb-6">
                Supports MP4 • MOV • WebM (Maximum size: 500 MB)
              </p>

              <Button
                type="button"
                variant="primary"
                size="md"
                className="pointer-events-none shadow-md shadow-primary-600/20"
              >
                Choose Video
              </Button>
            </div>
          ) : (
            /* File Preview Card */
            <div className="bg-[#151A21] rounded-2xl border border-[#262D36] p-4 sm:p-6 space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#262D36]">
                <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                  <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center text-primary-400 shrink-0 border border-primary-500/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-bold text-white truncate">{selectedFile.name}</h4>
                    <p className="text-xs text-brand-muted">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveVideo}
                  disabled={isUploading}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 shrink-0 text-xs"
                >
                  Remove / Change
                </Button>
              </div>

              {previewUrl && (
                <div className="relative rounded-xl overflow-hidden bg-black max-h-[50dvh] sm:max-h-[360px] flex items-center justify-center border border-[#262D36]">
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className="max-h-[50dvh] sm:max-h-[360px] max-w-full w-auto mx-auto rounded-xl"
                  />
                </div>
              )}

              {isUploading && (
                <ProgressBar
                  progress={uploadProgress}
                  label="Uploading video..."
                  statusText="Uploading"
                />
              )}
            </div>
          )}
        </div>

        {/* Step 2: Language Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wider">
            2. Caption Language
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  disabled={isUploading}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex flex-col justify-between min-w-0 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/30 shadow-lg'
                      : 'border-[#262D36] bg-[#151A21] hover:border-brand-subtle hover:bg-[#1B2129]'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-[#262D36] bg-[#11151A]'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{lang.name}</p>
                    <p className="text-xs text-brand-subtle mt-0.5">{lang.nativeName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-6 border-t border-[#262D36] flex justify-between items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <Link href="/dashboard">
            <Button variant="ghost" size="md" className="text-brand-muted hover:text-white" disabled={isUploading}>
              Cancel
            </Button>
          </Link>

          <Button
            variant="primary"
            size="lg"
            disabled={!isContinueEnabled}
            isLoading={isUploading}
            onClick={handleContinue}
            className={`px-8 shadow-lg transition-all ${
              isContinueEnabled
                ? 'shadow-primary-600/25 cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Continue \u2192'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
