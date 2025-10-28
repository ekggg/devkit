import type { EKGPublicSDK } from '../vendor/types'

export const EKG: EKGPublicSDK = {
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
