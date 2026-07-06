import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Service from "../src/models/Service.js";
import Event from "../src/models/Event.js";

dotenv.config();

const DEFAULT_SERVICES = [
  {
    name: "Venue Suggestions",
    price: 500,
    category: "Venue",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    description: "We handpick stunning venues tailored to your event size, theme, and budget — from grand ballrooms and rooftop terraces to intimate garden settings and heritage halls. Our curated network ensures you always find the perfect space.",
    highlights: ["200+ verified venues", "Budget-fit options", "Virtual site tours"],
    active: true,
  },
  {
    name: "Decor",
    price: 800,
    category: "Decor",
    image: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80",
    description: "Transform any space with our expert decoration team. From bespoke floral arrangements and themed installations to ambient lighting design and table styling, we bring your vision to life with precision and elegance.",
    highlights: ["Custom theme design", "Floral & lighting", "Setup & teardown"],
    active: true,
  },
  {
    name: "Catering",
    price: 1200,
    category: "Food & Beverage",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
    description: "Delight your guests with curated menus crafted by experienced chefs. We offer buffets, plated dinners, live cooking stations, cocktail receptions, and dietary-sensitive options for every type of event and crowd.",
    highlights: ["Custom menu design", "Dietary accommodations", "Live food stations"],
    active: true,
  },
  {
    name: "Photography",
    price: 900,
    category: "Media",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80",
    description: "Capture every precious moment with our professional photographers and videographers who specialize in event storytelling. From candid shots to cinematic highlight reels, your memories are safe with us.",
    highlights: ["HD photo & video", "Same-day previews", "Edited gallery delivery"],
    active: true,
  },
  {
    name: "Bespoke Planning",
    price: 2000,
    category: "Planning",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    description: "Fully custom end-to-end event planning tailored exclusively to you. Unique themes, premium vendor coordination, detailed timeline management, and white-glove service from first consultation through to the final guest farewell.",
    highlights: ["Dedicated event manager", "Full vendor coordination", "White-glove service"],
    active: true,
  },
  {
    name: "Corporate Events",
    price: 1500,
    category: "Corporate",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    description: "Conferences, product launches, networking evenings, and award ceremonies managed with a high-production standard. We handle AV, signage, delegate management, and post-event reporting so you can focus on your message.",
    highlights: ["AV & production", "Delegate management", "Brand-aligned execution"],
    active: true,
  },
  {
    name: "Wedding Planning",
    price: 2500,
    category: "Wedding",
    image: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80",
    description: "Elegant celebrations with refined decor, full hospitality coordination, and seamless guest flow. From the ceremony to the reception dance floor, we manage every detail of your most important day.",
    highlights: ["Full-day coordination", "Vendor sourcing", "Guest experience design"],
    active: true,
  },
  {
    name: "Brand Activations",
    price: 1800,
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    description: "Immersive event experiences that make your campaigns feel physical, memorable, and shareable. We design activations that connect audiences to your brand story and generate organic engagement.",
    highlights: ["Immersive experiences", "Social media-ready", "Campaign alignment"],
    active: true,
  },
  {
    name: "Music & Entertainment",
    price: 1000,
    category: "Entertainment",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    description: "Book top-tier DJs, live bands, solo artists, and entertainment acts to keep your guests engaged all night. From background music to high-energy performances, we set the perfect mood.",
    highlights: ["Live bands & DJs", "Sound equipment", "Custom playlists"],
    active: true,
  },
  {
    name: "Event Styling",
    price: 700,
    category: "Decor",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
    description: "Elevate your event aesthetics with professional styling services. Table settings, centerpieces, color coordination, and thematic elements that create Instagram-worthy moments throughout your venue.",
    highlights: ["Table styling", "Color consultation", "Thematic props"],
    active: true,
  },
  {
    name: "Transportation",
    price: 600,
    category: "Logistics",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    description: "Luxury transportation for VIP guests, shuttle services for large groups, or vintage cars for weddings. We coordinate reliable transport solutions to ensure everyone arrives safely and in style.",
    highlights: ["Luxury vehicles", "Group shuttles", "Professional drivers"],
    active: true,
  },
  {
    name: "Security Services",
    price: 400,
    category: "Safety",
    image: "https://images.unsplash.com/photo-1555431189-0fabf2667795?w=800&q=80",
    description: "Professional security personnel for crowd management, VIP protection, and event safety. Trained staff to handle access control and emergency protocols for peace of mind.",
    highlights: ["Trained personnel", "Access control", "Emergency response"],
    active: true,
  },
  {
    name: "Kids' Zone",
    price: 550,
    category: "Family",
    image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80",
    description: "Keep young guests entertained with supervised activity zones featuring games, crafts, face painting, and age-appropriate entertainment. Perfect for family events and weddings.",
    highlights: ["Supervised activities", "Games & crafts", "Safe environment"],
    active: true,
  },
  {
    name: "Floral Design",
    price: 850,
    category: "Decor",
    image: "https://images.unsplash.com/photo-1563241527-3004b7be0ee0?w=800&q=80",
    description: "Stunning floral arrangements from bouquets to centerpieces, arches, and hanging installations. Fresh flowers selected daily to match your event's color palette and theme.",
    highlights: ["Fresh flowers daily", "Custom arrangements", "Installation services"],
    active: true,
  },
  {
    name: "Lighting Design",
    price: 950,
    category: "Technical",
    image: "https://images.unsplash.com/photo-1533174072545-7f4b6f9613b9?w=800&q=80",
    description: "Professional lighting solutions including uplighting, spotlights, fairy lights, LED walls, and intelligent moving heads. Transform any space with dramatic or ambient lighting effects.",
    highlights: ["Ambient & dramatic", "LED technology", "Custom programming"],
    active: true,
  },
  {
    name: "Invitations & Stationery",
    price: 300,
    category: "Design",
    image: "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&q=80",
    description: "Custom-designed invitations, save-the-dates, programs, menus, place cards, and thank-you notes. Digital or printed options with elegant designs that set the tone for your event.",
    highlights: ["Custom designs", "Print & digital", "Full stationery suite"],
    active: true,
  },
  {
    name: "Cake & Desserts",
    price: 450,
    category: "Food & Beverage",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
    description: "Custom-designed cakes, dessert tables, macaron towers, chocolate fountains, and sweet treats. Beautiful desserts that taste as amazing as they look.",
    highlights: ["Custom cake design", "Dessert tables", "Dietary options available"],
    active: true,
  },
  {
    name: "Bar & Mixology",
    price: 1100,
    category: "Food & Beverage",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
    description: "Professional bartenders crafting signature cocktails and mocktails. Full bar setup with premium spirits, wines, and beers. Themed drink menus to match your event style.",
    highlights: ["Signature cocktails", "Expert bartenders", "Premium selection"],
    active: true,
  },
];

