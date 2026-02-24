export function randString(len: number) {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (v) => v.toString(36).slice(-1)).join('')
}

export function simpleHash(str: string, prefix = 'h') {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
  }
  // Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
  return prefix + (hash >>> 0).toString(36).padStart(7, '0')
}

export function defaultEventData(properties: any, state: any) {
  const saved = (name: string, t: string) =>
    !!state?.[name] && (t === 'array' ? Array.isArray(state[name]) : typeof state[name] === t) ? state[name] : null

  return Object.fromEntries(
    Object.entries(properties).map(([name, schema]) => {
      if (name === 'raw') return [name, saved(name, 'object') ?? {}]
      if (name === 'currency') return [name, saved(name, 'string') ?? 'USD']
      if (typeof schema !== 'object' || !schema) return [name, null]
      if ('const' in schema) return [name, schema.const]
      if ('enum' in schema && Array.isArray(schema.enum)) return [name, schema.enum.includes(state?.[name]) ? state[name] : schema.enum[0]]
      if (!('type' in schema)) return [name, null]
      if (name.endsWith('At') && schema.type === 'integer') return [name, saved(name, 'number') ?? Date.now()]
      if (name.endsWith('Cents') && schema.type === 'integer') return [name, saved(name, 'number') ?? 500]
      if (schema.type === 'string') return [name, saved(name, 'string') ?? randString(12)]
      if (schema.type === 'boolean') return [name, saved(name, 'boolean') ?? false]
      if (schema.type === 'integer') return [name, saved(name, 'number') ?? 2]
      if (
        schema.type === 'array' &&
        'items' in schema &&
        typeof schema.items === 'object' &&
        schema.items &&
        '$ref' in schema.items &&
        schema.items.$ref === '#/$defs/ChatNode'
      ) {
        return [name, saved(name, 'array') ?? [{ type: 'text', text: randString(40) }]]
      }
      if (schema.type === 'array') return [name, saved(name, 'array') ?? []]
      return [name, null]
    }),
  )
}

type Platform = 'twitch' | 'youtube'

type TipTuple = {
  amountCents: number
  currency: string
  level: number
}

const twitchEmotes = new Map<string, EKG.EmojiChatNode>(
  [
    { id: 'twitch-25', code: 'Kappa', src: 'https://cdn.ekg.gg/external/jxsLBhiqofLBKoi6yO4Apw2EoH0' },
    { id: 'twitch-36', code: 'PJSalt', src: 'https://cdn.ekg.gg/external/jMPSwX3BhOx8LdE6SKdOCXxcigo' },
    { id: 'twitch-65', code: 'FrankerZ', src: 'https://cdn.ekg.gg/external/KJt0mNgKSn4M6rVWlHRWNSDzE5W' },
    { id: 'twitch-244', code: 'FUNgineer', src: 'https://cdn.ekg.gg/external/BXbAp9ZvTdMEUjnB6CITYWMJlkI' },
    { id: 'twitch-245', code: 'ResidentSleeper', src: 'https://cdn.ekg.gg/external/bm5FyZPxaUaKCv18niMMbBD9bWL' },
    { id: 'twitch-354', code: '4Head', src: 'https://cdn.ekg.gg/external/KKnO0WyUqYOPTVMYPCDdoXE5NnI' },
    { id: 'twitch-3412', code: 'PeoplesChamp', src: 'https://cdn.ekg.gg/external/gJjp74lID21tgVru8pOiDRAIVNv' },
    { id: 'twitch-4240', code: 'PipeHype', src: 'https://cdn.ekg.gg/external/d4uwxMkfdFJH6IkG6aMMQOGFnjb' },
    { id: 'twitch-22639', code: 'BabyRage', src: 'https://cdn.ekg.gg/external/dq3TWHs2pPRH2HfYdxV9kzrd2Sm' },
    { id: 'twitch-27509', code: 'PermaSmug', src: 'https://cdn.ekg.gg/external/GrrJKYiMi6y7zD03UFZaVUVq3As' },
    { id: 'twitch-28087', code: 'WutFace', src: 'https://cdn.ekg.gg/external/LUEDjixu1R0aaFj3ZHjhw8y3O82' },
    { id: 'twitch-58127', code: 'CoolCat', src: 'https://cdn.ekg.gg/external/jKYaOQotolVsMAlcWgnfB7OOXkv' },
    { id: 'twitch-58765', code: 'NotLikeThis', src: 'https://cdn.ekg.gg/external/U6Z7UUnjyw8P82bV12ZN7bQSzkD' },
    { id: 'twitch-64138', code: 'SeemsGood', src: 'https://cdn.ekg.gg/external/WEn86JKMgLf5Ot2ovwBBGXeqZTc' },
    { id: 'twitch-68856', code: 'MingLee', src: 'https://cdn.ekg.gg/external/PwNZkSqAcbA4GdwJWotpO5hGhjP' },
    { id: 'twitch-81103', code: 'OhMyDog', src: 'https://cdn.ekg.gg/external/NuUWy0yYBDbl5f4HQHpU3xgAS5B' },
    { id: 'twitch-81274', code: 'VoHiYo', src: 'https://cdn.ekg.gg/external/iErAw7mRUiJVFGR0Y0y4ny0IatZ' },
    { id: 'twitch-106293', code: 'VoteYea', src: 'https://cdn.ekg.gg/external/WEB7WFRKAmqruGJ2jH6Een8XB0a' },
    { id: 'twitch-123171', code: 'CoolStoryBob', src: 'https://cdn.ekg.gg/external/Bgl4VDFeoqhU9xhvkhgqsG0WbWi' },
    { id: 'twitch-1290325', code: 'MaxLOL', src: 'https://cdn.ekg.gg/external/GJMPiU8Z7hqSwvVTNBX5bJgIdLq' },
    { id: 'twitch-305954156', code: 'PogChamp', src: 'https://cdn.ekg.gg/external/YuLVMCtp80dyxS5Eq71WxztOmTl' },
  ].map((e) => [e.code, { type: 'emoji', ...e, authorId: null, srcSet: null }]),
)

