export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Resolution = '480p' | '720p' | '1080p' | '4k';

export interface ExportJob {
  id: string;
  project_id: string;
  status: ExportStatus;
  output_format: string;
  resolution: Resolution;
  download_url?: string;
  created_at: string;
  completed_at?: string;
}

export interface ExportProgress {
  export_id: string;
  status: ExportStatus;
  progress: number;
  message: string;
  download_url?: string;
}
