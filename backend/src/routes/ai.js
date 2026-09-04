import express from "express";

const router = express.Router();

/**
 * Smart Topic-based Title Generator
 * Infers category / event nature and returns topic-specific titles.
 * NEVER returns hardcoded "Pro Event" or "Your Event" generic titles.
 */
const generateSmartTitleSuggestions = (topic = "", context = {}, excludeList = []) => {
  const cleanTopic = topic.trim();
  if (!cleanTopic) return [];

  const lowerTopic = cleanTopic.toLowerCase();
  const location = (context.location || "").split(",")[0].trim();
  const citySuffix = location ? ` ${location}` : "";
  const excludeSet = new Set((excludeList || []).map(t => t.toLowerCase()));

  const suggestions = [];

  const pushTitle = (title) => {
    if (title && !excludeSet.has(title.toLowerCase()) && !suggestions.includes(title)) {
      suggestions.push(title);
    }
  };

  // 1. Music & Concerts & Performances
  if (/music|concert|dj|singer|singing|band|rock|jazz|arijit|edm|orchestra|acoustic|sound|beat|fest/i.test(lowerTopic)) {
    if (/arijit|sing|artist|band|dj/i.test(lowerTopic)) {
      pushTitle(`${cleanTopic} Live in Concert 2026`);
      pushTitle(`An Evening with ${cleanTopic} - Live${citySuffix}`);
      pushTitle(`${cleanTopic} Musical Symphony Tour`);
      pushTitle(`${cleanTopic} Unplugged & Live Showcase`);
      pushTitle(`The ${cleanTopic} Experience`);
    } else {
      pushTitle(`${cleanTopic} Live 2026`);
      pushTitle(`Rhythm & Beats: ${cleanTopic}${citySuffix}`);
      pushTitle(`${cleanTopic} Under the Stars`);
      pushTitle(`The Soundwave ${cleanTopic} Festival`);
      pushTitle(`Sonic Vibe: ${cleanTopic} Night`);
    }
  }
  // 2. Kabaddi / Sports
  else if (/kabaddi|kabbadi|kabb/i.test(lowerTopic)) {
    pushTitle(`${cleanTopic} Premier League 2026`);
    pushTitle(`Ultimate ${cleanTopic} Championship`);
    pushTitle(`Battle of the Raiders: ${cleanTopic}${citySuffix}`);
    pushTitle(`${cleanTopic} Super League & Cup`);
    pushTitle(`Hyderabad ${cleanTopic} Showdown`);
    pushTitle(`${cleanTopic} Champions Trophy`);
  }
  // 3. Cricket
  else if (/cricket|cric|t20|ipl/i.test(lowerTopic)) {
    pushTitle(`Cricket Premier League 2026`);
    pushTitle(`Champions Cricket Cup${citySuffix}`);
    pushTitle(`Weekend Cricket Showdown`);
    pushTitle(`Battle of the Bats T20 Tournament`);
    pushTitle(`Super Sixes Cricket Challenge`);
  }
  // 4. Marathon & Running & Fitness
  else if (/marathon|running|run|fitness|zumba|aerobics/i.test(lowerTopic)) {
    pushTitle(`${cleanTopic} 2026`);
    pushTitle(`The Ultimate ${cleanTopic} Challenge`);
    pushTitle(`Sunrise ${cleanTopic}${citySuffix}`);
    pushTitle(`Run for a Cause: ${cleanTopic}`);
  }
  // 5. Birthday & Kids & Personal Parties
  else if (/birthday|kids|party|bash|anniversary|reunion|gala/i.test(lowerTopic)) {
    if (/kids/i.test(lowerTopic)) {
      pushTitle(`The Ultimate Kids Birthday Extravaganza`);
      pushTitle(`Magic & Fun Kids Birthday Bash 2026`);
      pushTitle(`Wonderland Kids Birthday Party`);
      pushTitle(`A Magical ${cleanTopic}`);
    } else {
      pushTitle(`A Magical Birthday Celebration`);
      pushTitle(`The Grand ${cleanTopic} Bash 2026`);
      pushTitle(`An Evening to Celebrate: ${cleanTopic}`);
      pushTitle(`The Ultimate ${cleanTopic} Experience`);
    }
  }
  // 6. Weddings & Marriage
  else if (/wedding|marriage|sangeet|reception|haldi|bridal|engagement/i.test(lowerTopic)) {
    pushTitle(`The Grand ${cleanTopic} Celebration 2026`);
    pushTitle(`A Celebration of Eternal Love`);
    pushTitle(`Royal ${cleanTopic} Fest & Gala`);
    pushTitle(`Together Forever: ${cleanTopic} Special`);
  }
  // 7. Food & Drinks & Culinary
  else if (/food|street food|carnival|flavour|taste|cooking|chef|eat|bake|fest/i.test(lowerTopic)) {
    pushTitle(`${cleanTopic} Carnival 2026${citySuffix}`);
    pushTitle(`Flavours & Bites: ${cleanTopic}`);
    pushTitle(`Street Food Fiesta & Live Kitchen`);
    pushTitle(`Taste of the City: ${cleanTopic} Expo`);
  }
  // 8. Tech & Startups & Business & Meetups
  else if (/startup|tech|code|ai|software|developer|hackathon|meetup|networking|conference|summit|business|expo|real estate|investor/i.test(lowerTopic)) {
    if (/startup|networking|meetup/i.test(lowerTopic)) {
      pushTitle(`${cleanTopic} Founders & Investors Meet`);
      pushTitle(`Entrepreneurs & Investors Pitch Night`);
      pushTitle(`NextGen Business & ${cleanTopic}`);
      pushTitle(`The Founders Circle: ${cleanTopic}`);
    } else {
      pushTitle(`FutureTech Summit 2026: ${cleanTopic}`);
      pushTitle(`Innovation & ${cleanTopic} Expo`);
      pushTitle(`NextGen ${cleanTopic} Conference`);
      pushTitle(`Digital Future & ${cleanTopic} Summit`);
    }
  }
  // 9. Workshops & Photography
  else if (/workshop|photography|photo|masterclass|course|bootcamp|learning|seminar|training/i.test(lowerTopic)) {
    pushTitle(`Mastering ${cleanTopic}: Hands-on Workshop`);
    pushTitle(`Creative ${cleanTopic} Masterclass 2026`);
    pushTitle(`The Professional ${cleanTopic} Bootcamp`);
    pushTitle(`Hands-on Learning: ${cleanTopic}`);
  }
  // 10. Yoga & Wellness
  else if (/yoga|wellness|meditation|health|mindfulness|retreat/i.test(lowerTopic)) {
    pushTitle(`${cleanTopic} & Mindful Wellness Retreat`);
    pushTitle(`Mind & Body ${cleanTopic} Festival 2026`);
    pushTitle(`Sunrise International ${cleanTopic} Experience`);
    pushTitle(`Wellness Through ${cleanTopic}`);
  }
  // 11. Cultural & Festivals
  else if (/ganesh|utsav|diwali|holi|navratri|festival|cultural|folk|heritage|mela/i.test(lowerTopic)) {
    pushTitle(`Grand ${cleanTopic} Utsav & Cultural Evening`);
    pushTitle(`${cleanTopic} Fest 2026`);
    pushTitle(`Maha ${cleanTopic} Celebration`);
    pushTitle(`Divine ${cleanTopic} & Cultural Showcase`);
  }
  // 12. Topic-specific Fallback (Uses exact user words, NEVER "Pro Event")
  else {
    pushTitle(`${cleanTopic} 2026`);
    pushTitle(`The Grand ${cleanTopic} Showcase`);
    pushTitle(`${cleanTopic}: Live Experience${citySuffix}`);
    pushTitle(`Official ${cleanTopic} Meet & Festival`);
    pushTitle(`Ultimate ${cleanTopic} Gathering`);
  }

  return suggestions.slice(0, 4);
};

