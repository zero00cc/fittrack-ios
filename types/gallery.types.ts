export type GalleryCategory = 'meal' | 'workout';

export interface GalleryItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  category: GalleryCategory;
  mimeType: string;
  blob: Blob;
}
