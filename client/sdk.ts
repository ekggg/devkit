import type { PublicSDK } from '../vendor/types'

export const EKG: PublicSDK = {
  registerWidget(_widget) {
    return null
  },
  utils: {
    chatToText() {
      return ''
    },
  },
}

globalThis.EKG = EKG
