import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $hudActive } from '@/store/hud'
import { resumePetOverlay, suspendPetOverlay } from '@/store/pet-overlay'
import { isAuxiliaryWindow, isPeerInstanceWindow } from '@/store/windows'

import { $digitalPetHudEnabled } from './state'

/** Temporarily gives the one visible mascot to Digital Pet HUD. */
export function useDigitalPetHudOverlayOwnership(): void {
  const enabled = useStore($digitalPetHudEnabled)
  const hudActive = useStore($hudActive)

  useEffect(() => {
    if (isAuxiliaryWindow() || isPeerInstanceWindow()) {
      return
    }

    if (enabled && hudActive) {
      suspendPetOverlay()
    } else {
      resumePetOverlay()
    }
  }, [enabled, hudActive])
}