const DEFAULT_EVENTS = [
  {
    title: "International Music Festival 2026",
    description: "Experience three days of incredible live music featuring top artists from around the world. Multiple stages, diverse genres, and unforgettable performances.",
    datetime: new Date("2026-06-15T18:00:00"),
    location: "Central Park, New York",
    price: 2500,
    category: "Music",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1459749411177-287ce38e8b5f?w=800&q=80"
  },
  {
    title: "Tech Innovation Summit 2026",
    description: "Join industry leaders, innovators, and entrepreneurs for a day of inspiring keynotes, panel discussions, and networking opportunities.",
    datetime: new Date("2026-05-20T09:00:00"),
    location: "Convention Center, San Francisco",
    price: 1800,
    category: "Conference",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"
  },
  {
    title: "Royal Wedding Exhibition",
    description: "Discover the latest trends in wedding planning with exclusive showcases from top designers, planners, and vendors. Perfect for engaged couples.",
    datetime: new Date("2026-04-10T11:00:00"),
    location: "Grand Hotel, Mumbai",
    price: 500,
    category: "Wedding",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"
  },
  {
    title: "Food & Wine Festival",
    description: "A culinary extravaganza featuring renowned chefs, wine tastings, cooking demonstrations, and gourmet food from around the world.",
    datetime: new Date("2026-07-05T12:00:00"),
    location: "Waterfront District, Sydney",
    price: 1200,
    category: "Food",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80"
  },
  {
    title: "Digital Marketing Masterclass",
    description: "Learn advanced digital marketing strategies from experts. Topics include SEO, social media marketing, content strategy, and analytics.",
    datetime: new Date("2026-05-15T10:00:00"),
    location: "Business Hub, London",
    price: 950,
    category: "Workshop",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80"
  },
  {
    title: "Summer Beach Party 2026",
    description: "The ultimate summer kickoff party with DJ performances, beach games, bonfire, and amazing sunset views. Dress code: Summer Chic.",
    datetime: new Date("2026-06-21T16:00:00"),
    location: "Miami Beach, Florida",
    price: 800,
    category: "Party",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1533174072545-7f4b6f9613b9?w=800&q=80"
  },
  {
    title: "Art & Culture Fair",
    description: "Celebrate creativity with local and international artists. Features art exhibitions, live performances, workshops, and cultural displays.",
    datetime: new Date("2026-08-12T10:00:00"),
    location: "Arts District, Los Angeles",
    price: 600,
    category: "General",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80"
  },
  {
    title: "Startup Pitch Competition",
    description: "Watch innovative startups pitch their ideas to top investors. Great opportunity for networking and discovering next big things.",
    datetime: new Date("2026-05-28T14:00:00"),
    location: "Innovation Center, Bangalore",
    price: 400,
    category: "Conference",
    status: "upcoming",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80"
  },
];

async function run() {
  await connectDB();

  // ── Seed admin user ──────────────────────────────────────────────────────
  const email    = process.env.ADMIN_EMAIL    || "admin@gmail.com";
  const name     = process.env.ADMIN_NAME     || "Admin";
  const password = process.env.ADMIN_PASSWORD || "admin@123";

  const existing = await User.findOne({ email });
  if (existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    existing.name         = name;
    existing.passwordHash = passwordHash;
    existing.role         = "admin";
    await existing.save();
    console.log("Admin user updated:", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash, role: "admin" });
    console.log("Admin user created:", email);
  }

  // ── Seed default services (force refresh) ───────────────────────────────
  await Service.deleteMany({});
  await Service.insertMany(DEFAULT_SERVICES);
  console.log(`Seeded ${DEFAULT_SERVICES.length} default services.`);

  // ── Seed default events (force refresh) ───────────────────────────────
  await Event.deleteMany({});
  await Event.insertMany(DEFAULT_EVENTS);
  console.log(`Seeded ${DEFAULT_EVENTS.length} default events.`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Seed error:", err?.message || err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
