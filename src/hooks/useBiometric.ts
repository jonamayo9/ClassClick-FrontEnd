import { useCallback, useEffect, useState } from 'react'
import { apiService } from '@/lib/api'
import { useAuth } from '@/stores/auth'

const STORAGE_PREFIX = 'classclick_biometric_device'

interface StoredDevice {
  userId: string
  credentialId: string
}

interface WebAuthnOptionsResponse {
  challengeId: string
  options: PublicKeyCredentialCreationOptionsJSON | PublicKeyCredentialRequestOptionsJSON
}

interface PublicKeyCredentialCreationOptionsJSON extends Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> {
  challenge: string
  user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string }
  excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>
}

interface PublicKeyCredentialRequestOptionsJSON extends Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> {
  challenge: string
  allowCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>
}

function storageKey(userId?: string) {
  return `${STORAGE_PREFIX}:${userId ?? 'anonymous'}`
}

function getStored(userId?: string): StoredDevice | null {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? JSON.parse(raw) as StoredDevice : null
  } catch {
    return null
  }
}

function fromBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer
}

function toBase64Url(value: ArrayBuffer | null): string | null {
  if (!value) return null
  const bytes = new Uint8Array(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function creationOptions(options: PublicKeyCredentialCreationOptionsJSON): PublicKeyCredentialCreationOptions {
  if (!options?.challenge || !options?.user?.id) {
    throw new Error('No se pudo iniciar la biometría. Reiniciá la app y volvé a intentarlo.')
  }

  return {
    ...options,
    challenge: fromBase64Url(options.challenge),
    user: { ...options.user, id: fromBase64Url(options.user.id) },
    excludeCredentials: options.excludeCredentials?.map((item) => ({
      ...item,
      id: fromBase64Url(item.id),
    })),
  }
}

function assertionOptions(options: PublicKeyCredentialRequestOptionsJSON): PublicKeyCredentialRequestOptions {
  if (!options?.challenge) {
    throw new Error('No se pudo verificar la biometría. Reiniciá la app y volvé a intentarlo.')
  }

  return {
    ...options,
    challenge: fromBase64Url(options.challenge),
    allowCredentials: options.allowCredentials?.map((item) => ({
      ...item,
      id: fromBase64Url(item.id),
    })),
  }
}

function ceremony(active: boolean) {
  window.dispatchEvent(new CustomEvent('classclick-biometric-ceremony', { detail: { active } }))
}

function biometricErrorMessage(cause: unknown, fallback: string) {
  if (!(cause instanceof Error)) return fallback

  const message = cause.message || ''
  const normalized = message.toLowerCase()

  if (cause.name === 'NotAllowedError' || normalized.includes('cancel') || normalized.includes('not allowed')) {
    return 'Operación biométrica cancelada.'
  }

  if (message.includes('options.publicKey') || message.includes('Required parameters')) {
    return 'No se pudo iniciar la biometría. Reiniciá la app y volvé a intentarlo.'
  }

  return message || fallback
}

export function useBiometric() {
  const userId = useAuth((state) => state.user?.id)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stored, setStored] = useState<StoredDevice | null>(() => getStored(userId))

  const isAvailable = typeof window !== 'undefined' &&
    window.isSecureContext &&
    'PublicKeyCredential' in window &&
    !!navigator.credentials

  useEffect(() => setStored(getStored(userId)), [userId])

  const isEnabled = !!stored

  const register = useCallback(async () => {
    if (!isAvailable || !userId) {
      setError('La biometría no está disponible en este dispositivo.')
      return false
    }

    setIsRegistering(true)
    setError(null)
    ceremony(true)

    try {
      const start = await apiService.post<WebAuthnOptionsResponse>('/api/auth/webauthn/register/options')
      const credential = await navigator.credentials.create({
        publicKey: creationOptions(start.options as PublicKeyCredentialCreationOptionsJSON),
      }) as PublicKeyCredential | null

      if (!credential) throw new Error('Registro biométrico cancelado.')

      const response = credential.response as AuthenticatorAttestationResponse
      const completed = await apiService.post<{ credentialId: string }>('/api/auth/webauthn/register/complete', {
        challengeId: start.challengeId,
        deviceName: `${navigator.platform || 'Dispositivo'} - ${navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Web'}`,
        response: {
          id: credential.id,
          rawId: toBase64Url(credential.rawId),
          type: 'PublicKey',
          extensions: credential.getClientExtensionResults(),
          response: {
            attestationObject: toBase64Url(response.attestationObject),
            clientDataJSON: toBase64Url(response.clientDataJSON),
            transports: response.getTransports?.() ?? ['internal'],
          },
        },
      })

      const device = {
        userId,
        credentialId: completed.credentialId,
      }

      localStorage.setItem(storageKey(userId), JSON.stringify(device))
      setStored(device)
      return true
    } catch (cause) {
      setError(biometricErrorMessage(cause, 'No se pudo activar la biometría.'))
      return false
    } finally {
      ceremony(false)
      setIsRegistering(false)
    }
  }, [isAvailable, userId])

  const authenticate = useCallback(async () => {
    if (!isAvailable || !stored) {
      setError('No hay biometría registrada en este dispositivo.')
      return false
    }

    setIsAuthenticating(true)
    setError(null)
    ceremony(true)

    try {
      const start = await apiService.post<WebAuthnOptionsResponse>('/api/auth/webauthn/assert/options')
      const credential = await navigator.credentials.get({
        publicKey: assertionOptions(start.options as PublicKeyCredentialRequestOptionsJSON),
      }) as PublicKeyCredential | null

      if (!credential) throw new Error('Autenticación biométrica cancelada.')

      const response = credential.response as AuthenticatorAssertionResponse
      await apiService.post('/api/auth/webauthn/assert/complete', {
        challengeId: start.challengeId,
        response: {
          id: credential.id,
          rawId: toBase64Url(credential.rawId),
          type: 'PublicKey',
          extensions: credential.getClientExtensionResults(),
          response: {
            authenticatorData: toBase64Url(response.authenticatorData),
            clientDataJSON: toBase64Url(response.clientDataJSON),
            signature: toBase64Url(response.signature),
            userHandle: toBase64Url(response.userHandle),
          },
        },
      })

      window.dispatchEvent(new Event('classclick-biometric-unlocked'))
      return true
    } catch (cause) {
      setError(biometricErrorMessage(cause, 'No se pudo verificar la biometría.'))
      return false
    } finally {
      ceremony(false)
      setIsAuthenticating(false)
    }
  }, [isAvailable, stored])

  const disable = useCallback(async () => {
    if (!stored || !userId) return
    try {
      await apiService.del(`/api/auth/webauthn/credentials/${stored.credentialId}`)
    } finally {
      localStorage.removeItem(storageKey(userId))
      setStored(null)
    }
  }, [stored, userId])

  return {
    isAvailable,
    isEnabled,
    credentialId: stored?.credentialId ?? null,
    isRegistering,
    isAuthenticating,
    error,
    register,
    authenticate,
    disable,
    clearError: () => setError(null),
  }
}