/**
 * Smart Topic-based Description Generator
 * Writes clean, dynamic, non-templated descriptions specific to title & supplied context.
 * NEVER returns static templates like "Join us for Event, a premier event...".
 */
const generateSmartDescription = (title = "", currentDesc = "", tone = "standard", context = {}) => {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  const lower = cleanTitle.toLowerCase();
  const location = (context.location || "").trim();
  const locationText = location ? ` at ${location}` : "";
  const datesText = (context.startDate && context.endDate && context.startDate !== context.endDate)
    ? ` from ${context.startDate} to ${context.endDate}`
    : context.startDate ? ` on ${context.startDate}` : "";
  const timeText = (context.startTime && context.endTime) ? ` (${context.startTime} – ${context.endTime})` : "";
  const contextDetails = `${locationText}${datesText}${timeText}`;

  // 1. Tone = Improve Draft
  if (tone === "improve" && currentDesc && currentDesc.trim().length > 5) {
    const raw = currentDesc.trim();
    return `Enhanced Event Summary:\n${raw}\n\nThis event promises a well-organized and engaging experience for all attendees. Make sure to arrive early and carry your booking QR code for smooth entry.`;
  }

  // Domain NLU Classification
  // A. Sports & Tournaments (Kabaddi, Cricket, Football, Marathon, Tournament, etc.)
  if (/kabaddi|cricket|football|sports|match|championship|tournament|league|marathon|runner|athletics|badminton|tennis|volleyball/i.test(lower)) {
    if (tone === "formal") {
      return `Experience competitive sporting action at its finest during the "${cleanTitle}"${contextDetails}. The event brings together skilled players and teams for a series of high-energy matches, showcasing strategic play, athletic performance, and competitive spirit. Attendees can expect live stadium action and an organized sports atmosphere.`;
    }
    if (tone === "exciting") {
      return `Get ready for intense competition, electrifying moments, and nonstop sporting action at "${cleanTitle}"${contextDetails}! Witness top-tier teams and athletes battle for glory in an unforgettable, high-energy environment packed with excitement!`;
    }
    // Standard
    return `Get ready for an action-packed sporting event as teams and athletes compete in "${cleanTitle}"${contextDetails}. Experience intense gameplay, athletic skill, and energetic sports competition live from the venue. Join fellow sports enthusiasts for a thrilling celebration of teamwork, determination, and athletic excellence.`;
  }

  // B. Music & Concerts & Shows (Music, Concert, DJ, Singer, Arijit, Band, Live, Symphony, etc.)
  if (/music|concert|dj|singer|singing|band|rock|jazz|arijit|edm|orchestra|acoustic|sound|beat|live night|musical/i.test(lower)) {
    if (tone === "formal") {
      return `We invite you to an evening of musical performance at "${cleanTitle}"${contextDetails}. Featuring a curated lineup and high-quality acoustic production, this live concert offers an immersive stage experience for music lovers and enthusiasts.`;
    }
    if (tone === "exciting") {
      return `Feel the beat and experience an incredible night of live music at "${cleanTitle}"${contextDetails}! Get ready for extraordinary stage performances, vibrant energy, and a fantastic musical journey with fellow music fans!`;
    }
    // Standard
    return `Experience an unforgettable live music performance at "${cleanTitle}"${contextDetails}. Gather with friends and music lovers to enjoy captivating tunes, stage energy, and a vibrant atmosphere created especially for an engaging musical experience.`;
  }

  // C. Birthdays, Parties & Personal Celebrations
  if (/birthday|kids|party|bash|anniversary|reunion|gala|celebration/i.test(lower)) {
    if (tone === "formal") {
      return `Join us for "${cleanTitle}"${contextDetails}, a special occasion organized to celebrate milestone moments with family, friends, and guests in a warm and hospitable setting.`;
    }
    if (tone === "exciting") {
      return `Get ready for non-stop fun, music, games, and wonderful memories at "${cleanTitle}"${contextDetails}! Bring your friends and family together for a joyful party experience you won't forget!`;
    }
    // Standard
    return `Celebrate a special day filled with fun, laughter, and memorable moments at "${cleanTitle}"${contextDetails}. Bring family and friends together for a joyful gathering designed to create lasting memories.`;
  }

  // D. Weddings & Marriage
  if (/wedding|marriage|sangeet|reception|haldi|bridal|engagement/i.test(lower)) {
    if (tone === "formal") {
      return `You are cordially invited to celebrate the union of love and family at "${cleanTitle}"${contextDetails}. The occasion features traditional hospitality, elegant festivities, and a memorable celebration for honored guests.`;
    }
    if (tone === "exciting") {
      return `Join us for a grand celebration of love and happiness at "${cleanTitle}"${contextDetails}! Experience a joyful occasion filled with music, festive traditions, great food, and heartwarming memories!`;
    }
    // Standard
    return `Celebrate a beautiful journey of togetherness at "${cleanTitle}"${contextDetails}. Join family, friends, and loved ones for an occasion filled with tradition, warmth, and memorable moments.`;
  }

  // E. Tech, Startups, Conferences & Workshops
  if (/tech|startup|code|ai|software|developer|workshop|conference|summit|business|networking|masterclass|bootcamp/i.test(lower)) {
    if (tone === "formal") {
      return `The "${cleanTitle}"${contextDetails} brings together industry professionals, innovators, and thought leaders for strategic discussions, expert presentations, and structured networking. Participants will gain valuable insights into current industry developments and emerging practices.`;
    }
    if (tone === "exciting") {
      return `Explore groundbreaking ideas, innovative technology, and future trends at "${cleanTitle}"${contextDetails}! Connect with passionate professionals, industry leaders, and creators driving the future forward!`;
    }
    // Standard
    return `Explore new insights, practical knowledge, and industry innovations at "${cleanTitle}"${contextDetails}. Connect with professionals, participate in engaging sessions, and discover ideas shaping the industry.`;
  }

  // F. Food & Drinks
  if (/food|street food|carnival|flavour|taste|cooking|chef|eat|bake|fest/i.test(lower)) {
    if (tone === "formal") {
      return `Discover a curated culinary showcase at "${cleanTitle}"${contextDetails}. Featuring a diverse selection of regional and international specialties, the event offers guests a refined dining and tasting experience.`;
    }
    if (tone === "exciting") {
      return `Treat your taste buds to amazing flavors at "${cleanTitle}"${contextDetails}! Bring your appetite and enjoy delicious food stalls, vibrant culinary energy, and a fantastic feast with food lovers!`;
    }
    // Standard
    return `Explore a rich variety of delicious food and regional flavors at "${cleanTitle}"${contextDetails}. Bring your friends and family to enjoy great tastes and a lively food festival atmosphere.`;
  }

  // G. Yoga & Wellness
  if (/yoga|wellness|meditation|health|mindfulness|retreat/i.test(lower)) {
    if (tone === "formal") {
      return `Participate in a structured wellness session at "${cleanTitle}"${contextDetails}. Designed to promote physical health, mental balance, and holistic well-being under guided instruction.`;
    }
    if (tone === "exciting") {
      return `Recharge your mind and body at "${cleanTitle}"${contextDetails}! Join an uplifting wellness experience focused on vitality, positive energy, and holistic health!`;
    }
    // Standard
    return `Recharge your mind and body at "${cleanTitle}"${contextDetails}. Participate in guided sessions focused on health, balance, and holistic wellness in a peaceful atmosphere.`;
  }

  // H. Generic Topic-Specific Fallback (Paragraph style, NO templates)
  if (tone === "formal") {
    return `We look forward to hosting "${cleanTitle}"${contextDetails}. This event is structured to deliver an organized and meaningful experience for all participants and attendees.`;
  }
  if (tone === "exciting") {
    return `Get ready for an exciting experience at "${cleanTitle}"${contextDetails}! Join us for an engaging event filled with memorable moments and great energy!`;
  }
  return `Join us for "${cleanTitle}"${contextDetails}. Gather with fellow attendees for a well-organized and engaging experience designed to deliver memorable moments for everyone.`;
};