const youtubeEmotes = new Map<string, EKG.EmojiChatNode>(
  [
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/CN2m5cKr49sCFYbFggodDFEKrg',
      code: ':oops:',
      src: 'https://cdn.ekg.gg/external/j6AK6dO9PmQCvSoAV88UIqFi1qL',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/Iv90XouTLuOR8gSxxrToBA',
      code: ':goodvibes:',
      src: 'https://cdn.ekg.gg/external/XhqsPHgBykvsQLqndh4gnHoKYRW',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/dv90XtfhAurw8gTgzar4DA',
      code: ':virtualhug:',
      src: 'https://cdn.ekg.gg/external/DkPRMRxgfgL5OHaVqvOnCzkTCaJ',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/hf90Xv-jHeOR8gSxxrToBA',
      code: ':yougotthis:',
      src: 'https://cdn.ekg.gg/external/NYH6d0q1Jr3BoJAkbcHCBVnFiGj',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/fAF1XtDQMIrK8gTUoo3wAg',
      code: ':hydrate:',
      src: 'https://cdn.ekg.gg/external/TB9zVofgvatMYH0U20b4Ka3uFLM',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/vQF1XpyaG_XG8gTs77bACQ',
      code: ':chillwcat:',
      src: 'https://cdn.ekg.gg/external/C7gDDzfzgBj3ZBAlfGw5Aid4ovB',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/ygF1XpGUMMjk8gSDrI2wCw',
      code: ':chillwdog:',
      src: 'https://cdn.ekg.gg/external/Hg0Fg1wSjvcCzUQBqfyupWZawtT',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/G8AfY6yWGuKuhL0PlbiA2AE',
      code: ':hand-pink-waving:',
      src: 'https://cdn.ekg.gg/external/45PJW6GO1dajC9UuyT98OYbFNx',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/KsIfY6LzFoLM6AKanYDQAg',
      code: ':face-blue-smiling:',
      src: 'https://cdn.ekg.gg/external/KMJwEKaL5fDwC46PlzTjcO3jpBz',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/b8IfY7zOK9iVkNAP_I2A-AY',
      code: ':face-purple-crying:',
      src: 'https://cdn.ekg.gg/external/czeqhUzltQ1mdGiLcq2YR33Em6p',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/hcIfY57lBJXp6AKBx4CoCA',
      code: ':text-green-game-over:',
      src: 'https://cdn.ekg.gg/external/RFC1I2mhAkvRaJhJvPwHzZIuGUZ',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/xsIfY4OqCd2T29sP54iAsAw',
      code: ':face-green-smiling:',
      src: 'https://cdn.ekg.gg/external/gdE5SUdEeSgONJELhIf5Q3JwWTc',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/2sIfY8vIG8z96ALulYDQDQ',
      code: ':face-orange-frowning:',
      src: 'https://cdn.ekg.gg/external/BRxOp1Cew6gfSEcdxZAk9V0kXE1',
    },
    {
      id: 'youtube-UCkszU2WH9gy1mb0dV-11UJg/E8MfY5u7JPSXkNAP95GAmAE',
      code: ':cat-orange-whistling:',
      src: 'https://cdn.ekg.gg/external/CvZFxzzBCmB6uvXDPq1mVWfqRuj',
    },
  ].map((e) => [e.code, { type: 'emoji', ...e, authorId: null, srcSet: null }]),
)

