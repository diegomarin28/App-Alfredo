import 'server-only'
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse,
  verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import type { Repo } from '@/data/repo'

export const rpID = () => process.env.NEXT_PUBLIC_RP_ID || 'localhost'
export const origen = () => process.env.APP_ORIGIN || 'http://localhost:3100'

/** Opciones para crear una passkey "descubrible" con Face ID (entrar sin usuario). */
export async function opcionesRegistro(repo: Repo) {
  const existentes = await repo.passkeys.list()
  return generateRegistrationOptions({
    rpName: 'Alfredo',
    rpID: rpID(),
    userName: 'alfredo',
    userDisplayName: 'Alfredo',
    attestationType: 'none',
    excludeCredentials: existentes.map((p) => ({ id: p.credentialId, transports: p.transports })),
    authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
    // R10: iOS 18 solo da PRF (clave de Contraseñas) si se pidió al crear la passkey.
    extensions: { prf: {} },
  })
}

/** Verifica el registro y guarda la passkey. true si quedó guardada. */
export async function verificarRegistro(repo: Repo, respuesta: RegistrationResponseJSON, desafio: string): Promise<boolean> {
  const r = await verifyRegistrationResponse({
    response: respuesta,
    expectedChallenge: desafio,
    expectedOrigin: origen(),
    expectedRPID: rpID(),
    requireUserVerification: true,
  })
  if (!r.verified) return false
  const { credential } = r.registrationInfo
  await repo.passkeys.create({
    credentialId: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
  })
  return true
}

/** Opciones para entrar: sin allowCredentials, el iPhone ofrece la passkey guardada. */
export async function opcionesEntrada() {
  return generateAuthenticationOptions({ rpID: rpID(), userVerification: 'required' })
}

/** Verifica la entrada contra una passkey registrada y actualiza el contador. */
export async function verificarEntrada(repo: Repo, respuesta: AuthenticationResponseJSON, desafio: string): Promise<boolean> {
  if (typeof respuesta?.id !== 'string' || !respuesta.id) return false
  const [guardada] = await repo.passkeys.list({ credentialId: respuesta.id })
  if (!guardada) return false
  const r = await verifyAuthenticationResponse({
    response: respuesta,
    expectedChallenge: desafio,
    expectedOrigin: origen(),
    expectedRPID: rpID(),
    requireUserVerification: true,
    credential: {
      id: guardada.credentialId,
      publicKey: isoBase64URL.toBuffer(guardada.publicKey),
      counter: guardada.counter,
      transports: guardada.transports,
    },
  })
  if (!r.verified) return false
  await repo.passkeys.update(guardada.id, { counter: r.authenticationInfo.newCounter })
  return true
}
