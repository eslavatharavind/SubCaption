import { useState } from 'react';
import { uploadApi, UploadResponseData } from '@/lib/api/upload';

export function useUpload() {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = async (file: File, language: string): Promise<UploadResponseData | null> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const res = await uploadApi.uploadVideo(file, language, (evt) => {
        const total = evt.total || file.size;
        if (total > 0) {
          const percent = Math.min(100, Math.round((evt.loaded * 100) / total));
          setUploadProgress(percent);
        }
      });
      return res.data;
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadVideo, isUploading, uploadProgress, error, setError };
}