const knownEmotes = new Map<string, EKG.EmojiChatNode>([...twitchEmotes, ...youtubeEmotes])
const emotePattern = new RegExp(
  Array.from(knownEmotes.keys())
    .sort((a, b) => b.length - a.length)
    // @ts-expect-error RegExp.escape is not yet typed
    .map((v) => RegExp.escape(v))
    .join('|'),
  'g',
)

export function parseChatNodesInput(text: string): EKG.ChatNode[] {
  const nodes: EKG.ChatNode[] = []
  const pushText = (v: string) => {
    if (!v) return
    nodes.push({ type: 'text', text: v })
  }

  let cursor = 0
  for (const match of text.matchAll(emotePattern)) {
    const code = match[0]
    const index = match.index ?? 0
    pushText(text.slice(cursor, index))
    nodes.push(knownEmotes.get(code)!)
    cursor = index + code.length
  }
  pushText(text.slice(cursor))

  return nodes.length > 0 ? nodes : [{ type: 'text', text: '' }]
}

export function stringifyChatNodesInput(nodes: EKG.ChatNode[] | null | undefined): string {
  if (!nodes) return ''
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.text
      if (node.type === 'emoji') return node.code
      if (node.type === 'mention') return `@${node.mentionedDisplayName}`
      if (node.type === 'link') {
        return node.nodes.map((v) => (v.type === 'text' ? v.text : v.code)).join('')
      }
      return ''
    })
    .join('')
}

const usernames = [
  'NightOwl_Gaming',
  'PixelWarrior',
  'CyberNinja99',
  'ShadowHunter_',
  'DragonSlayer42',
  'CosmicGamer',
  'NeonRacer',
  'PhoenixRising',
  'StormChaser_',
  'LunarEclipse',
  'CrystalMage',
  'ArcadeKing',
  'RetroGamer',
  'SpeedRunner_',
  'BossSlayer',
  'LootHunter',
  'QuestMaster',
  'GuildLeader',
  'RaidBoss',
  'FragMaster',
  'ChillVibes',
  'CoffeeAddict',
  'MidnightSnacker',
  'PandaLover_',
  'SunnyDays',
  'RainyMood',
  'CozyCorner',
  'HappyPenguin',
  'LazySloth',
  'SleepyKoala',
  'WildTiger',
  'MoonlightDancer',
  'StarGazer',
  'CloudWatcher',
  'BeachBum',
  'MountainClimber',
  'CityExplorer',
  'NatureLover',
  'PizzaFan',
  'TacoTuesday',
  'CodeWizard',
  'DebugMaster',
  'ByteRunner',
  'QuantumLeap',
  'CipherX',
  'HackTheStream',
  'DataDriven',
  'NeuralNet_',
  'PixelPusher',
  'BitShifter',
  'FirstTimeSub',
  'LongTimeLurker',
  'NewFollower_123',
  'RegularViewer',
  'ModSquad',
  'VIPmember',
  'SupporterPrime',
  'StreamFan2024',
  'ChatActive',
  'EmoteSpammer',
  'xXGamerXx',
  'Pro_Player_2k',
  'Stream_Watcher_99',
  'User12345678',
  'anonymous_viewer',
  'Guest_42069',
  'TTV_subscriber',
  'YT_member',
  'viewer_one',
  'chatter_bot',
  'JohnPlays',
  'SarahStreams',
  'MikeGames',
  'EmilyWatches',
  'AlexVibes',
  'TaylorFan',
  'JordanLive',
  'CaseyClips',
  'RileyRaids',
  'MorganMods',
  'NinjaKatana',
  'SakuraPetal',
  'DragonFire',
  'TigerStripe',
  'PhoenixWing',
  'WolfPack',
  'EagleEye',
  'LionHeart',
  'BearClaw',
  'FoxTrot',
  'ClipChamp',
  'HighlightReel',
  'BestMoments',
  'TopDonator',
  'GiftSubKing',
  'HypeTrain',
  'PogChampion',
  'EmoteCollector',
  'BadgeHunter',
  'SubStreak',
]

