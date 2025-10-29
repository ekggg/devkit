// © Teacuppity design, © Sonnelia code. All rights reserved.
// Do not redistribute or edit without obtaining explicit permission
// Last updated 07/04/2025

import type { TickEvent, WidgetContext, WidgetSettings } from '../vendor/types'
import type {
  EkgChannelFollowed,
  EkgChatSent,
  EkgEventDeleted,
  EkgSubscriptionGifted,
  EkgSubscriptionRenewed,
  EkgSubscriptionStarted,
  EkgTipSent,
  EkgUserMessagesCleared,
} from '../vendor/types.gen'

type Message = {}

type State = {
  messages: Message[]
}

EKG.registerWidget<State>({
  name: 'NightGlowChat',

  initialState: (_ctx) => ({
    messages: [],
  }),

  handleEvent(event, state, ctx) {
    switch (event.type) {
      case 'ekg.chat.sent':
        return addMessage(event, state, ctx)
      case 'ekg.event.deleted':
        return deleteMessage(event, state, ctx)
      case 'ekg.user.messages_cleared':
        return deleteMessages(event, state, ctx)
      case 'ekg.channel.followed':
        return addFollower(event, state, ctx)
      case 'ekg.subscription.started':
        return addNewSub(event, state, ctx)
      case 'ekg.subscription.renewed':
        return addResub(event, state, ctx)
      case 'ekg.subscription.gifted':
        return addGiftSub(event, state, ctx)
      case 'ekg.tip.sent':
        return event.data.currency === 'BITS' ? addCheer(event, state, ctx) : addTip(event, state, ctx)
      // case 'ekg.channel.raided': // Doesn't exist yet
      //   return addRaid(event, state, ctx)
      case 'TICK':
        return cleanup(event, state, ctx)
    }
    return state
  },
})

const push = (ctx: WidgetContext, state: State, msg: Message) => {
  const msgLimit = 1 - (ctx.settings.messageLimit ? ctx.settings.messageLimitAmount : 100)
  return {
    ...state,
    messages: [...state.messages.slice(msgLimit), msg],
  }
}

const deleteMessage = ({ data }: EkgEventDeleted, state: State, _ctx: WidgetContext) => {
  state.messages = state.messages.filter((m) => m.id !== data.deletedMessageId)
  return state
}

const deleteMessages = ({ data }: EkgUserMessagesCleared, state: State, _ctx: WidgetContext) => {
  state.messages = state.messages.filter((m) => m.userId !== data.moderatedUserId)
  return state
}

const addMessage = ({ id, data }: EkgChatSent, state: State, ctx: WidgetContext) => {
  // ignore set users
  const ignored = ctx.settings.ignoredUsers.map((v) => v.toLowerCase())
  const name = data.authorDisplayName.toLowerCase()
  if (ignored.includes(name)) return state

  // Filter out commands if hideCommands is enabled
  const messageText = EKG.utils.chatToText(data.message)
  if (ctx.settings.hideCommands && messageText.startsWith('!')) {
    return state
  }

  return push(ctx, state, {
    render: 'message',
    id,
    userId: data.authorId,
    username: data.authorDisplayName,
    message: data.message,
    role: calcRole(data),
    emotesOnly: isEmotesOnly(data.message, ctx.settings),
    subTier: calcSubTier(data),
    expiresAt: ctx.settings.hideAfter ? ctx.now + ctx.settings.hideAfterAmount * 1000 : null,
  })
}

const addFollower = (event: EkgChannelFollowed, state: State, ctx: WidgetContext) => {
  if (!ctx.settings.followerShow) return state

  return push(ctx, state, {
    render: 'alert',
    id: event.id,
    type: 'follower',
    username: event.data.followerDisplayName,
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
}

const addNewSub = (event: EkgSubscriptionStarted, state: State, ctx: WidgetContext) => {
  if (!ctx.settings.subscriberShow) return state

  return push(ctx, state, {
    render: 'alert',
    id: event.id,
    type: 'subscriber',
    mode: 'new_sub',
    username: event.data.subscriberDisplayName,
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
}

const addResub = (event: EkgSubscriptionRenewed, state: State, ctx: WidgetContext) => {
  if (!ctx.settings.subscriberShow) return state

  return push(ctx, state, {
    render: 'alert',
    id: event.id,
    type: 'subscriber',
    mode: 'resub',
    username: event.data.subscriberDisplayName,
    months: event.data.monthsSubscribed,
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
}

const addGiftSub = (event: EkgSubscriptionGifted, state: State, ctx: WidgetContext) => {
  if (!ctx.settings.subscriberShow) return state

  return push(ctx, state, {
    render: 'alert',
    id: event.id,
    type: 'subscriber',
    mode: event.data.recipientDisplayName ? 'single_gift' : 'bulk_gift',
    username: event.data.gifterDisplayName,
    recipient: event.data.recipientDisplayName,
    amount: event.data.giftCount,
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
}

const addCheer = (event: EkgTipSent, state: State, ctx: WidgetContext) => {
  if (!ctx.settings.cheerShow) return state
  if (event.data.amountCents < ctx.settings.cheerMinAmount) return state

  return push(ctx, state, {
    render: 'alert',
    id: event.id,
    type: 'cheer',
    amount: event.data.amountCents,
    username: `${event.data.amountCents} bit${event.data.amountCents == 1 ? '' : 's'}`,
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
}

const addTip = (event: EkgTipSent, state: State, ctx: WidgetContext) => {
  if (!ctx.settings.tipShow) return state
  if (event.data.amountCents < ctx.settings.tipMinAmount) return state

  return push(ctx, state, {
    render: 'alert',
    id: event.id,
    type: 'tip',
    username: event.data.tipperDisplayName,
    position: ctx.settings.currencyPosition,
    symbol: ctx.settings.currency,
    amount: (event.data.amountCents / 100).toFixed(2),
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
}

const addRaid = (event, state: State, ctx: WidgetContext) => {
  return state
  /*
  if (!ctx.settings.raidShow) return state
  if (event.data.viewers < ctx.settings.raidMinAmount) return state

  return push({
    render: 'alert',
    id: event.id,
    type: 'tip',
    username: event.data.tipperDisplayName,
    position: ctx.settings.currencyPosition,
    symbol: ctx.settings.currency,
    amount: (event.data.amountCents / 100).toFixed(2),
    status: ctx.random() > 0.5 ? 'online' : 'busy',
  })
  */
}

const cleanup = (event: TickEvent, state: State, ctx: WidgetContext) => {
  const newMessages = state.messages.filter((m) => !m.expiresAt || m.expiresAt >= ctx.now)
  if (newMessages.length === state.messages.length) return state
  return { ...state, messages: newMessages }
}

const calcRole = (data) => {
  if (data.isBroadcaster) return 'broadcaster'
  if (data.isModerator) return 'moderator'
  if (data.isVip) return 'vip'
  if (data.isSubscriber) return 'subscriber'
  return null
}

const isEmotesOnly = (message, settings: WidgetSettings) => {
  let emoteCount = 0
  for (const n of message) {
    switch (n.type) {
      case 'text':
        if (n.text.trim() !== '') return false
        break
      case 'emoji':
        emoteCount++
        break
      default:
        return false
    }
  }

  return emoteCount <= settings.bigEmoteAmount
}

const calcSubTier = (data) => {
  if (data.isBroadcaster) return 0
  if (data.platform !== 'twitch') return data.isSubscriber ? 1 : 0
  // TODO
  return data.isSubscriber ? 1 : 0
  // data.raw.badges
}
