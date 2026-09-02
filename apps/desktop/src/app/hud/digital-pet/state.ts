import { Codecs, persistentAtom } from '@/lib/persisted'

export const DIGITAL_PET_HUD_PREFERENCE_KEY = 'hermes.desktop.hud.digital-pet.v1'

/** Global Desktop presentation preference; each HUD renderer reads it at boot. */
export const $digitalPetHudEnabled = persistentAtom(DIGITAL_PET_HUD_PREFERENCE_KEY, false, Codecs.bool)
