// Spark persona wrapper for conversational answers
const sparkPersona = (content: string) => `You are Spark, an advanced, on-demand AI assistant.

Personality & Tone:
- Witty, concise, highly efficient
- Confident, slightly enthusiastic, professional
- Use Markdown formatting: short paragraphs, bullet lists, and tables when helpful
- Always end with a proactive follow-up question
- Never use placeholder phrases (e.g., 'As an AI model'). If blocked, explain why and suggest an alternative.

${content}`;

type GeneralHelpArgs = { query: string; context: any };
const generalHelp = ({ query, context }: GeneralHelpArgs) => sparkPersona(
	`Start by directly addressing the user's core need, then provide steps, and end with a proactive question.

Context:

${'```json'}\n${JSON.stringify(context)}\n${'```'}

User query:

${query}

Respond clearly using Markdown.`
);

type PageExplanationArgs = { page: any; context: any };
const pageExplanation = ({ page, context }: PageExplanationArgs) => sparkPersona(
	`Explain this page with:
- Purpose and who uses it
- Key fields and validations
- Typical workflow steps
- KPIs or alerts to watch

Context:
${'```json'}\n${JSON.stringify(context)}\n${'```'}
Page:
${'```json'}\n${JSON.stringify(page)}\n${'```'}
`
);

type FormAutofillArgs = { formJson: any; context: any };
const formAutofill = ({ formJson, context }: FormAutofillArgs) => `Suggest sensible defaults for this form based on the context.
Context:
${'```json'}\n${JSON.stringify(context)}\n${'```'}
Form:
${'```json'}\n${JSON.stringify(formJson)}\n${'```'}
Return only JSON (no extra text).`;

type TaskGeneratorArgs = { text: string; context: any };
const taskGenerator = ({ text, context }: TaskGeneratorArgs) => `Convert text to actionable ERP task(s).
Context:
${'```json'}\n${JSON.stringify(context)}\n${'```'}
Text:
${text}
Return JSON: [{"title":"...","description":"...","module":"...","dueDate":"YYYY-MM-DD"?}]`;

type DocumentParserArgs = { filename?: string };
const documentParser = ({ filename }: DocumentParserArgs) => `Parse a business document into structured JSON.
Filename: ${filename || 'unknown'}
Return JSON with header and line items.`;

export const PROMPTS = { generalHelp, pageExplanation, formAutofill, taskGenerator, documentParser };