const chatMessages = [
  'Hey everyone!',
  'Hi chat!',
  'Hello streamer!',
  'Heyy',
  'What did I miss?',
  'Just got here!',
  'Back from work!',
  'Good morning!',
  'Good evening chat!',
  'Hey hey hey!',
  'LOL',
  'LMAO',
  'That was insane!',
  'No way!',
  "Let's gooo!",
  'Huge W',
  'Based',
  'Nice one!',
  'GG',
  'EZ',
  'Clutch!',
  'So close!',
  'Unlucky',
  'Sadge',
  'Pain',
  'Love the stream!',
  'Great content as always',
  'You got this!',
  'Keep it up!',
  'Best streamer!',
  'Quality content',
  'Thanks for streaming!',
  'This is fun',
  'Enjoying the vibes',
  'Great community here',
  'What game is this?',
  'How long have you been streaming?',
  "What's your setup?",
  'Song name?',
  'Can we get a song request?',
  'What rank are you?',
  'How did you do that?',
  'Any tips for beginners?',
  "What's the plan for today?",
  "When's the next stream?",
  'EZ Clap',
  'F in chat',
  'F',
  'W',
  'L',
  'First time here, loving it!',
  'Been watching for years!',
  'Gifted sub hype!',
  'Thanks for the content!',
  'This game looks fun',
  'Never seen this before',
  'Classic gameplay right here',
  "That's what I'm talking about!",
  'Called it!',
  'Knew that would happen',
]

const resubMessages = [
  'Love this community!',
  'Best streamer on the platform',
  'Here for another month!',
  "Can't believe it's been this long",
  'Worth every penny',
  "Let's go!",
  'Happy to support',
  'Thanks for the great content',
  "Wouldn't miss it",
  'See you all next month too!',
]

function t(text: string): EKG.TextChatNode {
  return { type: 'text', text }
}

const chatMessagesWithEmotes: EKG.ChatNode[][] = [
  [twitchEmotes.get('MaxLOL')!, t(' That was hilarious!')],
  [twitchEmotes.get('Kappa')!, t(' sure thing '), twitchEmotes.get('Kappa')!],
  [twitchEmotes.get('PogChamp')!, t(' '), twitchEmotes.get('PogChamp')!, t(" Let's go!")],
  [t('Nice play! '), twitchEmotes.get('SeemsGood')!],
  [twitchEmotes.get('FrankerZ')!, t(' so sad')],
  [twitchEmotes.get('4Head')!, t(' just do not lose '), twitchEmotes.get('4Head')!],
  [twitchEmotes.get('WutFace')!, t(' what was that?')],
  [twitchEmotes.get('VoHiYo')!, t(' new here!')],
  [twitchEmotes.get('OhMyDog')!, t(' this is getting good')],
  [twitchEmotes.get('PeoplesChamp')!, t(' that combo was clean')],
  [twitchEmotes.get('VoteYea')!, t(' I agree')],
  [twitchEmotes.get('NotLikeThis')!, t(' why always me '), twitchEmotes.get('NotLikeThis')!],
  [twitchEmotes.get('ResidentSleeper')!, t(' zzz')],
  [twitchEmotes.get('CoolStoryBob')!, t(' tell me more')],
]

const chatMessagesWithYoutubeEmojis: EKG.ChatNode[][] = [
  [youtubeEmotes.get(':goodvibes:')!, t(' great content '), youtubeEmotes.get(':goodvibes:')!],
  [youtubeEmotes.get(':hand-pink-waving:')!, t(' hello everyone!')],
  [youtubeEmotes.get(':face-blue-smiling:')!, t(' having fun')],
  [youtubeEmotes.get(':virtualhug:')!, t(' thanks for streaming')],
  [youtubeEmotes.get(':yougotthis:')!, t(' you can do it!')],
  [youtubeEmotes.get(':hydrate:')!, t(' stay hydrated!')],
  [youtubeEmotes.get(':chillwcat:')!, t(' cozy vibes')],
  [youtubeEmotes.get(':cat-orange-whistling:')!, t(' nice one')],
  [youtubeEmotes.get(':text-green-game-over:')!, t(' gg')],
  [youtubeEmotes.get(':oops:')!, t(' my bad '), youtubeEmotes.get(':oops:')!],
  [youtubeEmotes.get(':face-purple-crying:')!, t(' so sad')],
]

