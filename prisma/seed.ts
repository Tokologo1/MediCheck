import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@medicheck.com" },
    update: {},
    create: {
      email: "admin@medicheck.com",
      passwordHash: adminPasswordHash,
      name: "System Admin",
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create regular user
  const userPasswordHash = await bcrypt.hash("User@123", 12);
  const user = await prisma.user.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      email: "john@example.com",
      passwordHash: userPasswordHash,
      name: "John Doe",
      role: Role.USER,
    },
  });
  console.log(`✅ User created: ${user.email}`);

  // Create dispensaries
  const dispensary1 = await prisma.dispensary.upsert({
    where: { id: "disp_001" },
    update: {},
    create: {
      id: "disp_001",
      name: "Dis-Chem Pharmacy - Rosebank",
      address: "50 Bath Avenue, Rosebank, Johannesburg, 2196",
      phone: "+27 11 788 5123",
      email: "rosebank@dischem.co.za",
      operatingHours: "Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM",
      latitude: -26.1458,
      longitude: 28.0436,
    },
  });

  const dispensary2 = await prisma.dispensary.upsert({
    where: { id: "disp_002" },
    update: {},
    create: {
      id: "disp_002",
      name: "Clicks Pharmacy - Waterfront",
      address: "V&A Waterfront, Breakwater Blvd, Cape Town, 8001",
      phone: "+27 21 418 2511",
      email: "waterfront@clicks.co.za",
      operatingHours: "Mon-Sat: 9:00 AM - 6:00 PM",
      latitude: -33.9036,
      longitude: 18.4215,
    },
  });

  const dispensary3 = await prisma.dispensary.upsert({
    where: { id: "disp_003" },
    update: {},
    create: {
      id: "disp_003",
      name: "Medirite Pharmacy - Menlyn",
      address: "Menlyn Park Shopping Centre, Atterbury Rd, Pretoria, 0063",
      phone: "+27 12 368 1120",
      email: "menlyn@medirite.co.za",
      operatingHours: "Mon-Sun: 9:00 AM - 9:00 PM",
      latitude: -25.7825,
      longitude: 28.2758,
    },
  });
  console.log(`✅ Created ${3} dispensaries`);

  // Create medications
  const medications = [
    {
      id: "med_001",
      name: "Amoxicillin 500mg",
      description: "Broad-spectrum antibiotic for bacterial infections",
      category: "Antibiotics",
      dosage: "500mg capsules",
      manufacturer: "Aspen Pharmacare",
      requiresPrescription: true,
    },
    {
      id: "med_002",
      name: "Paracetamol 500mg",
      description: "Pain reliever and fever reducer",
      category: "Analgesics",
      dosage: "500mg tablets",
      manufacturer: "Adcock Ingram",
      requiresPrescription: false,
    },
    {
      id: "med_003",
      name: "Ibuprofen 400mg",
      description: "Anti-inflammatory pain relief medication",
      category: "Analgesics",
      dosage: "400mg tablets",
      manufacturer: "Cipla Medpro",
      requiresPrescription: false,
    },
    {
      id: "med_004",
      name: "Metformin 500mg",
      description: "Oral medication for type 2 diabetes management",
      category: "Antidiabetics",
      dosage: "500mg tablets",
      manufacturer: "Apotex South Africa",
      requiresPrescription: true,
    },
    {
      id: "med_005",
      name: "Omeprazole 20mg",
      description: "Proton pump inhibitor for acid reflux and ulcers",
      category: "Gastrointestinal",
      dosage: "20mg capsules",
      manufacturer: "Aspen Pharmacare",
      requiresPrescription: true,
    },
    {
      id: "med_006",
      name: "Cetirizine 10mg",
      description: "Antihistamine for allergy relief",
      category: "Antihistamines",
      dosage: "10mg tablets",
      manufacturer: "Adcock Ingram",
      requiresPrescription: false,
    },
    {
      id: "med_007",
      name: "Salbutamol Inhaler",
      description: "Bronchodilator for asthma and breathing difficulties",
      category: "Respiratory",
      dosage: "100mcg per actuation",
      manufacturer: "Cipla Medpro",
      requiresPrescription: true,
    },
    {
      id: "med_008",
      name: "Amlodipine 5mg",
      description: "Calcium channel blocker for high blood pressure",
      category: "Cardiovascular",
      dosage: "5mg tablets",
      manufacturer: "Apotex South Africa",
      requiresPrescription: true,
    },
    {
      id: "med_009",
      name: "Vitamin D3 1000IU",
      description: "Dietary supplement for bone health",
      category: "Supplements",
      dosage: "1000IU capsules",
      manufacturer: "Ascendis Health",
      requiresPrescription: false,
    },
    {
      id: "med_010",
      name: "Loperamide 2mg",
      description: "Anti-diarrheal medication for acute diarrhea",
      category: "Gastrointestinal",
      dosage: "2mg capsules",
      manufacturer: "Adcock Ingram",
      requiresPrescription: false,
    },
  ];

  for (const med of medications) {
    await prisma.medication.upsert({
      where: { id: med.id },
      update: {},
      create: med,
    });
  }
  console.log(`✅ Created ${medications.length} medications`);

  // Create inventory records
  const inventoryData = [
    { dispensaryId: dispensary1.id, medicationId: "med_001", quantityInStock: 150, price: 12.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_002", quantityInStock: 500, price: 3.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_003", quantityInStock: 200, price: 5.49 },
    { dispensaryId: dispensary1.id, medicationId: "med_004", quantityInStock: 80, price: 15.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_005", quantityInStock: 120, price: 9.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_006", quantityInStock: 300, price: 4.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_007", quantityInStock: 45, price: 22.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_008", quantityInStock: 100, price: 11.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_009", quantityInStock: 400, price: 7.99 },
    { dispensaryId: dispensary1.id, medicationId: "med_010", quantityInStock: 250, price: 4.49 },

    { dispensaryId: dispensary2.id, medicationId: "med_001", quantityInStock: 0, price: 13.49 },
    { dispensaryId: dispensary2.id, medicationId: "med_002", quantityInStock: 350, price: 4.29 },
    { dispensaryId: dispensary2.id, medicationId: "med_003", quantityInStock: 0, price: 5.99 },
    { dispensaryId: dispensary2.id, medicationId: "med_004", quantityInStock: 60, price: 16.49 },
    { dispensaryId: dispensary2.id, medicationId: "med_005", quantityInStock: 200, price: 10.49 },
    { dispensaryId: dispensary2.id, medicationId: "med_006", quantityInStock: 150, price: 5.29 },
    { dispensaryId: dispensary2.id, medicationId: "med_007", quantityInStock: 30, price: 23.99 },
    { dispensaryId: dispensary2.id, medicationId: "med_008", quantityInStock: 5, price: 12.49 },
    { dispensaryId: dispensary2.id, medicationId: "med_009", quantityInStock: 200, price: 8.49 },
    { dispensaryId: dispensary2.id, medicationId: "med_010", quantityInStock: 180, price: 4.79 },

    { dispensaryId: dispensary3.id, medicationId: "med_001", quantityInStock: 250, price: 12.49 },
    { dispensaryId: dispensary3.id, medicationId: "med_002", quantityInStock: 800, price: 3.79 },
    { dispensaryId: dispensary3.id, medicationId: "med_003", quantityInStock: 400, price: 5.29 },
    { dispensaryId: dispensary3.id, medicationId: "med_004", quantityInStock: 150, price: 15.49 },
    { dispensaryId: dispensary3.id, medicationId: "med_005", quantityInStock: 300, price: 9.49 },
    { dispensaryId: dispensary3.id, medicationId: "med_006", quantityInStock: 500, price: 4.79 },
    { dispensaryId: dispensary3.id, medicationId: "med_007", quantityInStock: 60, price: 21.99 },
    { dispensaryId: dispensary3.id, medicationId: "med_008", quantityInStock: 0, price: 11.49 },
    { dispensaryId: dispensary3.id, medicationId: "med_009", quantityInStock: 600, price: 7.49 },
    { dispensaryId: dispensary3.id, medicationId: "med_010", quantityInStock: 350, price: 4.29 },
  ];

  for (const item of inventoryData) {
    await prisma.inventory.upsert({
      where: {
        dispensaryId_medicationId: {
          dispensaryId: item.dispensaryId,
          medicationId: item.medicationId,
        },
      },
      update: {},
      create: item,
    });
  }
  console.log(`✅ Created ${inventoryData.length} inventory records`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
