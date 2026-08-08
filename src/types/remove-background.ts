export interface RemoveBackgroundSettings {
  // Empty for now, but allows future expansion (e.g. edge smoothing)
}

export type WorkerRequest = {
  type: 'process';
  file: File;
  settings: RemoveBackgroundSettings;
};

export type WorkerResponse = 
  | { type: 'progress'; message: string; percent: number }
  | { type: 'success'; blob: Blob }
  | { type: 'error'; error: string };
