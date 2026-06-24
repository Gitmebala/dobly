"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Clock3,
  FileText,
  FlaskConical,
  Headphones,
  Lightbulb,
  Link2,
  ListChecks,
  Megaphone,
  MemoryStick,
  MessageSquareText,
  Palette,
  PhoneCall,
  Radar,
  Settings2,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

type SceneName = "hero" | "capabilities" | "product" | "workflow" | "proof";
type GestureName = "hello" | "listen" | "look-up" | "look-down" | "explain" | "celebrate" | "rest" | "wave" | "point-signup" | "point-login" | "curious";
type FloatingItem = {
  icon: LucideIcon;
  title: string;
  copy: string;
  tone: "rust" | "green" | "gold" | "ink";
};

type IntentScenario = {
  short: string;
  intent: string;
  outcome: string;
  confidence: string;
  nodes: Array<{ icon: LucideIcon; label: string; detail: string; kind: string }>;
};

type OperatorArchetype = {
  name: string;
  domain: string;
  description: string;
  icon: LucideIcon;
  skills: string[];
  output: string;
};

const sceneCards: Record<SceneName, FloatingItem[]> = {
  hero: [
    { icon: PhoneCall, title: "Call handled", copy: "Lead qualified and booking prepared.", tone: "green" },
    { icon: Search, title: "Research complete", copy: "Competitors compared with sources.", tone: "rust" },
    { icon: ShieldCheck, title: "Approval needed", copy: "Invoice follow-up ready to send.", tone: "gold" },
    { icon: Radar, title: "Signal found", copy: "A delivery risk needs attention.", tone: "ink" },
  ],
  capabilities: [
    { icon: MessageSquareText, title: "Customer replied", copy: "Conversation summarized and routed.", tone: "green" },
    { icon: FileText, title: "Campaign drafted", copy: "Three directions are ready to review.", tone: "rust" },
    { icon: Workflow, title: "Teams aligned", copy: "Dependencies assigned across the launch.", tone: "ink" },
    { icon: Search, title: "Market mapped", copy: "Opportunity brief prepared with evidence.", tone: "gold" },
  ],
  product: [
    { icon: Bot, title: "Operator active", copy: "Reception is handling the morning queue.", tone: "green" },
    { icon: Link2, title: "Tools connected", copy: "Calendar, inbox, and CRM are in sync.", tone: "rust" },
    { icon: MemoryStick, title: "Memory updated", copy: "Your escalation rule is now reusable.", tone: "ink" },
    { icon: ShieldCheck, title: "Guardrail applied", copy: "Publishing remains approval-only.", tone: "gold" },
  ],
  workflow: [
    { icon: Lightbulb, title: "Intent understood", copy: "Success criteria captured from your brief.", tone: "rust" },
    { icon: ListChecks, title: "Plan organized", copy: "Work split into verified operating steps.", tone: "ink" },
    { icon: Zap, title: "Action completed", copy: "The approved update is now live.", tone: "green" },
    { icon: CheckCircle2, title: "Outcome verified", copy: "Result checked against your target.", tone: "gold" },
  ],
  proof: [
    { icon: Clock3, title: "Time returned", copy: "Routine coordination moved off your plate.", tone: "green" },
    { icon: Brain, title: "Pattern learned", copy: "Dobly improved the next operating run.", tone: "rust" },
    { icon: BarChart3, title: "Impact measured", copy: "Results are visible, not buried in chat.", tone: "ink" },
    { icon: Users, title: "Handoff complete", copy: "Only the decision reached your team.", tone: "gold" },
  ],
};

const intentScenarios: IntentScenario[] = [
  {
    short: "AI receptionist",
    intent: "Never miss a qualified customer call again.",
    outcome: "Calls answered, leads qualified, bookings prepared, and only exceptions escalated.",
    confidence: "Ready to operate",
    nodes: [
      { icon: PhoneCall, label: "Listen", detail: "Answer calls in your voice", kind: "input" },
      { icon: Brain, label: "Understand", detail: "Detect intent and urgency", kind: "reason" },
      { icon: CalendarDays, label: "Coordinate", detail: "Check availability and policy", kind: "tool" },
      { icon: ShieldCheck, label: "Guard", detail: "Escalate sensitive requests", kind: "approval" },
      { icon: CheckCircle2, label: "Complete", detail: "Book, log, and follow up", kind: "result" },
    ],
  },
  {
    short: "Market expansion",
    intent: "Find the strongest market for our next expansion.",
    outcome: "A sourced market scorecard, risk simulation, Board recommendation, and launch plan.",
    confidence: "Decision pack ready",
    nodes: [
      { icon: Search, label: "Research", detail: "Demand, competition, friction", kind: "input" },
      { icon: BarChart3, label: "Model", detail: "Score opportunity signals", kind: "reason" },
      { icon: CircleDollarSign, label: "Simulate", detail: "Compare cost and upside", kind: "tool" },
      { icon: Users, label: "Challenge", detail: "Test assumptions with the Board", kind: "approval" },
      { icon: FileText, label: "Recommend", detail: "Deliver the go / no-go pack", kind: "result" },
    ],
  },
  {
    short: "Churn recovery",
    intent: "Find why customers leave and recover the right accounts.",
    outcome: "Root causes identified, accounts prioritized, and personalized recovery actions launched.",
    confidence: "Recovery loop active",
    nodes: [
      { icon: Radar, label: "Watch", detail: "Detect retention signals", kind: "input" },
      { icon: MemoryStick, label: "Remember", detail: "Connect history and context", kind: "reason" },
      { icon: MessageSquareText, label: "Create", detail: "Prepare the right outreach", kind: "tool" },
      { icon: ShieldCheck, label: "Approve", detail: "Review high-value offers", kind: "approval" },
      { icon: Workflow, label: "Recover", detail: "Act, measure, and keep watching", kind: "result" },
    ],
  },
];

