import './styles.css'

import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { useGatewayRequest } from '@/app/gateway/hooks/use-gateway-request'
import { PetSprite } from '@/components/pet/pet-sprite'
import { usePetInfoSync } from '@/components/pet/use-pet-info-sync'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { X } from '@/lib/icons'
import type { PetInfo } from '@/store/pet'
import { $busy } from '@/store/session'

// The pet shares the composer's row instead of floating over the transcript.
// Keep it visually the size of a control cluster, not a second panel.
const HUD_PET_MAX_WIDTH = 88
const HUD_PET_MAX_HEIGHT = 112

export function hudPetZoom(info: PetInfo): number {
  const scale = info.scale ?? 0.33
  const width = (info.frameW ?? 192) * scale
  const height = (info.frameH ?? 208) * scale

  return Math.min(1, HUD_PET_MAX_WIDTH / width, HUD_PET_MAX_HEIGHT / height)
}

export function DigitalPetPresentation() {
  const { t } = useI18n()
  const { requestGateway } = useGatewayRequest()
  const info = usePetInfoSync(requestGateway)
  const busy = useStore($busy)
  const ready = info.enabled && typeof info.spritesheetBase64 === 'string' && info.spritesheetBase64.trim().length > 0
  const [collapsed, setCollapsed] = useState(true)
  const [petWasReady, setPetWasReady] = useState(false)
  const [turnActive, setTurnActive] = useState(busy)
  const effectiveCollapsed = ready && collapsed

  useEffect(() => {
    if (ready && !petWasReady) {
      setCollapsed(true)
    } else if (!ready) {
      setCollapsed(false)
    }

    setPetWasReady(ready)
  }, [petWasReady, ready])

  useEffect(() => {
    if (busy) {
      setTurnActive(true)
    } else if (turnActive) {
      setTurnActive(false)
      setCollapsed(false)
    }
  }, [busy, turnActive])

  return (
    <div
      className="digital-pet-layer"
      data-digital-pet-collapsed={effectiveCollapsed ? '' : undefined}
      data-digital-pet-expanded={ready && !effectiveCollapsed ? '' : undefined}
      data-digital-pet-ready={ready ? '' : undefined}
    >
      {!ready && <div className="digital-pet-status">{t.settings.appearance.pet.digitalHudRequired}</div>}

      {ready && (
        <div className="digital-pet-mascot">
          <button
            aria-label={effectiveCollapsed ? t.settings.appearance.pet.digitalHudShow : t.settings.appearance.pet.digitalHudHide}
            className="digital-pet-toggle"
            onClick={() => setCollapsed(value => !value)}
            type="button"
          >
            <PetSprite info={info} pauseWhenUnfocused={false} zoom={hudPetZoom(info)} />
          </button>
          <Button
            aria-label={t.settings.appearance.pet.digitalHudClose}
            className="digital-pet-close"
            onClick={event => {
              event.stopPropagation()
              window.close()
            }}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
