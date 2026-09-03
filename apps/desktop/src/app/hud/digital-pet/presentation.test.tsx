import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $busy } from '@/store/session'

import { DigitalPetPresentation, hudPetZoom } from './presentation'

const requestGateway = vi.fn()

let petInfo: Record<string, unknown> = {
  enabled: true,
  frameH: 208,
  frameW: 192,
  scale: 3,
  spritesheetBase64: 'sprite'
}

vi.mock('@/app/gateway/hooks/use-gateway-request', () => ({
  useGatewayRequest: () => ({ requestGateway })
}))

vi.mock('@/components/pet/use-pet-info-sync', () => ({
  usePetInfoSync: () => petInfo
}))

vi.mock('@/components/pet/pet-sprite', () => ({
  PetSprite: ({ zoom }: { zoom: number }) => <canvas data-testid="pet-sprite" data-zoom={zoom} />
}))

beforeEach(() => {
  petInfo = {
    enabled: true,
    frameH: 208,
    frameW: 192,
    scale: 3,
    spritesheetBase64: 'sprite'
  }
  $busy.set(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DigitalPetPresentation', () => {
  it('starts with a ready pet collapsed and toggles the existing conversation', async () => {
    const view = render(<DigitalPetPresentation />)

    const open = await screen.findByRole('button', { name: 'Show conversation' })
    expect(view.container.querySelector('[data-digital-pet-collapsed]')).toBeTruthy()
    expect(Number(screen.getByTestId('pet-sprite').getAttribute('data-zoom'))).toBeLessThan(1)
    expect(view.container.querySelector('input, textarea, [contenteditable]')).toBeNull()

    fireEvent.click(open)

    expect(screen.getByRole('button', { name: 'Hide conversation' })).toBeTruthy()
    expect(view.container.querySelector('[data-digital-pet-expanded]')).toBeTruthy()
    expect(view.container.querySelector('[data-digital-pet-collapsed]')).toBeNull()
  })

  it('never hides the conversation when a ready pet becomes unavailable', async () => {
    const view = render(<DigitalPetPresentation />)
    await screen.findByRole('button', { name: 'Show conversation' })

    petInfo = { enabled: false }
    view.rerender(<DigitalPetPresentation />)

    expect(screen.getByText('Turn on a Petdex pet to use the Digital Pet presentation.')).toBeTruthy()
    expect(view.container.querySelector('[data-digital-pet-collapsed]')).toBeNull()
    expect(screen.queryByTestId('pet-sprite')).toBeNull()
  })

  it('reveals the conversation after a real turn completes', async () => {
    const view = render(<DigitalPetPresentation />)
    await screen.findByRole('button', { name: 'Show conversation' })

    act(() => $busy.set(true))
    act(() => $busy.set(false))

    await waitFor(() => expect(view.container.querySelector('[data-digital-pet-expanded]')).toBeTruthy())
  })

  it('closes through the ordinary HUD window lifecycle', async () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined)
    render(<DigitalPetPresentation />)
    await screen.findByRole('button', { name: 'Show conversation' })

    fireEvent.click(screen.getByRole('button', { name: 'Close HUD and digital pet' }))

    expect(close).toHaveBeenCalledOnce()
  })
})

describe('hudPetZoom', () => {
  it('preserves small pets and caps oversized pets inside the HUD rail', () => {
    expect(hudPetZoom({ enabled: true, frameH: 100, frameW: 100, scale: 0.5 })).toBe(1)
    expect(hudPetZoom({ enabled: true, frameH: 208, frameW: 192, scale: 3 })).toBeLessThan(0.2)
  })

  it('follows the Pet Size setting until the HUD safety cap is reached', () => {
    const displayedWidth = (scale: number) =>
      192 * scale * hudPetZoom({ enabled: true, frameH: 208, frameW: 192, scale })

    expect(displayedWidth(0.4)).toBeGreaterThan(displayedWidth(0.2))
    expect(displayedWidth(3)).toBeCloseTo(88)
  })
})
