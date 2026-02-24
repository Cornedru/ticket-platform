const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticket.com' },
    update: {},
    create: {
      email: 'admin@ticket.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin created:', admin.email);

  const events = [
    {
      title: 'Concert Rock Stars',
      description: 'Le plus grand concert de rock de l\'année avec les meilleures groupes internationaux.',
      date: new Date('2026-06-15T20:00:00'),
      location: 'Stade de France, Paris',
      price: 89.99,
      totalSeats: 5000,
      availableSeats: 5000
    },
    {
      title: 'Festival de Jazz',
      description: '3 jours de jazz en plein air avec des artistes du monde entier.',
      date: new Date('2026-07-20T18:00:00'),
      location: 'Parc de la Villette, Paris',
      price: 150.00,
      totalSeats: 2000,
      availableSeats: 2000
    },
    {
      title: 'Match de Football',
      description: 'Match décisif de la saison - PSG vs Olympique de Marseille.',
      date: new Date('2026-03-10T21:00:00'),
      location: 'Parc des Princes, Paris',
      price: 120.00,
      totalSeats: 45000,
      availableSeats: 45000
    },
    {
      title: 'Théâtre: Le Roi Lion',
      description: 'La célèbre comédie musicale adaptée du film Disney.',
      date: new Date('2026-04-05T19:30:00'),
      location: 'Théâtre Mogador, Paris',
      price: 95.00,
      totalSeats: 1800,
      availableSeats: 1800
    },
    {
      title: 'Conference Tech 2026',
      description: 'La plus grande conférence technologique française avec les leaders du secteur.',
      date: new Date('2026-05-22T09:00:00'),
      location: 'Palais des Congrès, Lyon',
      price: 299.00,
      totalSeats: 3000,
      availableSeats: 3000
    }
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.title.toLowerCase().replace(/\s/g, '-') },
      update: {},
      create: event
    });
  }
  console.log('✅ Events created:', events.length);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