const subTiers = ['Tier 1', 'Tier 2', 'Tier 3']
const membershipLevels = ['Member', 'VIP', 'Super Fan', 'Founding Member']
const giftCounts = [1, 5, 10, 20, 50, 100]
const polls: [string, string[]][] = [
  ['What game should we play next?', ['Elden Ring', 'Minecraft', 'Valorant', 'Fortnite']],
  ['Best snack for streaming?', ['Pizza', 'Chips', 'Gummy Bears', 'Popcorn']],
  ['Movie night pick?', ['Action', 'Comedy', 'Horror', 'Sci-Fi']],
  ['When should the next stream be?', ['Tomorrow', 'This weekend', 'Monday', 'Friday night']],
  ['Which challenge should I try?', ['No damage run', 'Speedrun', 'Blindfolded', 'One hand only']],
  ["Rate today's stream!", ['10/10', '8/10', 'Needs more memes', 'Best ever']],
  ['Pick the music vibe', ['Chill lofi', 'Hype EDM', 'Classic rock', 'No music']],
  ['What should I name my character?', ['Sir Lags-a-Lot', 'xX_Pro_Xx', "Chat's Choice", 'Bob']],
]

const twitchTipTiers: TipTuple[] = [
  { amountCents: 1, currency: 'BITS', level: 1 },
  { amountCents: 10, currency: 'BITS', level: 1 },
  { amountCents: 50, currency: 'BITS', level: 2 },
  { amountCents: 100, currency: 'BITS', level: 3 },
  { amountCents: 500, currency: 'BITS', level: 4 },
  { amountCents: 1000, currency: 'BITS', level: 5 },
  { amountCents: 5000, currency: 'BITS', level: 6 },
  { amountCents: 10000, currency: 'BITS', level: 7 },
]

const youtubeTipTiers: TipTuple[] = [
  { amountCents: 100, currency: 'USD', level: 1 },
  { amountCents: 200, currency: 'USD', level: 2 },
  { amountCents: 500, currency: 'USD', level: 3 },
  { amountCents: 1000, currency: 'USD', level: 4 },
  { amountCents: 2000, currency: 'USD', level: 5 },
  { amountCents: 5000, currency: 'USD', level: 6 },
  { amountCents: 10000, currency: 'USD', level: 7 },
]

let recentChats: { eventID: string; userID: string; displayName: string; platform: string }[] = []
function pushChat(eventID: string, userID: string, displayName: string, platform: string) {
  recentChats.push({ eventID, userID, displayName, platform })
  if (recentChats.length > 100) {
    recentChats = recentChats.slice(-100)
  }
}
function popChat() {
  const [x] = recentChats.splice(randInt(0, recentChats.length - 1), 1)
  return x
}

export function randomEventData(type: string, schema: any) {
  switch (type) {
    case 'ekg.audience.transferred':
      return withSchemaFallback(schema, randomAudienceTransferredData())
    case 'ekg.channel.followed':
      return withSchemaFallback(schema, randomChannelFollowedData())
    case 'ekg.chat.sent':
      return withSchemaFallback(schema, randomChatSentData())
    case 'ekg.event.deleted':
      return withSchemaFallback(schema, randomEventDeletedData())
    case 'ekg.poll.updated':
      return withSchemaFallback(schema, randomPollUpdatedData())
    case 'ekg.reward.redeemed':
      return withSchemaFallback(schema, randomRewardRedeemedData())
    case 'ekg.subscription.gifted':
      return withSchemaFallback(schema, randomSubscriptionGiftedData())
    case 'ekg.subscription.renewed':
      return withSchemaFallback(schema, randomSubscriptionRenewedData())
    case 'ekg.subscription.started':
      return withSchemaFallback(schema, randomSubscriptionStartedData())
    case 'ekg.tip.sent':
      return withSchemaFallback(schema, randomTipSentData())
    case 'ekg.user.moderated':
      return withSchemaFallback(schema, randomUserModeratedData())
    default:
      return withSchemaFallback(schema, {})
  }
}

