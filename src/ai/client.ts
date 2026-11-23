import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export interface AiMensaje { rol: 'user' | 'assistant'; texto: string }

export interface AiArgs {
  sistema: string
  mensajes: AiMensaje[]
  maxTokens: number
  herramientas?: unknown[]
  /** Pide que el modelo use alguna herramienta (tool_choice: any). */
  forzarHerramienta?: boolean
  /** A lo sumo una llamada a herramienta por respuesta (disable_parallel_tool_use). */
  unaSolaHerramienta?: boolean
}

export interface AiResultado {
  texto: string
  toolInput?: unknown
  toolName?: string
  tokensIn: number
  tokensOut: number
}

export interface AiClient {
  completar(args: AiArgs): Promise<AiResultado>
}

export const MODELO_POR_DEFECTO = 'claude-sonnet-5-5'

/** Modelos que rechazan tool_choice any/tool con un 400: ahí se usa auto y la instrucción va en el prompt. */
const RECHAZA_TOOL_FORZADA = /(sonnet-5-5|opus-5-5|fable-5-[12]|mythos-5-[12])/

export class AnthropicClient implements AiClient {
  private readonly client: Anthropic
  private readonly modelo: string

  constructor(apiKey: string, modelo?: string) {
    this.client = new Anthropic({ apiKey })
    this.modelo = modelo || MODELO_POR_DEFECTO
  }

  async completar(args: AiArgs): Promise<AiResultado> {
    const tools = args.herramientas as Anthropic.Tool[] | undefined
    const conTools = !!tools && tools.length > 0
    const forzar = conTools && args.forzarHerramienta && !RECHAZA_TOOL_FORZADA.test(this.modelo)
    const r = await this.client.messages.create({
      model: this.modelo,
      max_tokens: args.maxTokens,
      system: args.sistema,
      messages: args.mensajes.map((m) => ({ role: m.rol, content: m.texto })),
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
      tokensIn: r.usage.input_tokens,
      tokensOut: r.usage.output_tokens,
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
    return { texto: `Eco: ${ultimo}`, tokensIn: 100, tokensOut: 50, ...siguiente }
  }
}
