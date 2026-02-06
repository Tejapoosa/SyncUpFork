import { prisma } from "../lib/db";

async function addSampleMeetings() {
  try {
    // First, let's find or create a user
    const users = await prisma.user.findMany();
    console.log('Found users:', users.length);

    if (users.length === 0) {
      console.log('No users found. Please sign in to the app first to create a user.');
      return;
    }

    const user = users[0];
    console.log('Using user:', user.clerkId);

    // Check if meetings already exist
    const existingMeetings = await prisma.meeting.findMany({
      where: { userId: user.id }
    });

    console.log('Existing meetings:', existingMeetings.length);

    if (existingMeetings.length > 0) {
      console.log('Meetings already exist');
      return;
    }

    // Create sample meetings
    const sampleMeetings = [
      {
        id: 'meeting-1',
        title: 'Weekly Team Standup',
        description: 'Weekly team sync and progress update',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
        meetingEnded: true,
        transcriptReady: true,
        attendees: JSON.stringify([
          { email: 'alice@example.com', name: 'Alice Johnson' },
          { email: 'bob@example.com', name: 'Bob Smith' }
        ]),
        speakers: JSON.stringify(['Alice Johnson', 'Bob Smith']),
        userId: user.id,
        meetingUrl: 'https://meet.google.com/sample-meeting-1',
        summary: 'Discussed project progress and upcoming deadlines.',
        actionItems: JSON.stringify([
          { text: 'Complete user interface mockups', completed: false },
          { text: 'Review API documentation', completed: false }
        ])
      },
      {
        id: 'meeting-2',
        title: 'Product Strategy Review',
        description: 'Monthly product strategy and roadmap review',
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 1.5 hour duration
        meetingEnded: true,
        transcriptReady: true,
        attendees: JSON.stringify([
          { email: 'carol@example.com', name: 'Carol Davis' },
          { email: 'david@example.com', name: 'David Wilson' }
        ]),
        speakers: JSON.stringify(['Carol Davis', 'David Wilson']),
        userId: user.id,
        meetingUrl: 'https://meet.google.com/sample-meeting-2',
        summary: 'Reviewed Q1 goals and adjusted product roadmap.',
        actionItems: JSON.stringify([
          { text: 'Update product requirements document', completed: false },
          { text: 'Schedule user research sessions', completed: false }
        ])
      }
    ];

    // Insert sample meetings
    for (const meeting of sampleMeetings) {
      await prisma.meeting.create({
        data: meeting
      });
      console.log(`Created meeting: ${meeting.title}`);
    }

    console.log('Sample meetings added successfully!');

  } catch (error) {
    console.error('Error adding sample meetings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleMeetings();