function randomAudienceTransferredData() {
  const user = identity()
  return {
    userId: user.id,
    userDisplayName: user.displayName,
    viewerCount: randInt(1, 10_000),
    platform: 'twitch' as Platform,
    raw: {},
  }
}

function randomChannelFollowedData() {
  const user = identity()
  return {
    userId: user.id,
    userDisplayName: user.displayName,
    followedAt: Date.now() - randInt(0, 10 * 60 * 1000),
    platform: 'twitch' as Platform,
    raw: {},
  }
}

function randomChatSentData() {
  const platform = randomPlatform()
  const user = identity()
  const id = randString(24)
  const isBroadcaster = chance(0.03)
  pushChat(id, user.id, user.displayName, platform)

  return {
    id,
    userId: user.id,
    userDisplayName: user.displayName,
    message: randomChatNodes(platform, 'chat'),
    isSubscriber: isBroadcaster || chance(0.35),
    isModerator: isBroadcaster || chance(0.12),
    isVip: !isBroadcaster && chance(0.1),
    isBroadcaster,
    platform,
    raw: {},
  }
}

function randomEventDeletedData() {
  const chatEvent = popChat()
  return {
    deletedEventId: chatEvent?.eventID ?? randString(24),
    platform: chatEvent?.platform ?? randomPlatform(),
    raw: {},
  }
}

let latestPoll: EKG.PollUpdated['data'] | undefined
function randomPollUpdatedData() {
  // Open the poll if there isn't one already
  if (!latestPoll) {
    const [title, options] = sample(polls)!

    latestPoll = {
      pollId: `poll_${randString(12)}`,
      title,
      options: options.map((title) => ({
        title,
        votes: 0,
      })),
      isClosed: false,
      platform: randomPlatform(),
      raw: {},
    }
    return latestPoll
  }
  // 15% chance to close the poll
  if (chance(0.15)) {
    const p = { ...latestPoll, isClosed: true }
    latestPoll = undefined
    return p
  }
  // Otherwise increase the votes
  latestPoll.options = latestPoll.options.map((v) => ({ ...v, votes: v.votes + randInt(10, 100) }))
  return latestPoll
}

function randomRewardRedeemedData() {
  const user = identity()

  return {
    userId: user.id,
    userDisplayName: user.displayName,
    rewardId: `reward_${randString(10)}`,
    redeemedAt: Date.now() - randInt(0, 30 * 60 * 1000),
    message: chance(0.3) ? randomChatNodes('twitch', 'chat') : null,
    platform: 'twitch' as Platform,
    raw: {},
  }
}

function randomSubscriptionGiftedData() {
  const platform = randomPlatform()
  const mode = platform === 'twitch' && chance(0.5) ? 'single' : 'community'
  const recipient = mode === 'single' ? identity() : null
  const isAnonymous = platform === 'twitch' && chance(0.2)
  const gifter = isAnonymous ? null : identity()

  return {
    userId: gifter?.id ?? null,
    userDisplayName: gifter?.displayName ?? null,
    isAnonymous,
    recipientId: recipient?.id ?? null,
    recipientDisplayName: recipient?.displayName ?? null,
    tier: platform === 'twitch' ? sample(subTiers) : sample(membershipLevels),
    giftCount: mode === 'single' ? 1 : sample(giftCounts),
    platform,
    raw: {},
  }
}

function randomSubscriptionRenewedData() {
  const platform = randomPlatform()
  const subscriber = identity()

  return {
    userId: subscriber.id,
    userDisplayName: subscriber.displayName,
    message: randomChatNodes(platform, 'resub'),
    monthsSubscribed: randInt(2, 36),
    platform,
    raw: {},
  }
}

function randomSubscriptionStartedData() {
  const subscriber = identity()
  return {
    userId: subscriber.id,
    userDisplayName: subscriber.displayName,
    platform: randomPlatform(),
    raw: {},
  }
}

function randomTipSentData() {
  const platform = randomPlatform()
  const tipper = identity()
  const tip = platform === 'twitch' ? sample(twitchTipTiers) : sample(youtubeTipTiers)

  return {
    userId: tipper.id,
    userDisplayName: tipper.displayName,
    currency: tip.currency,
    amountCents: tip.amountCents,
    level: tip.level,
    message: randomChatNodes(platform, 'tip'),
    platform,
    raw: {},
  }
}

