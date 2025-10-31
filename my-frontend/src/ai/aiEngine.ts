import { buildContext } from '@/ai/contextBuilder';
import { rbacFilter } from '@/ai/rbacFilter';
import { LocalModelAdapter } from '@/ai/localModelAdapter';
import { ApiModelAdapter } from '@/ai/apiModelAdapter';
import { PROMPTS } from '@/ai/promptTemplates';
import { saveUsage } from '@/ai/usageStore';

export type AIProvider = 'local' | 'api';

export interface AIEngineOptions {
  provider: AIProvider;
}

export interface AskOptions {
  userId: string | number;
  query: string;
}

export interface ExplainPageOptions {
  userId: string | number;
  page: { path: string; title?: string; module?: string; fields?: any };
}

export interface SuggestFormOptions {
  userId: string | number;
  formJson: any;
}

export interface GenerateTaskOptions {
  userId: string | number;
  text: string;
}

export interface SmartSearchOptions {
  userId: string | number;
  keywords: string;
}

export interface ParseDocumentOptions {
  buffer: Buffer;
  filename?: string;
}

export class AIEngine {
  private adapter: LocalModelAdapter | ApiModelAdapter;

  constructor(opts: AIEngineOptions) {
    this.adapter = opts.provider === 'local' ? new LocalModelAdapter() : new ApiModelAdapter();
  }

  async askAI({ userId, query }: AskOptions) {
    const ctx = await buildContext(userId);
    const safeCtx = await rbacFilter(userId, ctx);
    const prompt = PROMPTS.generalHelp({ query, context: safeCtx });
    const answer = await this.adapter.generate(prompt);
    await saveUsage({ userId, action: 'askAI', input: { query }, output: answer });
    return answer;
  }

  async explainPage({ userId, page }: ExplainPageOptions) {
    const ctx = await buildContext(userId, page);
    const safeCtx = await rbacFilter(userId, ctx);
    const prompt = PROMPTS.pageExplanation({ page, context: safeCtx });
    const answer = await this.adapter.generate(prompt);
    await saveUsage({ userId, action: 'explainPage', input: { page }, output: answer });
    return answer;
  }

  async suggestFormValues({ userId, formJson }: SuggestFormOptions) {
    const ctx = await buildContext(userId, { formJson });
    const safeCtx = await rbacFilter(userId, ctx);
    const prompt = PROMPTS.formAutofill({ formJson, context: safeCtx });
    const answer = await this.adapter.generate(prompt);
    await saveUsage({ userId, action: 'suggestFormValues', input: { formJson }, output: answer });
    return answer;
  }

  async generateTaskFromText({ userId, text }: GenerateTaskOptions) {
    const ctx = await buildContext(userId);
    const safeCtx = await rbacFilter(userId, ctx);
    const prompt = PROMPTS.taskGenerator({ text, context: safeCtx });
    const answer = await this.adapter.generate(prompt);
    await saveUsage({ userId, action: 'generateTaskFromText', input: { text }, output: answer });
    return answer;
  }

  async runSmartSearch({ userId, keywords }: SmartSearchOptions) {
    const ctx = await buildContext(userId);
    const safeCtx = await rbacFilter(userId, ctx);
    const embed = await this.adapter.embed(keywords);
    // Placeholder: a real impl would query a vector DB. Return keywords + mock.
    const result = { keywords, embedDim: embed.length, context: safeCtx?.scope };
    await saveUsage({ userId, action: 'runSmartSearch', input: { keywords }, output: result });
    return result;
  }

  async parseDocument({ buffer, filename }: ParseDocumentOptions) {
    const prompt = PROMPTS.documentParser({ filename });
    const text = buffer.toString('utf8');
    const answer = await this.adapter.generate(`${prompt}\n\nContent:\n${text}`);
    return answer;
  }
}

// Provider selection: allow env override at build/runtime; default to local
const envProvider = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_AI_PROVIDER as AIProvider)) || undefined;
const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
const onRailway = typeof process !== 'undefined' && process.env.RAILWAY === '1';
const resolvedProvider: AIProvider = envProvider || (isProd || onRailway ? 'api' : 'local');

export const engine = new AIEngine({ provider: resolvedProvider });

// Optional factory for custom instances
export const createAIEngine = (provider?: AIProvider) => new AIEngine({ provider: provider || resolvedProvider });
