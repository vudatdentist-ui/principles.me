export type BrainMode = "brain" | "graph" | "constellation" | "council";

export type Thinker = {
  id: string;
  name: string;
  tradition: string;
  lens: string;
  accent: string;
  quote: string;
  principles: Array<{ title: string; description: string }>;
  books: string[];
};

export type PrinciplesNode = {
  id: string;
  label: string;
  type: "thinker" | "principle" | "concept" | "question";
  thinkerId?: string;
  x: number;
  y: number;
  z: number;
  accent: string;
};

export type PrinciplesLink = {
  source: string;
  target: string;
  relation: "develops" | "contrasts" | "applies" | "asks";
};

export const THINKERS: Thinker[] = [
  {
    accent: "#a96cff",
    books: ["Principles", "The Changing World Order"],
    id: "dalio",
    lens: "Reality, incentives and radical transparency",
    name: "Ray Dalio",
    principles: [
      {
        description: "Face reality before designing a response.",
        title: "Radical truth",
      },
      {
        description: "Weight a view by evidence and track record.",
        title: "Believability",
      },
      {
        description: "Goals → problems → diagnosis → design → execution.",
        title: "Five-step process",
      },
    ],
    quote: "Pain + reflection = progress.",
    tradition: "Principles · Systems",
  },
  {
    accent: "#52d8ff",
    books: ["Poor Charlie's Almanack", "Seeking Wisdom"],
    id: "munger",
    lens: "Inversion, incentives and avoiding stupidity",
    name: "Charlie Munger",
    principles: [
      {
        description: "Ask what would make the desired outcome fail.",
        title: "Inversion",
      },
      {
        description: "Behavior follows rewards more reliably than slogans.",
        title: "Incentives",
      },
      {
        description: "Use multiple disciplines to reduce blind spots.",
        title: "Latticework",
      },
    ],
    quote: "Show me the incentive and I will show you the outcome.",
    tradition: "Incentives · Mental models",
  },
  {
    accent: "#ffc15f",
    books: ["Berkshire shareholder letters", "The Essays of Warren Buffett"],
    id: "buffett",
    lens: "Integrity, compounding and margin of safety",
    name: "Warren Buffett",
    principles: [
      {
        description: "Know the boundaries of what you understand.",
        title: "Circle of competence",
      },
      {
        description: "Leave room for error and uncertainty.",
        title: "Margin of safety",
      },
      {
        description: "Prefer durable compounding over short-term optics.",
        title: "Long-term thinking",
      },
    ],
    quote: "Price is what you pay. Value is what you get.",
    tradition: "Value · Long-term",
  },
  {
    accent: "#ff708d",
    books: ["Capital, Volume I", "The German Ideology"],
    id: "marx",
    lens: "Material conditions, class and institutions",
    name: "Karl Marx",
    principles: [
      {
        description: "Examine the economic structure beneath institutions.",
        title: "Material conditions",
      },
      {
        description: "Study how positions shape incentives and conflict.",
        title: "Class interests",
      },
      {
        description: "Look for tensions that can transform a system.",
        title: "Contradiction",
      },
    ],
    quote: "The point is to change it.",
    tradition: "Power · Political economy",
  },
  {
    accent: "#65efad",
    books: ["Selected writings", "Đường Kách Mệnh"],
    id: "hcm",
    lens: "Practice, organization and people-centered leadership",
    name: "Hồ Chí Minh",
    principles: [
      {
        description: "Test ideas through concrete action and results.",
        title: "Practice first",
      },
      {
        description:
          "Leadership depends on understanding and mobilizing people.",
        title: "People",
      },
      {
        description: "Study continuously and adapt to conditions.",
        title: "Learning",
      },
    ],
    quote: "Theory must be linked with practice.",
    tradition: "People · Practice",
  },
  {
    accent: "#8c9cff",
    books: ["Meditations", "Letters of Fronto"],
    id: "aurelius",
    lens: "Agency, judgment and duty under uncertainty",
    name: "Marcus Aurelius",
    principles: [
      {
        description: "Focus effort on what lies within your control.",
        title: "Agency",
      },
      {
        description: "Separate events from the judgments attached to them.",
        title: "Judgment",
      },
      {
        description: "Do the work required by your role and values.",
        title: "Duty",
      },
    ],
    quote: "You have power over your mind — not outside events.",
    tradition: "Stoicism · Self-mastery",
  },
];

const anchorPositions = [
  [-1.42, 0.58, 0.16],
  [-0.82, -0.4, 0.44],
  [0.08, 0.72, -0.2],
  [0.92, 0.18, 0.34],
  [1.42, -0.56, -0.18],
  [-0.12, -0.9, -0.35],
] as const;

export const PRINCIPLES_NODES: PrinciplesNode[] = THINKERS.flatMap(
  (thinker, index) => {
    const [x, y, z] = anchorPositions[index];
    return [
      {
        accent: thinker.accent,
        id: `thinker:${thinker.id}`,
        label: thinker.name,
        thinkerId: thinker.id,
        type: "thinker",
        x,
        y,
        z,
      },
      ...thinker.principles.map((principle, principleIndex) => ({
        accent: thinker.accent,
        id: `principle:${thinker.id}:${principleIndex}`,
        label: principle.title,
        thinkerId: thinker.id,
        type: "principle" as const,
        x: x * 0.7 + Math.cos(principleIndex * 2.1 + index) * 0.6,
        y: y * 0.7 + Math.sin(principleIndex * 1.8 + index) * 0.45,
        z: z * 0.7 + (principleIndex - 1) * 0.16,
      })),
    ];
  }
);

export const PRINCIPLES_LINKS: PrinciplesLink[] = THINKERS.flatMap(
  (thinker, thinkerIndex) => {
    const links: PrinciplesLink[] = thinker.principles.map(
      (_, principleIndex) => ({
        relation: "develops",
        source: `thinker:${thinker.id}`,
        target: `principle:${thinker.id}:${principleIndex}`,
      })
    );
    if (thinkerIndex < THINKERS.length - 1) {
      links.push({
        relation: thinkerIndex % 2 ? "contrasts" : "applies",
        source: `thinker:${thinker.id}`,
        target: `thinker:${THINKERS[thinkerIndex + 1].id}`,
      });
    }
    return links;
  }
);

export function thinkerById(id: string): Thinker {
  return THINKERS.find((thinker) => thinker.id === id) ?? THINKERS[0];
}