const operatorArchetypes: OperatorArchetype[] = [
  { name: "Builder", domain: "Engineering", description: "Researches architecture, writes code, tests changes, and prepares review-ready work.", icon: Code2, skills: ["Codebase access", "Testing", "GitHub", "Technical research"], output: "Working software and pull requests" },
  { name: "Product Operator", domain: "Product", description: "Turns ambiguous ideas and user evidence into decisions, specifications, and coordinated delivery.", icon: FlaskConical, skills: ["Discovery", "Analytics", "Prioritization", "Handoffs"], output: "Validated plans and shipped improvements" },
  { name: "Design Operator", domain: "Design", description: "Audits experiences, studies behavior, creates systems, and prepares implementation-ready designs.", icon: Palette, skills: ["UX research", "Prototyping", "Design systems", "Figma"], output: "Build-ready product experiences" },
  { name: "Creative Studio", domain: "Media", description: "Researches audiences and produces campaigns, visual directions, scripts, and publishing packages.", icon: Megaphone, skills: ["Audience research", "Copy", "Visuals", "Publishing"], output: "Complete creative campaigns" },
  { name: "Research Analyst", domain: "Intelligence", description: "Finds evidence, compares options, tracks change, and produces decision-ready analysis.", icon: Search, skills: ["Web research", "Synthesis", "Source checking", "Monitoring"], output: "Sourced briefs and recommendations" },
  { name: "Finance Operator", domain: "Finance", description: "Watches cash, margins, invoices, and spend, then prepares or executes bounded actions.", icon: CircleDollarSign, skills: ["Reconciliation", "Forecasting", "Collections", "Controls"], output: "Cleaner cash flow and financial decisions" },
  { name: "Operations Coordinator", domain: "Operations", description: "Keeps schedules, suppliers, inventory, handoffs, and service delivery moving.", icon: Workflow, skills: ["Scheduling", "Routing", "SOPs", "Escalation"], output: "Reliable day-to-day execution" },
  { name: "Customer Operator", domain: "Customer", description: "Handles calls, chat, support, onboarding, follow-up, and account context across channels.", icon: Headphones, skills: ["Voice", "Chat", "CRM", "Booking"], output: "Responsive customer experiences" },
  { name: "Growth Operator", domain: "Revenue", description: "Finds opportunities, qualifies demand, runs outreach, and improves the path from interest to revenue.", icon: BarChart3, skills: ["Prospecting", "Experiments", "Pipeline", "Attribution"], output: "Qualified growth and revenue motion" },
  { name: "General Manager", domain: "Leadership", description: "Coordinates specialist Operators, watches the whole business, and escalates only meaningful decisions.", icon: Users, skills: ["Delegation", "Briefings", "Policy", "Cross-team coordination"], output: "A business that stays aligned" },
  { name: "Watchtower", domain: "Monitoring", description: "Continuously watches systems, competitors, risks, metrics, and commitments for important change.", icon: Radar, skills: ["Signals", "Alerts", "Anomaly detection", "Recurring loops"], output: "Early warning and timely action" },
  { name: "Custom Operator", domain: "Anything else", description: "Dobly composes a new role from the objective, tools, knowledge, standards, autonomy, and review rules you define.", icon: Settings2, skills: ["Any connected tool", "Custom memory", "Your policies", "Adaptive workflow"], output: "A coworker shaped around your work" },
];

