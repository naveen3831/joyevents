import { API_URL } from "@/lib/config";

export const BLOG_POSTS = [
  {
    id: 1,
    title: "10 Tips for Planning the Perfect Corporate Event",
    excerpt:
      "From venue selection to catering and entertainment — here's everything you need to know to pull off a seamless corporate event that impresses clients and energizes your team.",
    category: "Corporate Events",
    author: "Sophia Mitchell",
    date: "February 28, 2026",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
    featured: true,
    content:
      "Planning a corporate event requires attention to detail across venue, catering, AV, guest experience, and post-event follow-up. Start with a clear objective, build a strong vendor team, and keep communication flowing with stakeholders throughout the process.",
  },
  {
    id: 2,
    title: "How to Choose the Right Venue for Your Wedding",
    excerpt:
      "The venue sets the tone for your entire wedding day. Discover how to evaluate capacity, ambience, catering options, and hidden costs before you sign the contract.",
    category: "Wedding Planning",
    author: "James Harrington",
    date: "February 20, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    featured: true,
    content:
      "Choosing a wedding venue is one of the most important decisions you'll make. Focus on logistics, atmosphere, vendor flexibility, and how the space supports your vision from ceremony to reception.",
  },
  {
    id: 3,
    title: "The Ultimate Guide to Event Photography",
    excerpt:
      "Great event photography preserves your memories for a lifetime. Learn what to look for in a photographer, how to brief them, and how to get the best shots on the day.",
    category: "Photography",
    author: "Aiden Clarke",
    date: "February 14, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1452802447250-470a88ac82bc?w=800&q=80",
    featured: false,
    content:
      "Event photography is about anticipating moments, managing light, and creating a shot list that captures the story. Communicate your key moments, outfit changes, and family dynamics clearly to your photographer.",
  },
  {
    id: 4,
    title: "Trending Decor Ideas for 2026 Events",
    excerpt:
      "From sustainable floral arrangements to immersive lighting experiences, discover the decor trends that are defining events this year and how to incorporate them on any budget.",
    category: "Decor",
    author: "Priya Nair",
    date: "February 7, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
    featured: false,
    content:
      "Decor trends in 2026 are leaning into sustainability, layered textures, and interactive installations. Choose elements that reflect your brand or theme and prioritize guest experience above all else.",
  },
  {
    id: 5,
    title: "Catering for Large Events: What Every Planner Should Know",
    excerpt:
      "Managing food and beverage for hundreds of guests is a logistical challenge. Here's how to coordinate with caterers, handle dietary needs, and ensure a smooth service.",
    category: "Catering",
    author: "Sophia Mitchell",
    date: "January 30, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
    featured: false,
    content:
      "Large-event catering success depends on clear menu planning, precise staffing, and robust backup plans. Work with caterers who know how to scale and keep communication open for dietary requests.",
  },
  {
    id: 6,
    title: "Brand Activations That Actually Work: Case Studies",
    excerpt:
      "Brand activations are more than a stunt — they're an opportunity to build lasting emotional connections. We break down 5 successful activations and the strategies behind them.",
    category: "Brand Activations",
    author: "Marcus Webb",
    date: "January 22, 2026",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    featured: false,
    content:
      "Effective brand activations combine storytelling, experience design, and measurable goals. Choose activations that fit your audience, create shareable moments, and drive clear business outcomes.",
  },
];

export const CATEGORIES = [
  "All",
  "Corporate Events",
  "Wedding Planning",
  "Photography",
  "Decor",
  "Catering",
  "Brand Activations",
];

export const categoryColors: Record<string, string> = {
  "Corporate Events": "bg-blue-500/20 text-blue-400",
  "Wedding Planning": "bg-pink-500/20 text-pink-400",
  "Photography": "bg-purple-500/20 text-purple-400",
  "Decor": "bg-green-500/20 text-green-400",
  "Catering": "bg-orange-500/20 text-orange-400",
  "Brand Activations": "bg-yellow-500/20 text-yellow-400",
};

export const imgSrc = (img: string) =>
  !img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`;
