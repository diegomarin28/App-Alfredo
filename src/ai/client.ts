import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export interface AiMensaje { rol: 'user' | 'assistant'; texto: string }

/** Mensajes (redactar WhatsApp): Sonnet 5.5. */
export const MODELO_MENSAJES = 'claude-sonnet-5-5'
/** Contame (clasificar con herramientas): Haiku 5.5. */
export const MODELO_CONTAME = 'claude-haiku-5-5'
export type ModeloIa = typeof MODELO_MENSAJES | typeof MODELO_CONTAME

export interface AiArgs {
  modelo: ModeloIa
  sistema: string
  mensajes: AiMensaje[]
  maxTokens: number
  herramientas?: unknown[]
  /** Pide que el modelo use alguna herramienta (tool_choice: any). */
  forzarHerramienta?: boolean
  /** A lo sumo una llamada a herramienta por respuesta (disable_parallel_tool_use). */
  unaSolaHerramienta?: boolean
  /** Sin pensamiento adaptativo (que si no gasta parte de max_tokens). */
  sinPensar?: boolean
}

export interface AiResultado {
  texto: string
  toolInput?: unknown
  toolName?: string
  /** stop_reason de la API: 'max_tokens' = respuesta cortada (no usar una herramienta a medias). */
  stopReason?: string
  /** Modelo usado (el pedido). */
  modelo: ModeloIa
  /** Entrada sin caché. */
  tokensIn: number
  tokensOut: number
  /** Entrada escrita en la caché (cache_creation_input_tokens). */
  tokensCacheWrite: number
  /** Entrada leída de la caché (cache_read_input_tokens). */
  tokensCacheRead: number
}

export interface AiClient {
  completar(args: AiArgs): Promise<AiResultado>
}

/** Modelos que rechazan tool_choice any/tool con un 400: ahí se usa auto y la instrucción va en el prompt. */
const RECHAZA_TOOL_FORZADA = /(sonnet-5-5|opus-5-5|fable-5-[12]|mythos-5-[12])/

/**
 * Cómo apagar el pensamiento en cada modelo. Sonnet 5.5 rechaza `disabled` con un 400:
 * se apaga con `between_tools`, sin ningún otro campo al lado. Haiku 5.5 acepta `disabled` (effort ≤ high).
 */
const SIN_PENSAR: Record<ModeloIa, Anthropic.ThinkingConfigParam> = {
  [MODELO_MENSAJES]: { type: 'between_tools' },
  [MODELO_CONTAME]: { type: 'disabled' },
}

export class AnthropicClient implements AiClient {
  private readonly client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async completar(args: AiArgs): Promise<AiResultado> {
    const tools = args.herramientas as Anthropic.Tool[] | undefined
    const conTools = !!tools && tools.length > 0
    const forzar = conTools && args.forzarHerramienta && !RECHAZA_TOOL_FORZADA.test(args.modelo)
    const r = await this.client.messages.create({
      model: args.modelo,
      max_tokens: args.maxTokens,
      // Un solo bloque con caché (5 min): cachea tools + system. Bajo 512 tokens no cachea, sin error.
      system: [{ type: 'text', text: args.sistema, cache_control: { type: 'ephemeral' } }],
      messages: args.mensajes.map((m) => ({ role: m.rol, content: m.texto })),
      ...(args.sinPensar ? { thinking: SIN_PENSAR[args.modelo] } : {}),
      ...(conTools ? { tools } : {}),
      ...(forzar
        ? { tool_choice: { type: 'any' as const, ...(args.unaSolaHerramienta ? { disable_parallel_tool_use: true } : {}) } }
        : conTools && args.unaSolaHerramienta
          ? { tool_choice: { type: 'auto' as const, disable_parallel_tool_use: true } }
          : {}),
    })
    let texto = ''
    let tool: Anthropic.ToolUseBlock | undefined
    for (const b of r.content) {
      if (b.type === 'text') texto += b.text
      else if (b.type === 'tool_use' && !tool) tool = b
    }
    return {
      texto,
      ...(tool ? { toolName: tool.name, toolInput: tool.input } : {}),
      ...(r.stop_reason ? { stopReason: r.stop_reason } : {}),
      modelo: args.modelo,
      tokensIn: r.usage.input_tokens,
      tokensOut: r.usage.output_tokens,
      tokensCacheWrite: r.usage.cache_creation_input_tokens ?? 0,
      tokensCacheRead: r.usage.cache_read_input_tokens ?? 0,
    }
  }
}

/** Para tests y e2e: respuestas guiones en cola; sin cola, un eco determinista. */
export class FakeAiClient implements AiClient {
  llamadas: AiArgs[] = []
  constructor(public cola: Partial<AiResultado>[] = []) {}

  async completar(args: AiArgs): Promise<AiResultado> {
    this.llamadas.push(args)
    const siguiente = this.cola.shift()
    const ultimo = args.mensajes[args.mensajes.length - 1]?.texto ?? ''
    return {
      texto: `Eco: ${ultimo}`, stopReason: 'end_turn', modelo: args.modelo,
      tokensIn: 100, tokensOut: 50, tokensCacheWrite: 0, tokensCacheRead: 0, ...siguiente,
    }
  }
}
