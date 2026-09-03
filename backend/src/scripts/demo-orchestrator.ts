import { prisma } from '../lib/prisma';
import { aiReceptionistService } from '../modules/ai/services/ai-receptionist.service';

const LIVE_PROMPTS = [
  'Hello',
  'What services do you offer?',
  'Who works there?',
  'Where are you located?',
  'I want to book an appointment',
  'Can you tell me a short poem about clean teeth?',
];

export async function runOrchestratorDemo(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- AI RECEPTIONIST ORCHESTRATION LIVE DEMO ---');
  console.log('======================================================\n');

  const demoBusiness = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
  });

  if (!demoBusiness) {
    console.error('❌ Demo business not found. Run npm run db:seed first.');
    process.exit(1);
  }

  const context = {
    businessId: demoBusiness.id,
    sessionId: 'live-demo-session-1',
    channel: 'WEB' as const,
    metadata: {
      businessName: demoBusiness.name,
    },
  };

  console.log(`Context Business: ${demoBusiness.name} (ID: ${demoBusiness.id})\n`);

  for (let i = 0; i < LIVE_PROMPTS.length; i++) {
    const prompt = LIVE_PROMPTS[i];
    console.log(`[Turn ${i + 1}] Inbound Caller: "${prompt}"`);

    const result = await aiReceptionistService.processMessage({
      message: prompt,
      context,
    });

    console.log(`  ↳ Intent:   ${result.intent}`);
    console.log(`  ↳ Source:   ${result.source} ${result.toolUsed ? `(Tool: ${result.toolUsed})` : ''}`);
    console.log(`  ↳ Latency:  ${result.latencyMs?.toFixed(2)} ms`);
    console.log(`  ↳ Response: "${result.response}"\n`);
  }

  console.log('======================================================');
  console.log('🎉 LIVE ORCHESTRATOR DEMO COMPLETED CLEANLY! 🎉');
  console.log('======================================================\n');
}

if (require.main === module) {
  runOrchestratorDemo().catch((err) => {
    console.error('Orchestrator demo failed:', err);
    process.exit(1);
  });
}