const capabilities = [
  { title: "Communicate", copy: "Calls, chat, email, follow-up, and customer handoffs.", icon: MessageSquareText },
  { title: "Research", copy: "Find, compare, synthesize, and prepare decision-ready answers.", icon: Search },
  { title: "Create", copy: "Documents, campaigns, reports, designs, and technical work.", icon: FileText },
  { title: "Coordinate", copy: "Route work, chase dependencies, and keep teams aligned.", icon: Workflow },
  { title: "Act", copy: "Use connected software to move approved work forward.", icon: Zap },
  { title: "Monitor", copy: "Watch the business and escalate only what truly matters.", icon: Radar },
];

const steps = [
  { title: "Direct", copy: "Describe the outcome and what good looks like.", icon: Lightbulb },
  { title: "Organize", copy: "Dobly builds the Operator, tools, memory, and plan.", icon: ListChecks },
  { title: "Execute", copy: "Research, create, coordinate, and act through software.", icon: Bot },
  { title: "Approve", copy: "Risky actions pause with full context for your decision.", icon: ShieldCheck },
  { title: "Improve", copy: "Dobly verifies outcomes and learns how you work.", icon: Brain },
];

const faqs = [
  ["What is Dobly?", "Dobly is an AI operating system that turns your intent into completed, monitored work."],
  ["Is Dobly just another chatbot?", "No. Chat is one interface. Operators, tools, memory, approvals, artifacts, and recurring loops are the operating system underneath."],
  ["Can Dobly act without asking me?", "Low-risk work can run inside your guardrails. Customer-facing, financial, publishing, and other consequential actions can require approval."],
  ["What can an Operator handle?", "Operators can communicate, research, create, coordinate, build, monitor, and prepare decisions across connected tools."],
  ["Does Dobly learn my business?", "Yes. Approved policies, preferences, examples, decisions, and outcomes become reusable business memory."],
];

