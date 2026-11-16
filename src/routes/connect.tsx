import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/connect")({
  head: () => siteHead({ path: "/connect", title: "Connect an AI Assistant | Gravity Pants", description: "Connect ChatGPT, Claude or another AI assistant to your Gravity Pants account so it can read your workspaces and ads while signed in as you.", noindex: true }),
  component: ConnectPage,
});

const CHATGPT_ADVANCED = "https://chatgpt.com/#settings/Connectors/Advanced";
const CHATGPT_NEW = "https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins";

function useMcpUrl() {
  const [url, setUrl] = useState("");
  useEffect(() => { setUrl(new URL("/mcp", window.location.origin).toString()); }, []);
  return url;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex h-9 min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-ap-blue px-4 text-[14px] font-medium text-ap-card transition-colors hover:bg-ap-blue-hover disabled:opacity-60"
    >
      {copied ? <Check size={16} strokeWidth={1.7} aria-hidden /> : <Copy size={16} strokeWidth={1.7} aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.5] text-site-secondary">
          <span className="grid size-6 min-h-0 min-w-0 shrink-0 place-items-center rounded-full bg-ap-soft-blue text-[13px] font-semibold tabular-nums text-ap-blue-strong">{i + 1}</span>
          <span className="pt-px">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[24px] bg-site-panel p-6 md:p-8">
      <h3 className="text-[17px] font-semibold text-site-ink">{title}</h3>
      {children}
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-ap-blue hover:underline">{children}</a>;
}

function ConnectPage() {
  const mcpUrl = useMcpUrl();
  const claudeAdd = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent("Gravity Pants")}&connectorUrl=${encodeURIComponent(mcpUrl)}`;
  const claudeCodeCmd = `claude mcp add --scope user --transport http gravity-pants '${mcpUrl.replace(/'/g, "'\\''")}'`;

  return (
    <SiteShell>
      <section className="mx-auto max-w-[1248px] px-5 pb-20 pt-16 md:px-8 md:pt-24 lg:px-16 xl:px-24">
        <p className="text-[15px] font-semibold text-site-eyebrow">Agent integrations</p>
        <h1 className="mt-3 max-w-[720px] text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-site-ink md:text-[64px] md:tracking-[-0.035em]">Connect an AI assistant</h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.45] text-site-secondary md:text-[21px]">Let ChatGPT, Claude or another AI assistant read your Gravity Pants workspaces and ads while signed in as you. Your account permissions still decide what it can see.</p>

        <div className="mt-10 max-w-[720px] rounded-[24px] bg-site-panel p-6 md:p-8">
          <h2 className="text-[17px] font-semibold text-site-ink">Your server address</h2>
          <p className="mt-2 text-[15px] leading-[1.5] text-site-secondary">Paste this address into your assistant when it asks for the MCP server URL.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-ap-hairline bg-ap-card px-3.5 py-2.5 text-[14px] tabular-nums text-ap-ink">{mcpUrl || "…"}</code>
            <CopyButton value={mcpUrl} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-20 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">Connect</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card title="ChatGPT">
            <Steps items={[
              <>Open <ExtLink href={CHATGPT_ADVANCED}>ChatGPT connector settings</ExtLink> and turn on Developer mode, following the risk notice shown there. If Developer mode is unavailable, ask your ChatGPT admin to enable it.</>,
              <>Open the <ExtLink href={CHATGPT_NEW}>new connector dialog</ExtLink>.</>,
              <>Enter Gravity Pants as the name and paste your server address from above.</>,
              <>Review the details, check "I understand and want to continue" (ChatGPT shows this for every custom connector), then choose Create.</>,
              <>Enable Gravity Pants from the chat composer, then ask ChatGPT to use it.</>,
            ]} />
          </Card>
          <Card title="Claude">
            <Steps items={[
              <>Open the <ExtLink href={claudeAdd}>add connector dialog</ExtLink>, with the name and address already filled in.</>,
              <>Review the details and choose Add. If the filled-in form does not open, open Claude's Connectors page, choose "Add custom connector", then name it and paste your server address.</>,
              <>Sign in to Gravity Pants and approve the connection when asked.</>,
              <>Enable the connector from the chat composer, then ask Claude to use it.</>,
            ]} />
          </Card>
          <Card title="Claude Code">
            <Steps items={[
              <>Run this one line in a terminal:</>,
            ]} />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-ap-hairline bg-ap-card px-3.5 py-2.5 text-[13px] tabular-nums text-ap-ink">{claudeCodeCmd}</code>
              <CopyButton value={claudeCodeCmd} />
            </div>
            <Steps items={[
              <>Start Claude Code and run /mcp to confirm Gravity Pants is connected. Sign in from that menu when asked.</>,
              <>Ask Claude Code to use Gravity Pants.</>,
            ]} />
          </Card>
          <Card title="Other MCP clients">
            <Steps items={[
              <>Open the client's MCP server or custom connector settings.</>,
              <>Create a remote MCP server connection.</>,
              <>Name the connection and paste your server address.</>,
              <>Finish any sign-in or authorization prompts.</>,
              <>Enable the connection, then ask the assistant to use it.</>,
            ]} />
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-[1248px] px-5 pb-24 md:px-8 lg:px-16 xl:px-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-site-ink md:text-[40px]">Refresh after the app changes</h2>
        <p className="mt-4 max-w-[620px] text-[15px] leading-[1.5] text-site-secondary">A connected assistant remembers the tool list from when you connected. After Gravity Pants ships changes, refresh the connection to get the latest tools.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card title="ChatGPT">
            <Steps items={[
              <>Open ChatGPT's Plugins page and select Gravity Pants.</>,
              <>Scroll to "Information" and choose Refresh.</>,
              <>ChatGPT cannot update an existing connector's address — if it changed, delete the connector and repeat the connect steps with the latest address.</>,
              <>Start a new chat and ask ChatGPT to use Gravity Pants.</>,
            ]} />
          </Card>
          <Card title="Claude">
            <Steps items={[
              <>Open the Connectors page and select the Gravity Pants connector.</>,
              <>Refresh or update the connector's tools.</>,
              <>Claude cannot update an existing connector's address — if it changed, remove the connector and repeat the connect steps with the latest address.</>,
              <>Ask Claude to use Gravity Pants.</>,
            ]} />
          </Card>
          <Card title="Claude Code">
            <Steps items={[
              <>Start a new Claude Code session — it loads the latest tools when it connects.</>,
              <>If the address changed, run <code className="rounded bg-ap-card px-1.5 py-0.5 text-[13px] text-ap-ink">claude mcp remove gravity-pants</code>, then run the install command again with the latest address.</>,
              <>Ask Claude Code to use Gravity Pants.</>,
            ]} />
          </Card>
          <Card title="Other MCP clients">
            <Steps items={[
              <>Open the client's MCP server or connector settings.</>,
              <>Select the connection you created for Gravity Pants.</>,
              <>Refresh the tool list, reload the server, or reconnect it.</>,
              <>If the address changed, paste the latest address from above.</>,
              <>Start a new chat or session and ask the assistant to use Gravity Pants.</>,
            ]} />
          </Card>
        </div>
      </section>
    </SiteShell>
  );
}
