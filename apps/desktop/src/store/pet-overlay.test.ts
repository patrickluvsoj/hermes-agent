import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $petOverlayActive,
  initPetOverlayBridge,
  popInPet,
  restorePetOverlay,
  resumePetOverlay,
  suspendPetOverlay
} from './pet-overlay'

const open = vi.fn().mockResolvedValue({ bounds: { height: 300, width: 240, x: 20, y: 30 } })
const close = vi.fn().mockResolvedValue({ ok: true })
const pushState = vi.fn()
let controlHandler: ((payload: { type: string }) => void) | null = null

const onControl = vi.fn((handler: (payload: { type: string }) => void) => {
  controlHandler = handler

  return vi.fn()
})

beforeEach(() => {
  open.mockClear()
  close.mockClear()
  onControl.mockClear()
  pushState.mockClear()
  controlHandler = null
  popInPet()
  window.localStorage.setItem(
    'hermes.desktop.pet-overlay-bounds.v1',
    JSON.stringify({ height: 300, width: 240, x: 20, y: 30 })
  )
  ;(window as unknown as { hermesDesktop: unknown }).hermesDesktop = {
    petOverlay: { close, onControl, open, pushState }
  }
})

afterEach(() => {
  popInPet()
  delete (window as unknown as { hermesDesktop?: unknown }).hermesDesktop
})

describe('temporary Pet Overlay ownership', () => {
  it('closes without forgetting the popped-out preference, then restores it', () => {
    const dispose = initPetOverlayBridge()
    $petOverlayActive.set(true)
    restorePetOverlay()
    expect(open).toHaveBeenCalledOnce()

    expect(suspendPetOverlay()).toBe(true)
    expect(close).toHaveBeenCalledOnce()
    expect($petOverlayActive.get()).toBe(true)

    controlHandler?.({ type: 'pop-in' })
    expect($petOverlayActive.get()).toBe(true)

    expect(resumePetOverlay()).toBe(true)
    expect(open).toHaveBeenCalledTimes(2)
    expect($petOverlayActive.get()).toBe(true)
    dispose()
  })

  it('does nothing when there is no popped-out pet', () => {
    expect(suspendPetOverlay()).toBe(false)
    expect(resumePetOverlay()).toBe(false)
    expect(open).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })

  it('ignores a delayed close echo after a rapid suspend and resume', () => {
    const dispose = initPetOverlayBridge()
    $petOverlayActive.set(true)
    restorePetOverlay()

    suspendPetOverlay()
    resumePetOverlay()
    controlHandler?.({ type: 'pop-in' })

    expect($petOverlayActive.get()).toBe(true)
    expect(open).toHaveBeenCalledTimes(2)
    dispose()
  })
})
