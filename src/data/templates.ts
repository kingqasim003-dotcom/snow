import { TemplateItem } from "../types";

export const STARTER_TEMPLATES: TemplateItem[] = [
  // Coding
  {
    id: "t1",
    title: "React TypeScript Hook",
    description: "Create a stateful custom React hook with strict typing.",
    category: "Coding",
    promptText: "Write a complete React custom hook in TypeScript named use[HookName] to manage [State/Feature]. Include full type safety, proper state initialization, return types, cleanup logic in useEffect, and an illustrative example component using the hook."
  },
  {
    id: "t2",
    title: "SQL Query Optimizer",
    description: "Improve SQL query execution speed and layout.",
    category: "Coding",
    promptText: "Optimize the following SQL query for PostgreSQL: [SQL Query]. Analyze potential index requirements, rewrite subqueries to joins, explain your logic, and provide the clean optimized query."
  },
  // Writing
  {
    id: "t3",
    title: "SEO Blog Post Writer",
    description: "Generate a detailed, outline-driven SEO blog post.",
    category: "Writing",
    promptText: "Write a high-quality, SEO-optimized blog post of 1200 words about [Topic]. Include heading tags (H1, H2, H3), key takeaways, a persuasive introduction, real-world examples, and a strong conclusion."
  },
  {
    id: "t4",
    title: "Creative Story Draft",
    description: "Draft a compelling short narrative with sensory detail.",
    category: "Writing",
    promptText: "Draft a compelling short story of around 1000 words set in [Setting]. Introduce a protagonist named [Name] who faces the conflict of [Conflict] and resolve it with a surprising twist ending. Focus on sensory details and rich pacing."
  },
  // Marketing
  {
    id: "t5",
    title: "Viral Twitter Thread",
    description: "Structure a high-retention 5-tweet thread.",
    category: "Marketing",
    promptText: "Compose a viral 5-tweet Twitter thread about [Topic/Launch]. The first tweet must contain an irresistible hook that drives curiosity. Each subsequent tweet must deliver standalone value with clean line breaks."
  },
  {
    id: "t6",
    title: "Cold Email Campaign",
    description: "Draft a high-conversion cold sales sequence.",
    category: "Marketing",
    promptText: "Write a cold outreach email aimed at [TargetAudience] pitching [Product/Service]. Include 3 engaging subject line variations, an empathetic opening recognizing their pain points, and a single, clear call-to-action."
  },
  // Business
  {
    id: "t7",
    title: "60s Elevator Pitch",
    description: "A punchy pitch outline targeting venture investors.",
    category: "Business",
    promptText: "Draft a 60-second elevator pitch for my startup [Company/Idea] targeting [Audience]. Follow the format: Problem, Solution, Market Size, Traction, Ask. Keep it punchy, jargon-free, and memorable."
  },
  {
    id: "t8",
    title: "SWOT Analysis Blueprint",
    description: "Structure SWOT insights in a comparative matrix.",
    category: "Business",
    promptText: "Conduct a comprehensive SWOT analysis for [Business/Product Name] in the [Industry] industry. Format the response in structured bullet points with clear strategic action points."
  },
  // Image Generation
  {
    id: "t9",
    title: "Photorealistic Landscape",
    description: "Prompt for cinematic scenery in Midjourney/Imagen.",
    category: "Image Generation",
    promptText: "A highly detailed prompt for an AI image generator of: A photorealistic majestic mountain range at sunrise, cinematic lighting, golden hour, mist rising from a crystal-clear lake in the foreground, shot on 8k DSLR, wide angle, hyper-detailed."
  },
  {
    id: "t10",
    title: "Cute 3D Character Mascot",
    description: "Style guide prompt for lovable 3D toys/avatars.",
    category: "Image Generation",
    promptText: "A high-quality 3D render of a cute, friendly [Animal/Subject] mascot character, soft clay-like tactile textures, isometric view, soft studio lighting, pastel color palette, on a clean neutral background, perfect for a mobile app icon."
  }
];
