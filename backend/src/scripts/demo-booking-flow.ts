import { prisma } from '../lib/prisma';
import { aiReceptionistService } from '../modules/ai/services/ai-receptionist.service';

export async function runBookingDemo(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- MULTI-TURN APPOINTMENT BOOKING CONVERSATION DEMO ---');
  console.log('======================================================\n');

  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
  });

  if (!business) {
    console.error('❌ Demo business not found. Please run npm run db:seed.');
    process.exit(1);
  }

  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
  });

  const sessionId = `live-booking-session-${Date.now()}`;
  const context = {
    businessId: business.id,
    sessionId,
    customerId: customer?.id,
    channel: 'WEB' as const,
    metadata: {
      businessName: business.name,
    },
  };

  console.log(`Enterprise: ${business.name}`);
  console.log(`Customer:   ${customer?.name || 'Guest'} (${customer?.phone || 'N/A'})`);
  console.log(`Session:    ${sessionId}\n`);

  // Define conversational script
  const turns = [
    'I want to book an appointment.',
    'Comprehensive Oral Exam',
    'Anyone is fine',
    'Tomorrow',
  ];

  let lastResponse: any;
  let createdAppointmentId: string | null = null;

  try {
    for (let i = 0; i < turns.length; i++) {
      const turnInput = turns[i];
      console.log(`[User Turn ${i + 1}]: "${turnInput}"`);

      lastResponse = await aiReceptionistService.processMessage({
        message: turnInput,
        context,
      });

      console.log(`  ↳ Source:   ${lastResponse.source} ${lastResponse.toolUsed ? `(Tool: ${lastResponse.toolUsed})` : ''}`);
      console.log(`  ↳ Latency:  ${lastResponse.latencyMs?.toFixed(2)} ms`);
      console.log(`  ↳ AI:       "${lastResponse.response}"\n`);
    }

    // Turn 5: Pick the first available time slot from the previous response
    const slotSelection = '10:00 AM';
    console.log(`[User Turn 5]: "${slotSelection}"`);
    lastResponse = await aiReceptionistService.processMessage({
      message: slotSelection,
      context,
    });
    console.log(`  ↳ Source:   ${lastResponse.source}`);
    console.log(`  ↳ Latency:  ${lastResponse.latencyMs?.toFixed(2)} ms`);
    console.log(`  ↳ AI:       "${lastResponse.response}"\n`);

    // Turn 6: Confirm booking
    const confirmInput = 'Yes, please confirm';
    console.log(`[User Turn 6]: "${confirmInput}"`);
    lastResponse = await aiReceptionistService.processMessage({
      message: confirmInput,
      context,
    });
    console.log(`  ↳ Source:   ${lastResponse.source} ${lastResponse.toolUsed ? `(Tool: ${lastResponse.toolUsed})` : ''}`);
    console.log(`  ↳ Latency:  ${lastResponse.latencyMs?.toFixed(2)} ms`);
    console.log(`  ↳ AI:       "${lastResponse.response}"\n`);

    if (lastResponse.data?.id) {
      createdAppointmentId = lastResponse.data.id;
      console.log(`🌟 Confirmed Appointment ID in PostgreSQL: ${createdAppointmentId}\n`);
    }

    console.log('======================================================');
    console.log('🎉 LIVE MULTI-TURN BOOKING DEMO COMPLETED! 🎉');
    console.log('======================================================\n');
  } finally {
    // Clean up demo appointment
    if (createdAppointmentId) {
      await prisma.appointment.delete({
        where: { id: createdAppointmentId },
      }).catch(() => {});
      console.log(`Cleaned up live demo appointment record.`);
    }
  }
}

if (require.main === module) {
  runBookingDemo().catch((err) => {
    console.error('Demo execution failed:', err);
    process.exit(1);
  });
}
