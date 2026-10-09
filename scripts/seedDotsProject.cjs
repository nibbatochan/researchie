const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let url = '', key = '';
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
}

const defaultUserId = '00000000-0000-0000-0000-000000000001';
const projectId = 'proj-always-on-agents-dots';

const atoms = [
  {
    id: 'atom-dots-001',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'quote',
    title: 'OpenAI Dots: Persistent Execution Model on Dedicated Cloud Computers',
    content: {
      rawText: 'Introduced on September 29, 2026 at OpenAI DevDay, OpenAI "Dots" are persistent, always-on AI agents powered by GPT-6 Astra. Unlike standard chatbots that stop when a response finishes, each Dot runs continuously on its own dedicated cloud computer and sandboxed browser, working toward a user\'s multi-step daily goals even after they close their laptop or disconnect.',
      text: 'Introduced on September 29, 2026 at OpenAI DevDay, OpenAI "Dots" are persistent, always-on AI agents powered by GPT-6 Astra. Unlike standard chatbots that stop when a response finishes, each Dot runs continuously on its own dedicated cloud computer and sandboxed browser, working toward a user\'s multi-step daily goals even after they close their laptop or disconnect.',
      description: 'Core architectural definition of OpenAI persistent agent Dots and dedicated virtual machine sandboxes.'
    },
    metadata: {
      sourceUrl: 'https://openai.com/index/introducing-dots-persistent-agents/',
      pageTitle: 'Introducing Dots: Persistent Autonomous AI Agents | OpenAI Research',
      siteName: 'OpenAI Blog & Research'
    },
    tags: ['openai-dots', 'persistent-agents', 'gpt-6-astra', 'cloud-computer'],
    user_notes: 'Key definition: runs 24/7 on dedicated cloud VM, does not shut down when user closes laptop.',
    captured_at: '2026-10-09T08:00:00Z'
  },
  {
    id: 'atom-dots-002',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'text',
    title: 'OpenAI Dots 4,000 App Ecosystem & ChatGPT Pro Tier Pricing',
    content: {
      rawText: 'OpenAI Dots can connect to over 4,000 applications through the OpenAI plugin and agent framework, enabling direct action across Slack, Microsoft Teams, GitHub, and Google Workspace. Dots are included at no extra cost for ChatGPT Pro ($200/month) and Business Premium subscribers. For Enterprise and Healthcare accounts, Dots are available as an admin-enabled beta.',
      text: 'OpenAI Dots can connect to over 4,000 applications through the OpenAI plugin and agent framework, enabling direct action across Slack, Microsoft Teams, GitHub, and Google Workspace. Dots are included at no extra cost for ChatGPT Pro ($200/month) and Business Premium subscribers. For Enterprise and Healthcare accounts, Dots are available as an admin-enabled beta.',
      description: 'Pricing tiers, subscription inclusion, and 4,000 third-party app connectors for OpenAI Dots.'
    },
    metadata: {
      sourceUrl: 'https://openai.com/index/introducing-dots-persistent-agents/',
      pageTitle: 'Introducing Dots: Persistent Autonomous AI Agents | OpenAI Research',
      siteName: 'OpenAI Blog & Research'
    },
    tags: ['pricing', 'chatgpt-pro', '4000-apps', 'integrations'],
    user_notes: 'Included in ChatGPT Pro ($200/mo) and Business Premium. Connects to 4,000 apps.',
    captured_at: '2026-10-09T08:05:00Z'
  },
  {
    id: 'atom-dots-003',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'block',
    title: 'Dots Autonomous Approval Gateways & Critical Decision Points',
    content: {
      rawText: 'Dots shift the paradigm from "consulting an AI" to "assigning an employee". However, Dots feature hardwired human approval checkpoints: when encountering payments above $50, external email broadcasts, or irreversible file modifications, the agent automatically pauses execution, sends a notification badge to the user\'s mobile app or Slack, and waits for explicit clearance before resuming.',
      text: 'Dots shift the paradigm from "consulting an AI" to "assigning an employee". However, Dots feature hardwired human approval checkpoints: when encountering payments above $50, external email broadcasts, or irreversible file modifications, the agent automatically pauses execution, sends a notification badge to the user\'s mobile app or Slack, and waits for explicit clearance before resuming.',
      description: 'Safety guardrails, approval thresholds ($50 payment limit), and human-in-the-loop pause mechanics.'
    },
    metadata: {
      sourceUrl: 'https://openai.com/index/dots-agent-safety-and-guardrails/',
      pageTitle: 'Autonomous Safety Architecture & Guardrails for Dots | OpenAI',
      siteName: 'OpenAI Blog & Research'
    },
    tags: ['safety', 'human-in-the-loop', 'approval-gates', 'guardrails'],
    user_notes: 'Safety threshold: $50 payment limit requires explicit human sign-off.',
    captured_at: '2026-10-09T08:10:00Z'
  },
  {
    id: 'atom-dots-004',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'text',
    title: 'MultiOn Vision-Based Web Navigation & Direct Action Proxy',
    content: {
      rawText: 'Founded by Div Garg at AGI, Inc., MultiOn executes daily web tasks by directly controlling live browsers as a digital proxy. Instead of relying on brittle CSS selectors that break during UI redesigns, MultiOn uses a vision-based multimodal engine that inspects pixel screen layouts, identifying input forms, buttons, and checkout flows visually.',
      text: 'Founded by Div Garg at AGI, Inc., MultiOn executes daily web tasks by directly controlling live browsers as a digital proxy. Instead of relying on brittle CSS selectors that break during UI redesigns, MultiOn uses a vision-based multimodal engine that inspects pixel screen layouts, identifying input forms, buttons, and checkout flows visually.',
      description: 'MultiOn vision engine, founder Div Garg, and pixel-based web navigation architecture.'
    },
    metadata: {
      sourceUrl: 'https://multion.ai/blog/agentic-web-automation-vision-engine',
      pageTitle: 'Agentic Web Automation with Vision: Beyond Brittle Selectors | MultiOn',
      siteName: 'MultiOn Engineering Blog'
    },
    tags: ['multion', 'div-garg', 'vision-engine', 'web-agent'],
    user_notes: 'Uses vision-based pixel perception rather than fragile CSS selectors.',
    captured_at: '2026-10-09T08:15:00Z'
  },
  {
    id: 'atom-dots-005',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'quote',
    title: 'MultiOn AGI-0 Mobile Agent for Consumer Tasks & Deliveries',
    content: {
      rawText: 'In early 2026, MultiOn released AGI-0, extending browser action agents onto iOS and Android devices. Consumer workflows include booking restaurant tables via OpenTable, placing repeat DoorDash orders without user interaction, comparing grocery prices across 3 delivery services, and handling customer support chat queues autonomously.',
      text: 'In early 2026, MultiOn released AGI-0, extending browser action agents onto iOS and Android devices. Consumer workflows include booking restaurant tables via OpenTable, placing repeat DoorDash orders without user interaction, comparing grocery prices across 3 delivery services, and handling customer support chat queues autonomously.',
      description: 'AGI-0 mobile app release, OpenTable bookings, DoorDash ordering, and grocery price comparisons.'
    },
    metadata: {
      sourceUrl: 'https://multion.ai/news/agi-0-mobile-agent-launch',
      pageTitle: 'AGI-0: Autonomous Mobile Action Agent for iOS and Android | MultiOn',
      siteName: 'MultiOn News'
    },
    tags: ['agi-0', 'mobile-agents', 'doordash', 'opentable', 'consumer-tasks'],
    user_notes: 'AGI-0 mobile app handles OpenTable, DoorDash, and price comparisons.',
    captured_at: '2026-10-09T08:20:00Z'
  },
  {
    id: 'atom-dots-006',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'block',
    title: 'Limitless AI Pendant: 100-Hour Battery Life & Aluminum Clasp Specs',
    content: {
      rawText: 'Designed by Dan Siroker, the Limitless Pendant was priced at $99. It features a compact coin-sized body measuring 31.9mm wide and 16mm thin with an anodized aluminum casing, flexible magnetic necklace clasp, and IP54 splash resistance. It delivers up to 100 hours of continuous audio recording on a single charge with USB-C fast charging.',
      text: 'Designed by Dan Siroker, the Limitless Pendant was priced at $99. It features a compact coin-sized body measuring 31.9mm wide and 16mm thin with an anodized aluminum casing, flexible magnetic necklace clasp, and IP54 splash resistance. It delivers up to 100 hours of continuous audio recording on a single charge with USB-C fast charging.',
      description: 'Limitless Pendant hardware specifications, $99 retail price, 100-hour battery, 31.9mm dimensions, IP54.'
    },
    metadata: {
      sourceUrl: 'https://www.limitless.ai/hardware-specifications-pendant',
      pageTitle: 'Limitless Pendant Technical Hardware Specifications & Battery | Limitless AI',
      siteName: 'Limitless AI Hardware'
    },
    tags: ['limitless', 'dan-siroker', 'hardware', '100-hours-battery', '99-dollars', 'specs'],
    user_notes: 'Hardware: $99, 100-hr battery, 31.9mm diameter, 16mm thickness, IP54 water resistant.',
    captured_at: '2026-10-09T08:25:00Z'
  },
  {
    id: 'atom-dots-007',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'text',
    title: 'Limitless AI Acquired by Meta & Pendant Sales Halt',
    content: {
      rawText: 'In December 2025, Limitless AI was acquired by Meta for an undisclosed sum. Hardware sales of the $99 Pendant halted on December 5, 2025. Existing hardware owners received grandfathered access to the Unlimited AI plan through December 31, 2026, while the engineering team transitioned into Meta Reality Labs to develop next-generation wearable assistants.',
      text: 'In December 2025, Limitless AI was acquired by Meta for an undisclosed sum. Hardware sales of the $99 Pendant halted on December 5, 2025. Existing hardware owners received grandfathered access to the Unlimited AI plan through December 31, 2026, while the engineering team transitioned into Meta Reality Labs to develop next-generation wearable assistants.',
      description: 'Meta acquisition in December 2025, sales stoppage on Dec 5 2025, grandfathered support until end of 2026.'
    },
    metadata: {
      sourceUrl: 'https://www.limitless.ai/meta-acquisition-announcement',
      pageTitle: 'Limitless AI Joins Meta to Accelerate Wearable Intelligence | Official Statement',
      siteName: 'Limitless AI'
    },
    tags: ['meta-acquisition', 'discontinued', 'december-2025', 'meta-reality-labs'],
    user_notes: 'Acquired by Meta in Dec 2025. Sales stopped Dec 5, 2025. Support continues through Dec 31, 2026.',
    captured_at: '2026-10-09T08:30:00Z'
  },
  {
    id: 'atom-dots-008',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'quote',
    title: 'Dot by New Computer: AI Confessional & Emotional Mirror Retrospective',
    content: {
      rawText: 'Prior to OpenAI\'s 2026 agent platform, New Computer (founded by Jason Citron and Sam Schillace) launched an iOS app named "Dot". Unlike task-oriented productivity bots, Dot was positioned as an "AI confessional" and emotional companion that helped users explore their inner thoughts, memories, and personal reflections. New Computer officially shut down the Dot service on October 5, 2025.',
      text: 'Prior to OpenAI\'s 2026 agent platform, New Computer (founded by Jason Citron and Sam Schillace) launched an iOS app named "Dot". Unlike task-oriented productivity bots, Dot was positioned as an "AI confessional" and emotional companion that helped users explore their inner thoughts, memories, and personal reflections. New Computer officially shut down the Dot service on October 5, 2025.',
      description: 'New Computer original Dot app history, Jason Citron & Sam Schillace, emotional companion, shutdown Oct 5 2025.'
    },
    metadata: {
      sourceUrl: 'https://new.computer/retrospective-dot-companion-shutdown',
      pageTitle: 'A Retrospective on Dot: Reflections from New Computer | Founder Letter',
      siteName: 'New Computer Inc.'
    },
    tags: ['new-computer', 'jason-citron', 'emotional-mirror', 'shutdown-october-2025'],
    user_notes: 'Emotional companion app by Jason Citron & Sam Schillace. Shut down Oct 5, 2025.',
    captured_at: '2026-10-09T08:35:00Z'
  },
  {
    id: 'atom-dots-009',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'block',
    title: 'Architectural Comparison: OpenAI Dots vs MultiOn vs Limitless',
    content: {
      rawText: 'The 24/7 agent race bifurcated into three distinct technical architectures by late 2026: (1) Cloud Virtual Machines (OpenAI Dots) running isolated headless browsers on server racks; (2) Client-Side DOM Vision Proxies (MultiOn) executing actions in user desktop/mobile browsers; and (3) Ambient Hardware Wearables (Limitless / Rewind) capturing microphone audio passively. While OpenAI Dots lead in enterprise integrations (4,000 apps), MultiOn leads in consumer checkout task completion rates at 89.4%.',
      text: 'The 24/7 agent race bifurcated into three distinct technical architectures by late 2026: (1) Cloud Virtual Machines (OpenAI Dots) running isolated headless browsers on server racks; (2) Client-Side DOM Vision Proxies (MultiOn) executing actions in user desktop/mobile browsers; and (3) Ambient Hardware Wearables (Limitless / Rewind) capturing microphone audio passively. While OpenAI Dots lead in enterprise integrations (4,000 apps), MultiOn leads in consumer checkout task completion rates at 89.4%.',
      description: 'Comparative analysis of cloud VMs vs browser vision proxies vs wearable ambient microphones.'
    },
    metadata: {
      sourceUrl: 'https://techcrunch.com/2026/10/01/the-rise-of-24-7-background-ai-agents/',
      pageTitle: 'The Rise of 24/7 Background AI Agents: Architectures Compared | TechCrunch',
      siteName: 'TechCrunch Analysis'
    },
    tags: ['comparison', 'benchmarks', 'architecture', '89-percent-success', 'techcrunch'],
    user_notes: 'Benchmark: MultiOn has 89.4% consumer checkout completion rate. Three distinct architectures.',
    captured_at: '2026-10-09T08:40:00Z'
  },
  {
    id: 'atom-dots-010',
    project_id: projectId,
    user_id: defaultUserId,
    type: 'image',
    title: 'OpenAI Dots Agent Architecture: Dedicated VM & Browser Sandboxing Diagram',
    content: {
      rawText: 'Visual blueprint diagram of OpenAI Dots architecture: User Goal Input -> Cloud Container Engine -> GPT-6 Astra Planning Loop -> Headless Chromium Sandboxed Environment -> 4,000 Plugin Connectors -> Mobile Notification Approval Gate for payments over $50.',
      text: 'Visual blueprint diagram of OpenAI Dots architecture: User Goal Input -> Cloud Container Engine -> GPT-6 Astra Planning Loop -> Headless Chromium Sandboxed Environment -> 4,000 Plugin Connectors -> Mobile Notification Approval Gate for payments over $50.',
      description: 'System architectural diagram illustrating the multi-layer pipeline of OpenAI Dots.'
    },
    metadata: {
      sourceUrl: 'https://openai.com/index/introducing-dots-persistent-agents/architecture-diagram.png',
      pageTitle: 'OpenAI Dots Systems Architecture & Cloud Sandbox Flow Diagram',
      siteName: 'OpenAI Systems Engineering',
      visualSnapshot: {
        rasterSnapshotUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        capturedViewport: { width: 1200, height: 800 }
      }
    },
    tags: ['visual-snapshot', 'architecture-diagram', 'openai-dots'],
    user_notes: 'Visual snapshot diagram showing GPT-6 Astra planning loop and approval gate.',
    captured_at: '2026-10-09T08:45:00Z'
  }
];

async function insertAtoms() {
  console.log(`Inserting ${atoms.length} atoms into project ${projectId}...`);
  for (const a of atoms) {
    const res = await fetch(url + '/rest/v1/atoms', {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([a])
    });
    if (!res.ok) {
      console.error('Failed to insert ' + a.id + ':', await res.text());
    } else {
      console.log('✓ Inserted atom:', a.id, '-', a.title);
    }
  }

  // Update atom_count in projects table
  const patchRes = await fetch(url + '/rest/v1/projects?id=eq.' + projectId, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ atom_count: atoms.length })
  });
  console.log('Updated project atom_count status:', patchRes.status);
}

insertAtoms().catch(console.error);
