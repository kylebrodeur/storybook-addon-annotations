export type AnnotationAuthor = 'human' | 'agent';
export type ThreadStatus = 'open' | 'resolved';

/**
 * Where a thread is anchored. `elementKey` is a `data-annotation-anchor` value
 * or `STORY_ROOT_KEY`; `point` fractions are clamped `[0,1]` of the anchor
 * element's bounding rect so pins reposition across viewport/zoom changes.
 */
export interface AnnotationAnchor {
  storyId: string;
  elementKey: string;
  point: { xFraction: number; yFraction: number };
}

export interface AnnotationMessage {
  id: string;
  author: AnnotationAuthor;
  authorName?: string;
  body: string;
  createdAt: string;
}

/** `messages[0]` is the root comment. `storyTitle` is captured at create for readable exports/badges. */
export interface AnnotationThread {
  id: string;
  anchor: AnnotationAnchor;
  storyTitle?: string;
  status: ThreadStatus;
  messages: AnnotationMessage[];
  createdAt: string;
  updatedAt: string;
}

export type NewMessage = { author: AnnotationAuthor; authorName?: string; body: string };

export interface AnnotationCreateRequest {
  anchor: AnnotationAnchor;
  storyTitle?: string;
  message: NewMessage;
}

export interface AnnotationReplyRequest {
  id: string;
  message: NewMessage;
}

export interface AnnotationStatusRequest {
  id: string;
  status: ThreadStatus;
}

export interface AnnotationsParameters {
  disable?: boolean;
  currentUser?: string;
}

export interface AnnotationsPresetOptions {
  storeFile?: string;
}

export interface AnnotationGesturePayload {
  storyId: string;
  elementKey: string;
  point: { xFraction: number; yFraction: number };
}
