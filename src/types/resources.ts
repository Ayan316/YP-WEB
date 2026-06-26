// src/types/resources.ts

export type ResourceEnvelope<T> = {
  status: "OK" | "ERROR";
  message: string;
  data: T;
};

export interface ResourceCategory {
  id: string;
  category_name: string;
  banner_text: string | null;
  banner_image_url: string | null;
}

export interface ResourceCategoryRef {
  id: string;
  category_name: string;
}

export type ResourceMediaType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "youtube"
  | "";

export interface ResourceMedia {
  id: string;
  media_type: ResourceMediaType;
  url: string;
  sort_order: number;
}

export interface ResourceListItem {
  id: string;
  title: string;
  excerpt: string;
  category: ResourceCategoryRef;
  thumbnail_url: string | null;
  media_count: number;
  is_featured: boolean;
  published_at: string | null;
  created_at: string | null;
}

export interface ResourceListData {
  count: number;
  total_count: number;
  result: ResourceListItem[];
}

export interface ResourceDetail {
  id: string;
  title: string;
  body: string | null;
  is_featured: boolean;
  view_count: number;
  category: ResourceCategory;
  media: ResourceMedia[];
  published_at: string | null;
  created_at: string | null;
}
