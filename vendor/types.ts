/// WIDGET

export type WidgetContext = {
  /** Developer supplied assets for this widget */
  assets: {
    images?: Record<string, string>
  }
  /** User supplied settings for this widget */
  settings: Record<string, unknown>
  /** The "current" timestamp as Unix timestamp in milliseconds */
  now: number
  /** Pseudorandom number generator */
  random(): number
  /** The size of the widget on the page */
  size: { width: number; height: number }
}

export type Widget<T extends object> = {
  name?: string
  initialState?: T | ((ctx: WidgetContext) => T)
  handleEvent?: (event: unknown, state: T, ctx: WidgetContext) => unknown
}

export type EKGPublicSDK = {
  /** Register a widget with the SDK */
  registerWidget<T extends object>(widget: Widget<T>): void

  /** Collection of helper functions widget developers can use */
  utils: {
    /** Converts an array of chat messages to a text string */
    chatToText: (nodes: ChatNode[]) => string
  }
}

/// CHAT NODES

export interface EmojiChatNode {
  readonly type: 'emoji'
  readonly id: string
  readonly code: string
  readonly authorId: string | null
  readonly src: string | null
  readonly srcSet: string | null
}

export interface LinkChatNode {
  readonly type: 'link'
  readonly href: string
  readonly nodes: readonly (TextChatNode | EmojiChatNode)[]
}

export interface MentionChatNode {
  readonly type: 'mention'
  readonly mentionedId: string
  readonly mentionedDisplayName: string
}

export interface TextChatNode {
  readonly type: 'text'
  readonly text: string
}

export type ChatNode = EmojiChatNode | LinkChatNode | MentionChatNode | TextChatNode