// ── Multi-Candidate Service AI Generator ─────────────────────────────────────
const generateMultiServiceSuggestions = (serviceName = "", category = "", currentDesc = "") => {
  const cleanName = serviceName.trim();
  if (!cleanName) return null;

  let effectiveName = cleanName;
  let vagueNote = null;

  // Detect if name is ambiguous like "Birthday", "Wedding", "Event", "Party"
  const lowerName = cleanName.toLowerCase();
  const ambiguousWords = ["birthday", "wedding", "event", "party", "anniversary", "celebration"];
  if (ambiguousWords.includes(lowerName)) {
    const cat = (category || "").trim();
    if (cat && cat.toLowerCase() !== "general") {
      effectiveName = `${cleanName} ${cat}`;
    }
    vagueNote = `Tip: Adding detail to Service Name (e.g. ${cleanName} Decoration, ${cleanName} Photography) gives even more tailored ideas.`;
  }

  const lower = effectiveName.toLowerCase();
  const catLower = (category || "").toLowerCase();

  let options = [];
  let highlightSets = [];

  // If merchant has an existing draft description, include an "Improved Draft" option
  const hasDraft = Boolean(currentDesc && currentDesc.trim().length > 5);

  // A. DECORATION / FLORAL / STYLING
  if (/decor|balloon|flower|stage|mandap|theme|backdrop|light|lighting|floral|prop/i.test(lower) || /decor/i.test(catLower)) {
    options = [
      {
        id: "desc-1",
        style: "✨ Recommended",
        text: hasDraft
          ? `${currentDesc.trim()}\n\nOur ${effectiveName} service turns your venue into a beautifully styled celebration space with custom backdrops and coordinated decorative elements.`
          : `Turn your celebration into a beautifully styled occasion with thoughtfully arranged décor that brings your chosen theme to life. From celebration backdrops to coordinated decorative accents, create a setting that feels special, welcoming, and picture-ready.`
      },
      {
        id: "desc-2",
        style: "🎉 Fun & Catchy",
        text: `Make the celebration pop with colourful, creative décor designed to bring energy and excitement to the party! Create a lively atmosphere that guests will love and a setting made for memorable photos.`
      },
      {
        id: "desc-3",
        style: "💼 Professional",
        text: `Creative ${effectiveName} tailored to the style, scale, and theme of your event. Providing organized setup, quality decorative elements, and clean execution to transform your venue.`
      },
      {
        id: "desc-4",
        style: "❤️ Warm & Personal",
        text: `Every celebration deserves a setting as special as the occasion itself. Create a warm, welcoming atmosphere with carefully planned decorations that transform your celebration space into a memorable backdrop for family and friends.`
      }
    ];

    highlightSets = [
      {
        id: "hl-1",
        title: "Celebration Focus",
        items: ["Theme-based Decoration", "Celebration Backdrop", "Coordinated Décor", "Photo-ready Setup"]
      },
      {
        id: "hl-2",
        title: "Creative Focus",
        items: ["Creative Styling", "Personalized Theme", "Decorative Backdrop", "Venue Setup"]
      },
      {
        id: "hl-3",
        title: "Simple & Professional",
        items: ["Theme Styling", "Venue Decoration", "Backdrop Setup", "Event Décor"]
      }
    ];
  }
  // B. PHOTOGRAPHY / VIDEOGRAPHY
  else if (/photo|camera|portrait|candid|shoot|video|film|cinemat|album|pre-wedding/i.test(lower) || /photo/i.test(catLower)) {
    options = [
      {
        id: "desc-1",
        style: "✨ Recommended",
        text: hasDraft
          ? `${currentDesc.trim()}\n\nOur ${effectiveName} service captures key moments, genuine emotions, and portraits with professional clarity and color grading.`
          : `Capture the most meaningful moments of your celebration with professional photography tailored to your event. From candid emotions and group portraits to key ceremonies, create a beautiful visual story you can cherish for years.`
      },
      {
        id: "desc-2",
        style: "🎉 Fun & Catchy",
        text: `Relive every smile, dance move, and spontaneous celebration! High-energy photography that captures the true vibe and excitement of your party with crisp, vibrant images.`
      },
      {
        id: "desc-3",
        style: "💼 Professional",
        text: `Comprehensive ${effectiveName} coverage focusing on key highlights, formal portraits, and ceremony details delivered with professional image editing and digital delivery.`
      },
      {
        id: "desc-4",
        style: "❤️ Warm & Personal",
        text: `Preserve the genuine feelings, laughter, and togetherness of your special day. Dedicated event photography that tells your unique story through authentic, heartfelt pictures.`
      }
    ];

    highlightSets = [
      {
        id: "hl-1",
        title: "Coverage Focus",
        items: ["Candid Photography", "Couple & Group Portraits", "Ceremony Highlights", "Professional Editing"]
      },
      {
        id: "hl-2",
        title: "Creative Style",
        items: ["Storyteller Shots", "Artistic Angles", "Event Highlights", "Color-Graded Photos"]
      },
      {
        id: "hl-3",
        title: "Simple & Essential",
        items: ["Full Event Coverage", "Portrait Session", "Key Moments Captured", "Digital Delivery"]
      }
    ];
  }
  // C. CATERING / FOOD
  else if (/cater|food|buffet|menu|chef|dining|cuisine|beverage|snack/i.test(lower) || /cater/i.test(catLower)) {
    options = [
      {
        id: "desc-1",
        style: "✨ Recommended",
        text: `Make your event memorable with a catering service focused on quality cuisine, appealing food presentation, and a smooth dining experience for your guests. Suitable for celebrations, corporate gatherings, and special occasions.`
      },
      {
        id: "desc-2",
        style: "🎉 Fun & Catchy",
        text: `Treat your guests to a delicious feast filled with rich flavors, vibrant food stalls, and popular menu choices that keep everyone satisfied!`
      },
      {
        id: "desc-3",
        style: "💼 Professional",
        text: `Structured ${effectiveName} solutions offering hygienic food preparation, organized buffet setup, and customized menu options tailored for formal events and celebrations.`
      },
      {
        id: "desc-4",
        style: "❤️ Warm & Personal",
        text: `Bring people together over great food and warm hospitality. Thoughtfully prepared menus designed to delight your guests and complement your event's atmosphere.`
      }
    ];

    highlightSets = [
      {
        id: "hl-1",
        title: "Menu Focus",
        items: ["Curated Menu Options", "Fresh Ingredients", "Buffet Setup", "Food Presentation"]
      },
      {
        id: "hl-2",
        title: "Guest Experience",
        items: ["Diverse Cuisines", "Hygiene Standards", "Attentive Service", "Custom Selection"]
      },
      {
        id: "hl-3",
        title: "Simple & Professional",
        items: ["Event Catering", "Menu Planning", "Food Presentation", "Guest Dining"]
      }
    ];
  }
  // D. DJ / MUSIC / ENTERTAINMENT
  else if (/dj|music|sound|band|singer|live music|party music|speaker|audio/i.test(lower) || /dj|music/i.test(catLower)) {
    options = [
      {
        id: "desc-1",
        style: "✨ Recommended",
        text: `Bring energy and atmosphere to your celebration with a professional DJ experience tailored to your crowd and event theme. Keep guests engaged with smooth music transitions and quality sound.`
      },
      {
        id: "desc-2",
        style: "🎉 Fun & Catchy",
        text: `Turn up the volume and get the dance floor moving! Dynamic DJ performance with high-energy party tracks, light-synced beats, and non-stop entertainment.`
      },
      {
        id: "desc-3",
        style: "💼 Professional",
        text: `Structured event sound and DJ services providing appropriate background music, announcements, and main entertainment tailored for weddings, corporate galas, and parties.`
      },
      {
        id: "desc-4",
        style: "❤️ Warm & Personal",
        text: `Create the perfect soundtrack for your celebration with personalized playlists designed to suit every ceremony, speech, and party moment.`
      }
    ];

    highlightSets = [
      {
        id: "hl-1",
        title: "Party Focus",
        items: ["Curated Playlists", "Dance Floor Hits", "Interactive DJ", "High-Energy Music"]
      },
      {
        id: "hl-2",
        title: "Technical Focus",
        items: ["Quality Sound Output", "Microphone Support", "Smooth Transitions", "Genre Versatility"]
      },
      {
        id: "hl-3",
        title: "Simple & Essential",
        items: ["Event DJ Performance", "Custom Playlist", "Sound Management", "Party Entertainment"]
      }
    ];
  }
  // E. GENERAL / DEFAULT FALLBACK
  else {
    options = [
      {
        id: "desc-1",
        style: "✨ Recommended",
        text: `Plan and execute your occasion with confidence using professional ${effectiveName} support tailored to your schedule, venue requirements, and guest expectations.`
      },
      {
        id: "desc-2",
        style: "🎉 Fun & Catchy",
        text: `Take your celebration to the next level with creative ${effectiveName} that impresses your guests from start to finish!`
      },
      {
        id: "desc-3",
        style: "💼 Professional",
        text: `Structured ${effectiveName} providing clear schedule management, vendor alignment, and on-site oversight for seamless execution.`
      },
      {
        id: "desc-4",
        style: "❤️ Warm & Personal",
        text: `Host a memorable celebration where every detail is taken care of, allowing you and your guests to enjoy every moment together.`
      }
    ];

    highlightSets = [
      {
        id: "hl-1",
        title: "Execution Focus",
        items: ["Event Coordination", "On-site Oversight", "Schedule Management", "Guest Assistance"]
      },
      {
        id: "hl-2",
        title: "Planning Focus",
        items: ["Custom Planning", "Detail-Oriented Setup", "Venue Coordination", "Vendor Alignment"]
      },
      {
        id: "hl-3",
        title: "Simple & Professional",
        items: ["Professional Execution", "Organized Setup", "Event Management", "Seamless Flow"]
      }
    ];
  }

  return { descriptions: options, highlightSets, vagueNote };
};

