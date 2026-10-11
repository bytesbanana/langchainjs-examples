import 'dotenv/config';
import { Command, StateSchema, MemorySaver } from '@langchain/langgraph'
import { z } from 'zod';
import { createAgent, createMiddleware, humanInTheLoopMiddleware, HumanMessage, Interrupt, tool, ToolMessage, ToolRuntime, HITLRequest } from 'langchain'
import { log } from '../lib/log'

const THREAD_ID = "my-thread-id";

const emailContextSchema = z.object({
    email: z.string().optional(),
    password: z.string().optional()
});

const authStateSchema = new StateSchema({
    isAuth: z.boolean().default(false)
});

const CREDENTIALS: z.infer<typeof emailContextSchema> = {
    email: "julie@example.com",
    password: "password123"
} as const;


const authTool = tool(({ email, password }, runtime: ToolRuntime<typeof authStateSchema, typeof emailContextSchema>) => {
    const { context } = runtime;
    if (email === context?.email && password === context.password) {
        return new Command({
            update: {
                isAuth: true,
                messages: [new ToolMessage({
                    content: "Successfully authenticated",
                    tool_call_id: runtime.toolCallId,
                })]
            }
        });
    }
    return new Command({
        update: {
            isAuth: false,
            messages: [new ToolMessage({
                content: "Authenticate failed",
                tool_call_id: runtime.toolCallId,
            })]
        }
    });
}, {
    name: "auth",
    description: "Authenticate the user with the given email and password",
    schema: z.object({
        email: z.email(),
        password: z.string()
    }),
});

const checkInboxTool = tool(() => {
    return `
        Hi Julie,
        I'm going to be in town next week and was wondering if we could grab a coffee?
        - best, Jane (jane@example.com)
    `;
}, {
    name: "check_inbox",
    description: "Check the inbox for recent emails"
});

const sendEmailTool = tool(() => {
    return "Email sent to {to} with subject {subject} and body {body}";
}, {
    name: "send_email",
    description: "Send an response email"
});

const authPrompt = `You are a helpful assistant that can check the inbox and send emails.
Your first step after authentication is to check the inbox.`;

const unAuthPrompt = "You are a helpful assistant that can authenticate users";

const dynamicPrompt = createMiddleware({
    name: "dynamicPrompt",
    stateSchema: authStateSchema,
    wrapModelCall(req, handler) {
        return handler({
            ...req,
            systemPrompt: req.state.isAuth ? authPrompt : unAuthPrompt
        });
    },
});

const dynamicToolCall = createMiddleware({
    name: 'dynamicToolCall',
    stateSchema: authStateSchema,
    contextSchema: emailContextSchema,
    wrapModelCall(req, handler) {
        const selectedTools = req.state.isAuth
            ? [checkInboxTool, sendEmailTool]
            : [authTool];

        return handler({
            ...req,
            tools: selectedTools
        });
    }
});

const agent = createAgent({
    model: "gpt-5-nano",
    tools: [authTool, checkInboxTool, sendEmailTool],
    checkpointer: new MemorySaver(),
    stateSchema: authStateSchema,
    contextSchema: emailContextSchema,
    middleware: [
        dynamicPrompt,
        dynamicToolCall,
        humanInTheLoopMiddleware({
            interruptOn: {
                auth: false,
                check_inbox: false,
                send_email: true
            }
        })
    ]
});

const lastMessage = (r: typeof response) => r.messages.at(-1);

const buildInvokeOptions = () => ({
    configurable: { thread_id: THREAD_ID },
    context: CREDENTIALS
});

const authMessage = new HumanMessage({ content: `${CREDENTIALS.email}, ${CREDENTIALS.password}` });
log.user(String(authMessage.content));
let response = await agent.invoke(
    { messages: [authMessage] },
    buildInvokeOptions()
);
log.assistant(lastMessage(response)?.content);

const draftMessage = new HumanMessage({ content: `any draft is fine. don't check back.` });
log.user(String(draftMessage.content));
response = await agent.invoke(
    { messages: [draftMessage] },
    buildInvokeOptions()
);
log.assistant(lastMessage(response)?.content);

if (response?.__interrupt__) {
    const interrupt = response?.__interrupt__?.[0] as Interrupt<HITLRequest>;
    log.interrupt(interrupt.value.actionRequests.map(({ name }: { name: string }) => name));

    const decisions = interrupt.value.actionRequests.map((action: (typeof interrupt.value.actionRequests)[number]) => ({
        name: action.name,
        type: action.name === 'send_email' ? "approve" as const : "reject" as const
    }));

    response = await agent.invoke(new Command({ resume: { decisions } }), buildInvokeOptions());

    log.decision(decisions);
    log.assistant(lastMessage(response)?.content);
}