export default function DoblyLandingPage() {
  const { scene, gesture, direction, blinking, focusTarget, companionVisible, setPointerNear, triggerCelebration } = useLandingMotion();
  const activeCards = sceneCards[scene];
  const mascotStageRef = useRef<HTMLDivElement>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const subscribeToNewsletter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsletterStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail.trim().toLowerCase() }),
      });
      if (!response.ok) throw new Error("Subscription failed");
      setNewsletterEmail("");
      setNewsletterStatus("success");
    } catch {
      setNewsletterStatus("error");
    }
  };

  const trackMascotPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = mascotStageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    stage.style.setProperty("--look-yaw", `${(x * 4).toFixed(2)}deg`);
    stage.style.setProperty("--look-pitch", `${(y * -3).toFixed(2)}deg`);
  };

  return (
    <main className="dl-page" data-mascot-focus={focusTarget ?? "none"}>
      <header className="dl-header">
        <div className="dl-container dl-nav">
          <Link href="/" className="dl-logo" aria-label="Dobly home">
            <span className="dl-logo-mark">D</span>
            <span>Dobly</span>
          </Link>
          <nav className="dl-nav-links" aria-label="Main navigation">
            <a href="#product">Product <ChevronDown /></a>
            <a href="#solutions">Solutions <ChevronDown /></a>
            <a href="#how">How it works</a>
            <Link href="/pricing">Pricing</Link>
            <a href="#about">About</a>
          </nav>
          <div className="dl-nav-actions">
            <ThemeToggle compact />
            <Link href="/auth/login" className="dl-login" data-mascot-target="login">Log in</Link>
            <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl-button dl-button-small" data-mascot-target="signup">Start free</Link>
          </div>
        </div>
      </header>

      <section className="dl-hero dl-container" data-scene="hero">
        <div className="dl-hero-copy">
          <div className="dl-pill"><Sparkles /> AI that turns intent into action.</div>
          <h1>
            Meet Dobly,<br />
            the AI operating system<br />
            for <span>getting work done.</span>
          </h1>
          <p>
            Describe the outcome. Dobly builds the right Operators and keeps the work moving.
          </p>
          <div className="dl-hero-actions">
            <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl-button" data-mascot-target="signup" onPointerEnter={triggerCelebration}>Start building <ArrowRight /></Link>
            <a href="#product" className="dl-button dl-button-ghost">See how it works <span>▶</span></a>
          </div>
          <div className="dl-proof-line">
            <div className="dl-avatar-stack" aria-hidden="true">
              <span>O</span><span>F</span><span>M</span>
            </div>
            <p><strong>Operators for every kind of work</strong><br />Supervised by you, improved by outcomes.</p>
          </div>
        </div>

        <div
          ref={mascotStageRef}
          className="dl-hero-visual"
          data-gesture={gesture}
          data-direction={direction}
          data-blink={blinking}
          data-focus={focusTarget ?? "none"}
          onPointerEnter={() => setPointerNear(true)}
          onPointerMove={trackMascotPointer}
          onPointerLeave={() => {
            setPointerNear(false);
            mascotStageRef.current?.style.setProperty("--look-yaw", "0deg");
            mascotStageRef.current?.style.setProperty("--look-pitch", "0deg");
          }}
          data-testid="mascot-stage"
        >
          <div className="dl-signal-field" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </div>
          <div className="dl-orbit dl-orbit-one" />
          <div className="dl-orbit dl-orbit-two" />
          <div className="dl-mascot-wrap">
            <span className="dl-mascot-status"><i /> {mascotStatus[gesture]}</span>
            <Image
              src="/dobly-mascot-fullbody.png"
              alt="Dobly, a friendly AI operating assistant"
              width={1024}
              height={1536}
              priority
              className="dl-mascot"
            />
            <span className="dl-face-life" aria-hidden="true">
              <i className="dl-eye dl-eye-left" />
              <i className="dl-eye dl-eye-right" />
            </span>
            <span className="dl-mascot-shadow" />
          </div>
          <div className="dl-mascot-intent" aria-hidden="true">
            <i />
            <span>{focusTarget === "login" ? "Already have a workspace?" : "Build your first Operator"}</span>
          </div>
          {activeCards.map((card, index) => (
            <FloatingCard
              key={`${scene}-${card.title}`}
              className={`dl-float-${index + 1}`}
              item={card}
              index={index}
            />
          ))}
          <div className="dl-scene-label" aria-live="polite">
            <span>{sceneLabels[scene].step}</span>
            <p>{sceneLabels[scene].label}</p>
          </div>
        </div>
      </section>

      <Link
        href="/auth/signup?next=%2Fdashboard%2Fonboarding"
        className="dl-companion"
        data-visible={companionVisible}
        data-gesture={gesture}
        data-blink={blinking}
        aria-label="Start building with Dobly"
      >
        <span><Image src="/dobly-mascot-fullbody.png" alt="" width={180} height={270} /></span>
        <small>{gesture === "wave" ? "Still with you." : "Ready when you are."}</small>
      </Link>

      <section className="dl-container dl-trust">
        <p>One operating system. Many kinds of coworker.</p>
        <div><span>Build</span><span>Analyze</span><span>Create</span><span>Coordinate</span><span>Operate</span><span>Lead</span></div>
      </section>

      <section id="solutions" className="dl-container dl-value-grid">
        <ValueCard icon={Brain} title="Understands outcomes" copy="Intent becomes an operating plan." />
        <ValueCard icon={Zap} title="Actually does the work" copy="Operators use connected tools." />
        <ValueCard icon={ShieldCheck} title="Keeps trust visible" copy="You control consequential actions." />
      </section>

      <OperatorFoundry />

      <section className="dl-container dl-capability-section" data-scene="capabilities">
        <h2>Six capabilities. <span>Any kind of work.</span></h2>
        <div className="dl-capability-grid">
          {capabilities.map(({ title, copy, icon: Icon }) => (
            <article key={title} className="dl-capability">
              <span><Icon /></span><h3>{title}</h3><p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <IntentEngine />

      <section id="product" className="dl-container dl-product" data-scene="product">
        <div className="dl-product-copy">
          <p className="dl-eyebrow">One command center.</p>
          <h2>See the work. <span>Direct the system.</span></h2>
          <p>
            Operators, decisions, approvals, and outcomes stay visible.
          </p>
          <Link href="/auth/signup?next=%2Fdashboard" className="dl-text-link">Explore Homebase <ArrowRight /></Link>
        </div>
        <HomebaseMockup />
      </section>

      <section id="how" className="dl-container dl-workflow" data-scene="workflow">
        <p>From direction to completion.</p>
        <h2>A better way to move work forward.</h2>
        <div className="dl-step-grid">
          {steps.map(({ title, copy, icon: Icon }, index) => (
            <article key={title} className="dl-step">
              <span className="dl-step-number">{index + 1}</span>
              <span className="dl-step-icon"><Icon /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
              {index < steps.length - 1 ? <ArrowRight className="dl-step-arrow" /> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="dl-container dl-proof-grid" data-scene="proof">
        <article className="dl-proof-card">
          <p className="dl-card-label">The Dobly difference</p>
          <blockquote>“It does not just tell you what to do. It organizes the intelligence, tools, and execution required to make it happen.”</blockquote>
          <div className="dl-quote-person"><span>D</span><p><strong>One system</strong><br />From intent to completed work</p></div>
        </article>
        <article className="dl-proof-card">
          <p className="dl-card-label">The operating model</p>
          <div className="dl-metrics">
            <Metric icon={Bot} value="Operators" label="Own outcomes" />
            <Metric icon={Clock3} value="Loops" label="Keep work moving" />
            <Metric icon={MemoryStick} value="Memory" label="Improves every run" />
          </div>
        </article>
        <article className="dl-proof-card dl-faq-card">
          <p className="dl-card-label">Frequently asked questions</p>
          <FaqAccordion />
        </article>
      </section>

      <section className="dl-container dl-cta">
        <div className="dl-cta-copy">
          <h2>Clarity starts here.</h2>
          <p>Join thousands of teams who do their best work with Dobly.</p>
        </div>
        <div className="dl-cta-action">
          <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl-button dl-button-white">Start free for teams <ArrowRight /></Link>
          <span>No credit card required</span>
        </div>
        <div className="dl-cta-mascot-crop" aria-hidden="true">
          <Image src="/dobly-mascot-fullbody.png" alt="" width={300} height={450} className="dl-cta-mascot" />
        </div>
      </section>

      <footer id="about" className="dl-container dl-footer">
        <div className="dl-footer-brand">
          <Link href="/" className="dl-logo"><span className="dl-logo-mark">D</span><span>Dobly</span></Link>
          <p>The AI operating system for getting work done.</p>
        </div>
        <FooterColumn title="Product" links={[
          { label: "Operators", href: "#operators" },
          { label: "Homebase", href: "/auth/signup?next=%2Fdashboard" },
          { label: "Connections", href: "/auth/signup?next=%2Fdashboard%2Fconnections" },
          { label: "Security", href: "/security" },
        ]} />
        <FooterColumn title="Operators" links={[
          { label: "Builders", href: "/auth/signup?next=%2Fdashboard%2Fgenerate%3Foperator%3Dbuilder" },
          { label: "Analysts", href: "/auth/signup?next=%2Fdashboard%2Fgenerate%3Foperator%3Danalyst" },
          { label: "Creators", href: "/auth/signup?next=%2Fdashboard%2Fgenerate%3Foperator%3Dcreator" },
          { label: "Custom roles", href: "/auth/signup?next=%2Fdashboard%2Fgenerate" },
        ]} />
        <FooterColumn title="Resources" links={[
          { label: "How it works", href: "#how" },
          { label: "Pricing", href: "/pricing" },
          { label: "Help Center", href: "/auth/login?redirect=%2Fdashboard%2Fhelp" },
          { label: "Contact", href: "mailto:hello@dobly.io" },
        ]} />
        <div className="dl-footer-news">
          <strong>Stay in the loop</strong>
          <p>Product updates and operating ideas.</p>
          <form onSubmit={subscribeToNewsletter}>
            <input
              aria-label="Email address"
              type="email"
              value={newsletterEmail}
              onChange={(event) => {
                setNewsletterEmail(event.target.value);
                setNewsletterStatus("idle");
              }}
              placeholder="Enter your email"
              required
            />
            <button type="submit" disabled={newsletterStatus === "loading"} aria-label="Subscribe"><ArrowRight /></button>
          </form>
          <small className="dl-news-status" data-status={newsletterStatus} aria-live="polite">
            {newsletterStatus === "success" ? "You are on the list." : newsletterStatus === "error" ? "Could not subscribe. Try again." : ""}
          </small>
        </div>
        <div className="dl-footer-bottom"><span>© 2026 Dobly. All rights reserved.</span><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link></div>
      </footer>
    </main>
  );
}

const mascotStatus: Record<GestureName, string> = {
  hello: "Ready when you are",
  listen: "Listening",
  "look-up": "Following your lead",
  "look-down": "Moving with you",
  explain: "Connecting the work",
  celebrate: "That is a good start",
  rest: "Watching the business",
  wave: "Good to see you again",
  "point-signup": "This is where we begin",
  "point-login": "Your workspace is ready",
  curious: "What should we handle?",
};

const sceneLabels: Record<SceneName, { step: string; label: string }> = {
  hero: { step: "01", label: "Understand the intent" },
  capabilities: { step: "02", label: "Assemble the capabilities" },
  product: { step: "03", label: "Operate in Homebase" },
  workflow: { step: "04", label: "Move work to completion" },
  proof: { step: "05", label: "Learn from the outcome" },
};

function FloatingCard({ className, item, index }: { className: string; item: FloatingItem; index: number }) {
  const Icon = item.icon;
  return (
    <div
      className={`dl-floating-card ${className}`}
      data-tone={item.tone}
      style={{ "--card-index": index } as CSSProperties}
    >
      <div><Icon /><strong>{item.title}</strong></div>
      <p>{item.copy}</p>
      <span><Check /></span>
    </div>
  );
}

function ValueCard({ icon: Icon, title, copy }: { icon: typeof Bot; title: string; copy: string }) {
  return <article className="dl-value-card"><span><Icon /></span><div><h3>{title}</h3><p>{copy}</p></div></article>;
}

function OperatorFoundry() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const operator = operatorArchetypes[selectedIndex];
  const Icon = operator.icon;

  return (
    <section id="operators" className="dl-container dl-foundry">
      <div className="dl-foundry-heading">
        <p className="dl-eyebrow">The Operator Foundry</p>
        <h2>One outcome. <span>The right coworker.</span></h2>
        <p>
          Choose a role, or let Dobly invent one around the responsibility.
        </p>
      </div>

      <div className="dl-foundry-shell">
        <div className="dl-foundry-list" role="listbox" aria-label="Operator archetypes">
          {operatorArchetypes.map(({ name, domain, icon: OperatorIcon }, index) => (
            <button
              type="button"
              role="option"
              aria-selected={selectedIndex === index}
              key={name}
              onClick={() => setSelectedIndex(index)}
            >
              <span><OperatorIcon /></span>
              <div><strong>{name}</strong><small>{domain}</small></div>
              <ArrowRight />
            </button>
          ))}
        </div>

        <article className="dl-foundry-detail" key={operator.name}>
          <div className="dl-foundry-role">
            <span><Icon /></span>
            <div><small>{operator.domain} Operator</small><h3>{operator.name}</h3></div>
            <i>Composable</i>
          </div>
          <p>{operator.description}</p>
          <div className="dl-foundry-skills">
            {operator.skills.map((skill) => <span key={skill}><Check /> {skill}</span>)}
          </div>
          <div className="dl-foundry-output">
            <div><Sparkles /><span><small>Owns the outcome</small><strong>{operator.output}</strong></span></div>
            <div className="dl-foundry-stack" aria-label="Operator architecture">
              <span>Tools</span><span>Memory</span><span>Policy</span><span>Loops</span>
            </div>
          </div>
          <div className="dl-foundry-custom">
            <Brain />
            <p><strong>No template fits?</strong> Describe the responsibility. Dobly designs and tests a new Operator around it.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function IntentEngine() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [running, setRunning] = useState(true);
  const scenario = intentScenarios[scenarioIndex];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setActiveStep((step) => {
        if (step >= scenario.nodes.length) {
          setRunning(false);
          return step;
        }
        return step + 1;
      });
    }, 620);
    return () => window.clearInterval(timer);
  }, [running, scenario.nodes.length]);

  const chooseScenario = (index: number) => {
    setScenarioIndex(index);
    setActiveStep(0);
    setRunning(true);
  };

  const replay = () => {
    setActiveStep(0);
    setRunning(true);
  };

  return (
    <section className="dl-container dl-intent-engine" aria-label="Interactive Dobly intent engine">
      <div className="dl-intent-heading">
        <div>
          <p className="dl-eyebrow">From intent to operation</p>
          <h2>Say the outcome. <span>Watch Dobly build the system.</span></h2>
        </div>
        <p>Every mission gets its own people, tools, controls, and definition of done.</p>
      </div>

      <div className="dl-intent-tabs" role="tablist" aria-label="Example business outcomes">
        {intentScenarios.map((item, index) => (
          <button
            key={item.short}
            type="button"
            role="tab"
            aria-selected={scenarioIndex === index}
            onClick={() => chooseScenario(index)}
          >
            <span>0{index + 1}</span>{item.short}
          </button>
        ))}
      </div>

      <div className="dl-intent-stage">
        <div className="dl-intent-command">
          <span><Sparkles /> Owner intent</span>
          <strong>{scenario.intent}</strong>
          <div>
            <i />
            <small>{running ? "Dobly is assembling the operation" : scenario.confidence}</small>
          </div>
        </div>

        <div className="dl-intent-map">
          <div className="dl-intent-line" aria-hidden="true"><i style={{ width: `${Math.min(activeStep / scenario.nodes.length, 1) * 100}%` }} /></div>
          {scenario.nodes.map(({ icon: Icon, label, detail, kind }, index) => {
            const state = activeStep > index ? "complete" : activeStep === index ? "active" : "waiting";
            return (
              <button
                type="button"
                className="dl-intent-node"
                data-state={state}
                data-kind={kind}
                key={label}
                onClick={() => {
                  setActiveStep(index + 1);
                  setRunning(false);
                }}
              >
                <span><Icon /></span>
                <strong>{label}</strong>
                <small>{detail}</small>
                <i>{state === "complete" ? <Check /> : index + 1}</i>
              </button>
            );
          })}
        </div>

        <div className="dl-intent-result" data-ready={activeStep >= scenario.nodes.length}>
          <div>
            <span><CheckCircle2 /> Verified outcome</span>
            <strong>{scenario.outcome}</strong>
          </div>
          <button type="button" onClick={replay} aria-label="Replay operating sequence">
            <Zap /> Run again
          </button>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Bot; value: string; label: string }) {
  return <div><Icon /><strong>{value}</strong><span>{label}</span></div>;
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return <div className="dl-footer-column"><strong>{title}</strong>{links.map((link) => <Link key={link.label} href={link.href}>{link.label}</Link>)}</div>;
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return faqs.map(([question, answer], index) => (
    <details
      key={question}
      open={openIndex === index}
      onToggle={(event) => {
        if (event.currentTarget.open) setOpenIndex(index);
      }}
    >
      <summary onClick={(event) => {
        event.preventDefault();
        setOpenIndex((current) => current === index ? -1 : index);
      }}>
        {question}<span>+</span>
      </summary>
      <p>{answer}</p>
    </details>
  ));
}

function HomebaseMockup() {
  return (
    <div className="dl-app-frame">
      <aside>
        <div className="dl-mini-logo"><span>D</span> Dobly</div>
        {[
          [BarChart3, "Homebase", true],
          [Bot, "Operators", false],
          [Users, "Rooms", false],
          [ShieldCheck, "Approvals", false],
          [MemoryStick, "Memory", false],
          [Link2, "Connections", false],
        ].map(([Icon, label, active]) => {
          const AppIcon = Icon as typeof Bot;
          return <div key={String(label)} className={active ? "active" : ""}><AppIcon />{String(label)}</div>;
        })}
      </aside>
      <main>
        <header><div><p>Good morning, Alex</p><span>Here is what your business needs today.</span></div><span>⌕</span></header>
        <div className="dl-command"><Sparkles /><span>What should Dobly handle?</span><button><ArrowRight /></button></div>
        <div className="dl-operator-row">
          <MiniOperator icon={Code2} name="Product Builder" status="Active" copy="Testing the onboarding fix" />
          <MiniOperator icon={Search} name="Market Analyst" status="Active" copy="Expansion brief in progress" />
          <MiniOperator icon={Users} name="General Manager" status="Watching" copy="Coordinating three handoffs" />
        </div>
        <div className="dl-activity">
          <strong>Recent activity</strong>
          <p><CheckCircle2 /> Product Builder passed the regression suite <span>2m</span></p>
          <p><ShieldCheck /> Campaign launch is ready for approval <span>15m</span></p>
          <p><Radar /> Watchtower detected a supplier risk <span>1h</span></p>
        </div>
      </main>
      <section>
        <div><strong>Approvals</strong><span>3</span></div>
        <p><FileText /><span><strong>Expansion decision</strong><small>Strategy Operator</small></span><button>Review</button></p>
        <p><MessageSquareText /><span><strong>Launch campaign</strong><small>Creative Operator</small></span><button>Review</button></p>
        <div className="dl-brief"><strong>Morning briefing</strong><p><Zap /> 42.5 hours of work moved forward this week.</p></div>
      </section>
    </div>
  );
}

function MiniOperator({ icon: Icon, name, status, copy }: { icon: typeof Bot; name: string; status: string; copy: string }) {
  return <article><div><Icon /><span><strong>{name}</strong><small>{status}</small></span></div><p>{copy}</p><i /></article>;
}

function useLandingMotion() {
  const [scene, setScene] = useState<SceneName>("hero");
  const [gesture, setGesture] = useState<GestureName>("hello");
  const [direction, setDirection] = useState<"up" | "down" | "still">("still");
  const [blinking, setBlinking] = useState(false);
  const [focusTarget, setFocusTarget] = useState<"signup" | "login" | null>(null);
  const [companionVisible, setCompanionVisible] = useState(false);
  const pointerNear = useRef(false);
  const lastScrollY = useRef(0);
  const furthestScrollY = useRef(0);
  const lastDirection = useRef<"up" | "down" | "still">("still");
  const lastGesture = useRef<GestureName>("hello");
  const lastActivity = useRef(Date.now());
  const heroVisible = useRef(true);
  const gestureTimer = useRef<number | undefined>(undefined);
  const autonomousTimer = useRef<number | undefined>(undefined);
  const blinkTimer = useRef<number | undefined>(undefined);
  const sceneRef = useRef<SceneName>("hero");

  const performGesture = useCallback((next: GestureName, duration = 1300, target: "signup" | "login" | null = null) => {
    if (next === lastGesture.current && next !== "look-up" && next !== "look-down") return;
    lastGesture.current = next;
    setGesture(next);
    setFocusTarget(target);
    window.clearTimeout(gestureTimer.current);
    gestureTimer.current = window.setTimeout(() => {
      setFocusTarget(null);
      const resting = pointerNear.current ? "listen" : sceneRef.current === "hero" ? "rest" : "explain";
      lastGesture.current = resting;
      setGesture(resting);
      setDirection("still");
    }, duration);
  }, []);

  const scheduleRest = useCallback((delay = 1100) => {
    window.clearTimeout(gestureTimer.current);
    gestureTimer.current = window.setTimeout(() => {
      const resting = pointerNear.current ? "listen" : sceneRef.current === "hero" ? "rest" : "explain";
      lastGesture.current = resting;
      setGesture(resting);
      setFocusTarget(null);
      setDirection("still");
    }, delay);
  }, []);

  const setPointerNear = useCallback((near: boolean) => {
    pointerNear.current = near;
    lastActivity.current = Date.now();
    const next = near ? "listen" : sceneRef.current === "hero" ? "rest" : "explain";
    lastGesture.current = next;
    setGesture(next);
    setFocusTarget(null);
  }, []);

  const triggerCelebration = useCallback(() => {
    performGesture("celebrate", 1500);
  }, [performGesture]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastScrollY.current = window.scrollY;

    const scheduleBlink = () => {
      if (reducedMotion) return;
      window.clearTimeout(blinkTimer.current);
      const delay = 2600 + Math.random() * 5200;
      blinkTimer.current = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          setBlinking(true);
          window.setTimeout(() => setBlinking(false), 145 + Math.random() * 90);
        }
        scheduleBlink();
      }, delay);
    };

    const scheduleAutonomousBehavior = () => {
      if (reducedMotion) return;
      window.clearTimeout(autonomousTimer.current);
      const delay = 4200 + Math.random() * 6200;
      autonomousTimer.current = window.setTimeout(() => {
        const idleFor = Date.now() - lastActivity.current;
        if (document.visibilityState === "visible" && idleFor > 3000 && !pointerNear.current) {
          const options: Array<{ gesture: GestureName; target: "signup" | "login" | null }> = heroVisible.current
            ? [
                { gesture: "curious", target: null },
                { gesture: "point-signup", target: "signup" },
                { gesture: "point-login", target: "login" },
                { gesture: "wave", target: null },
              ]
            : [
                { gesture: "curious", target: null },
                { gesture: "wave", target: null },
              ];
          const candidates = options.filter((option) => option.gesture !== lastGesture.current);
          const choice = candidates[Math.floor(Math.random() * candidates.length)];
          if (choice) performGesture(choice.gesture, 1700 + Math.random() * 700, choice.target);
        }
        scheduleAutonomousBehavior();
      }, delay);
    };

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible.current = entry?.isIntersecting ?? false;
    }, { threshold: .2 });
    const hero = document.querySelector<HTMLElement>(".dl-hero");
    if (hero) heroObserver.observe(hero);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const nextScene = visible?.target.getAttribute("data-scene") as SceneName | null;
      if (!nextScene || nextScene === sceneRef.current) return;

      sceneRef.current = nextScene;
      setScene(nextScene);
      if (!reducedMotion) {
        performGesture(nextScene === "workflow" ? "celebrate" : "explain", nextScene === "workflow" ? 1450 : 1050);
      }
    }, { rootMargin: "-20% 0px -42% 0px", threshold: [0.08, 0.3, 0.55] });

    document.querySelectorAll<HTMLElement>("[data-scene]").forEach((section) => observer.observe(section));

    let ticking = false;
    const onScroll = () => {
      if (ticking || reducedMotion || pointerNear.current) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const nextY = window.scrollY;
        const delta = nextY - lastScrollY.current;
        furthestScrollY.current = Math.max(furthestScrollY.current, nextY);
        setCompanionVisible(nextY > 720 && nextY < document.documentElement.scrollHeight - window.innerHeight - 340);
        if (Math.abs(delta) > 10) {
          const nextDirection = delta > 0 ? "down" : "up";
          setDirection(nextDirection);
          lastActivity.current = Date.now();
          const reversedUp = nextDirection === "up" && lastDirection.current === "down" && furthestScrollY.current - nextY > 120;
          if (reversedUp && nextY < 1050) {
            performGesture("wave", 1500);
          } else {
            const nextGesture = nextDirection === "down" ? "look-down" : "look-up";
            lastGesture.current = nextGesture;
            setGesture(nextGesture);
            scheduleRest(700);
          }
          lastDirection.current = nextDirection;
        }
        lastScrollY.current = nextY;
        ticking = false;
      });
    };

    const registerActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", registerActivity, { passive: true });
    window.addEventListener("keydown", registerActivity);
    scheduleBlink();
    scheduleAutonomousBehavior();
    scheduleRest(1900);
    return () => {
      observer.disconnect();
      heroObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", registerActivity);
      window.removeEventListener("keydown", registerActivity);
      window.clearTimeout(gestureTimer.current);
      window.clearTimeout(autonomousTimer.current);
      window.clearTimeout(blinkTimer.current);
    };
  }, [performGesture, scheduleRest]);

  return { scene, gesture, direction, blinking, focusTarget, companionVisible, setPointerNear, triggerCelebration };
}