// Route handler logic shared between /suggest-event-content and /service-content
const handleAIRequest = async (req, res) => {
  try {
    const {
      type, mode, topic, title, serviceName, category,
      currentDescription, tone, location, eventType,
      startDate, endDate, startTime, endTime, excludeList
    } = req.body || {};

    const requestType = type || mode;
    const targetTopic = (serviceName || title || topic || "").trim();

    if (!targetTopic && (requestType === "title" || requestType === "description" || requestType === "service_description" || requestType === "service_highlights" || requestType === "service_content")) {
      return res.status(400).json({ error: "Service Name or topic is required to generate AI content." });
    }

    // Check if Gemini API key exists for real LLM multi-candidate generation
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        if (requestType === "service_content" || requestType === "service_description" || requestType === "service_highlights") {
          const prompt = `You are an expert event marketplace copywriter. Generate 4 genuinely different description options and 3 highlight sets for a service.

Input Facts:
- Service Name: "${targetTopic}"
- Category: "${category || 'General'}"
${currentDescription ? `- Merchant Draft Description: "${currentDescription}"` : ''}

RULES FOR DESCRIPTIONS:
- Generate EXACTLY 4 description candidates in ONE JSON response.
- Each description MUST use a distinctly different writing style:
  1. "✨ Recommended" (Balanced, engaging, polished)
  2. "🎉 Fun & Catchy" (Vibrant, high-energy, attractive)
  3. "💼 Professional" (Clear, formal, business-focused)
  4. "❤️ Warm & Personal" (Inviting, emotional, guest-centric)
- Do NOT use generic template phrases like "Enhance your event experience with professional..." or "We provide high-quality...".
- Do NOT invent unsupplied business claims (e.g. do not invent "free album", "drone photography", "24/7 support", "same-day delivery", "100% guarantee", "free setup").
- Length for each description: 50–90 words.

RULES FOR HIGHLIGHT SETS:
- Generate 3 distinct sets of 4 short highlights (2-4 words per highlight item).
- Set 1 title: "Celebration Focus"
- Set 2 title: "Creative Focus"
- Set 3 title: "Simple & Professional"
- Do NOT invent unsupplied promises like "Free Delivery", "24/7 Support".

Return ONLY raw valid JSON (no markdown headers, no explanations):
{
  "descriptions": [
    { "id": "desc-1", "style": "✨ Recommended", "text": "..." },
    { "id": "desc-2", "style": "🎉 Fun & Catchy", "text": "..." },
    { "id": "desc-3", "style": "💼 Professional", "text": "..." },
    { "id": "desc-4", "style": "❤️ Warm & Personal", "text": "..." }
  ],
  "highlightSets": [
    { "id": "hl-1", "title": "Celebration Focus", "items": ["Item 1", "Item 2", "Item 3", "Item 4"] },
    { "id": "hl-2", "title": "Creative Focus", "items": ["Item 1", "Item 2", "Item 3", "Item 4"] },
    { "id": "hl-3", "title": "Simple & Professional", "items": ["Item 1", "Item 2", "Item 3", "Item 4"] }
  ]
}`;

          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const cleanText = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleanText);
          if (parsed && Array.isArray(parsed.descriptions) && parsed.descriptions.length > 0) {
            return res.json(parsed);
          }
        }
      } catch (geminiError) {
        console.warn("[AI Endpoint] Gemini API call failed, using dynamic NLU generator:", geminiError.message);
      }
    }

    // Dynamic smart generator fallback
    if (requestType === "service_content" || requestType === "service_description" || requestType === "service_highlights") {
      const suggestions = generateMultiServiceSuggestions(targetTopic, category, currentDescription);
      if (suggestions) {
        return res.json(suggestions);
      }
      return res.status(400).json({ error: "We couldn't generate suggestions right now. Try again or continue manually." });
    } else if (requestType === "title") {
      const titles = generateSmartTitleSuggestions(targetTopic, { location, category, eventType }, excludeList);
      if (titles.length > 0) return res.json({ titles });
      return res.status(400).json({ error: "Could not generate title suggestions" });
    } else if (requestType === "description") {
      const description = generateSmartDescription(targetTopic, currentDescription, tone, { location, category, startDate, endDate, startTime, endTime });
      if (description) return res.json({ description });
      return res.status(400).json({ error: "Could not generate description right now. Try again or continue manually." });
    } else if (requestType === "category_tags") {
      const result = generateSmartCategoryAndTags(targetTopic, currentDescription);
      return res.json(result);
    } else {
      return res.status(400).json({ error: "Invalid AI suggestion type" });
    }
  } catch (error) {
    console.error("AI Suggestion error:", error);
    res.status(500).json({ error: "We couldn't generate suggestions right now. Try again or continue manually." });
  }
};

// Endpoints
router.post("/suggest-event-content", handleAIRequest);
router.post("/service-content", handleAIRequest);

export default router;


