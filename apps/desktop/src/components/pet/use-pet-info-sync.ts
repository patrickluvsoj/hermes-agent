import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { useOnProfileSwitch } from '@/app/hooks/use-on-profile-switch'
import { $changeEventsAvailable, $petChange } from '@/store/live-sync'
import {
  $petInfo,
  hasPetSpriteForMeta,
  mergePetInfoMeta,
  type PetInfo,
  type PetInfoMeta,
  setPetInfo
} from '@/store/pet'
import { type GatewayRequest, resetPetGallery } from '@/store/pet-gallery'
import { $activeGatewayProfile, normalizeProfileKey } from '@/store/profile'
import { $gatewayState } from '@/store/session'

import { PET_STARTUP_RETRY_MS, petInfoPollIntervalMs } from './pet-info-poll'

/**
 * Keep the active profile's Petdex sprite synchronized in this renderer.
 *
 * Main and HUD renderers each own their nanostores, so both pet surfaces use
 * this same private lifecycle: events first, metadata-before-bytes, bounded
 * cold-start recovery, a slow backstop, and profile clearing.
 */
export function usePetInfoSync(requestGateway: GatewayRequest): PetInfo {
  const gatewayState = useStore($gatewayState)
  const info = useStore($petInfo)
  const changeEventsAvailable = useStore($changeEventsAvailable)
  const petChange = useStore($petChange)
  const profile = normalizeProfileKey(useStore($activeGatewayProfile))
  const active = info.enabled && Boolean(info.spritesheetBase64)

  useEffect(() => {
    if (gatewayState !== 'open') {
      return
    }

    let cancelled = false

    if (changeEventsAvailable && petChange.tick > 0 && petChange.meta?.enabled === false) {
      setPetInfo({ enabled: false })

      return
    }

    const pull = async () => {
      try {
        if (active) {
          try {
            const meta = await requestGateway<PetInfoMeta>('pet.info.meta', { profile })

            if (cancelled || !meta) {
              return
            }

            if (!meta.enabled) {
              setPetInfo({ enabled: false })

              return
            }

            const current = $petInfo.get()

            if (hasPetSpriteForMeta(current, meta)) {
              const merged = mergePetInfoMeta(current, meta)

              if (merged !== current) {
                setPetInfo(merged)
              }

              return
            }
          } catch {
            // Older gateways may not have pet.info.meta yet; fall back to pet.info.
          }
        }

        const held = $petInfo.get()
        const knownRevision = held.enabled && held.spritesheetBase64 ? held.spritesheetRevision : undefined

        const next = await requestGateway<PetInfo & { spritesheetUnchanged?: boolean }>('pet.info', {
          knownRevision,
          profile
        })

        if (!cancelled && next) {
          const current = $petInfo.get()

          if (next.enabled && next.spritesheetUnchanged && !next.spritesheetBase64) {
            next.spritesheetBase64 = current.spritesheetBase64
          }

          if (
            next.enabled &&
            current.enabled &&
            current.slug === next.slug &&
            current.displayName === next.displayName &&
            current.scale === next.scale &&
            current.spritesheetRevision &&
            current.spritesheetRevision === next.spritesheetRevision
          ) {
            return
          }

          setPetInfo(next)
        }
      } catch {
        // Cosmetic feature — never surface gateway errors.
      }
    }

    const pullIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void pull()
      }
    }

    void pull()
    window.addEventListener('focus', pull)

    const startupRetryTimers = PET_STARTUP_RETRY_MS.map(delay =>
      window.setTimeout(() => {
        if (cancelled) {
          return
        }

        const current = $petInfo.get()

        if (current.enabled && current.spritesheetBase64) {
          return
        }

        pullIfVisible()
      }, delay)
    )

    const timer = window.setInterval(pullIfVisible, petInfoPollIntervalMs(changeEventsAvailable, active))

    return () => {
      cancelled = true
      window.removeEventListener('focus', pull)

      for (const id of startupRetryTimers) {
        window.clearTimeout(id)
      }

      window.clearInterval(timer)
    }
  }, [gatewayState, active, changeEventsAvailable, petChange, profile, requestGateway])

  useOnProfileSwitch(() => {
    setPetInfo({ enabled: false })
    resetPetGallery()
  })

  return info
}