function randomUserModeratedData() {
  const chatEvent = popChat()
  const platform = chatEvent?.platform ?? randomPlatform()
  const user = identity(chatEvent?.displayName, chatEvent?.userID)
  const moderator = identity('Moderator')

  return {
    userId: user.id,
    userDisplayName: user.displayName,
    moderatorId: moderator.id,
    moderatorDisplayName: moderator.displayName,
    endsAt: chance(0.7) ? Date.now() + sample([60, 300, 600, 1800, 3600]) * 1000 : null,
    platform,
    raw: {},
  }
}

function randomChatNodes(platform: Platform, flavor: 'chat' | 'resub' | 'tip') {
  const messageType =
    chance(0.5) ? 'plain'
    : chance(0.7) ? 'with_emotes'
    : 'emotes_only'

  let nodes: EKG.ChatNode[]
  if (messageType === 'plain') {
    nodes = [{ type: 'text', text: flavor === 'resub' ? sample(resubMessages) : sample(chatMessages) }]
  } else if (messageType === 'with_emotes') {
    nodes = [...(platform === 'twitch' ? sample(chatMessagesWithEmotes) : sample(chatMessagesWithYoutubeEmojis))]
  } else {
    nodes = Array.from({ length: randInt(1, 3) }, () => sample(Array.from((platform === 'twitch' ? twitchEmotes : youtubeEmotes).values())))
  }

  if (chance(0.12)) {
    const mentioned = identity()
    nodes.unshift({ type: 'mention', mentionedDisplayName: mentioned.displayName, mentionedId: mentioned.id })
  }

  if (chance(0.1)) {
    nodes.push({
      type: 'link',
      href: `https://example.ekg.gg/${randString(10)}`,
      nodes: [{ type: 'text', text: sample(['check this', 'clip', 'source', 'docs']) }],
    })
  }

  return nodes
}

function withSchemaFallback(schema: any, seed: Record<string, unknown>) {
  if (typeof schema !== 'object' || !schema || schema.type !== 'object' || typeof schema.properties !== 'object' || !schema.properties) {
    return seed
  }
  const defs = schema.$defs ?? {}
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, fieldSchema]) => [
      key,
      key in seed ? seed[key] : randomSchemaValue(fieldSchema, defs, key),
    ]),
  )
}

function randomSchemaValue(schema: any, defs: any, key: string): any {
  if (typeof schema !== 'object' || !schema) return null
  if ('$ref' in schema && typeof schema.$ref === 'string') {
    const name = schema.$ref.split('/').at(-1)
    return name && defs[name] ? randomSchemaValue(defs[name], defs, key) : null
  }
  if ('const' in schema) return schema.const
  if ('enum' in schema && Array.isArray(schema.enum) && schema.enum.length > 0) return sample(schema.enum)
  if ('oneOf' in schema && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return randomSchemaValue(sample(schema.oneOf), defs, key)
  }

  if (schema.type === 'object') {
    if (key === 'raw') return {}
    if (typeof schema.properties !== 'object' || !schema.properties) return {}
    return Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, randomSchemaValue(v, defs, k)]))
  }

  if (schema.type === 'array') {
    if (typeof schema.items !== 'object' || !schema.items) return []
    const min =
      typeof schema.minItems === 'number' ? schema.minItems
      : key === 'message' ? 1
      : 0
    const max = typeof schema.maxItems === 'number' ? schema.maxItems : Math.max(min, key === 'message' ? 3 : 2)
    const upper = Math.max(min, Math.min(max, key === 'message' ? 3 : 2))
    return Array.from({ length: randInt(min, upper) }, () => randomSchemaValue(schema.items, defs, key))
  }

  if (schema.type === 'string') return randString(12)
  if (schema.type === 'boolean') return chance(0.5)
  if (schema.type === 'integer') return randInt(1, 100)
  if (schema.type === 'number') return Math.random() * 100
  return null
}

function identity(displayName?: string, id?: string) {
  const name = displayName || sample(usernames)
  const i = id || simpleHash(name, 'u')
  return { id: i, displayName: name }
}

function randomPlatform() {
  return chance(0.5) ? 'twitch' : 'youtube'
}

function sample<T>(values: T[]) {
  return values[randInt(0, values.length - 1)]!
}

function chance(probability: number) {
  return Math.random() < probability
}

function randInt(min: number, max: number) {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  if (hi <= lo) return lo
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}
