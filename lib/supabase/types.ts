export type ContentType = "text" | "link" | "image" | "voice"

export interface Item {
  id: string
  type: ContentType
  content: string
  metadata: LinkMeta | ImageMeta | VoiceMeta | Record<string, never>
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface Tag {
  id: string
  name: string
  created_at: string
}

export interface ItemTag {
  item_id: string
  tag_id: string
}

export interface LinkMeta {
  og_title?: string
  og_description?: string
  og_image?: string
  og_url?: string
  og_domain?: string
}

export interface ImageMeta {
  image_url: string
}

export interface VoiceMeta {
  file_url: string
  duration: number
  transcript?: string
}
