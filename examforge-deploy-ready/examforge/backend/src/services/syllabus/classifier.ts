// Auto-detects subject + topic of a question from its text (English / Hindi / Hinglish keywords).
// Pure keyword scoring: fast, offline, deterministic, no API key needed.
export type SubjectKey = "reasoning" | "quant" | "english" | "ga" | "science" | "computer" | "hindi" | "physics" | "cs" | "electronics";
export const SUBJECT_NAMES: Record<SubjectKey, string> = {
  reasoning: "Reasoning", quant: "Maths / Quant", english: "English", ga: "General Awareness", science: "General Science",
  computer: "Computer Awareness", hindi: "Hindi", physics: "Physics", cs: "CS & IT (Technical)", electronics: "Electronics (Technical)",
};
type Rule = { topic: string; words: (string | RegExp)[] };
const R = (topic: string, ...words: (string | RegExp)[]): Rule => ({ topic, words });

const RULES: Record<SubjectKey, Rule[]> = {
  reasoning: [
    R("Coding-Decoding", "coding", "decoding", "coded as", "written as", "is coded", "code language", /in a certain code/i, /if .{1,25} is written as/i),
    R("Number / Alphabet Series", "series", "missing number", "next term", "wrong number", "odd number in the series", "letter series", "alphabet series", "next number"),
    R("Analogy", "analogy", "is related to", "in the same way as", "same relationship", /:\s*:\s*/, /\w+\s*:\s*\w+\s*::/),
    R("Classification / Odd One Out", "odd one out", "odd one", "does not belong", "different from the rest", "classification"),
    R("Blood Relations", "blood relation", "father of", "mother of", "brother of", "sister of", "uncle", "nephew", "niece", "paternal", "maternal", "son of", "daughter of", "grandfather", "grandson"),
    R("Direction Sense", "direction", "facing north", "facing south", "towards east", "towards west", "turns left", "turns right", "walks", "km north", "km south", "km east", "km west"),
    R("Syllogism", "syllogism", "conclusions", "all are", "some are", "no ", "statements:", "conclusion i", "conclusion ii", "follow"),
    R("Seating Arrangement", "seating", "sitting in a row", "sitting around", "circular table", "seated", "facing the centre", "row facing"),
    R("Ranking & Order", "rank from", "ranked", "position from the top", "position from the bottom", "tallest", "shortest", "heaviest", "order of height"),
    R("Calendar & Clock", "calendar", "day of the week", "leap year", "what day", "clock", "hour hand", "minute hand", "angle between the hands", "mirror image of the time"),
    R("Venn Diagram", "venn", "diagram best represents", "represent the relationship"),
    R("Figure Reasoning", "mirror image", "water image", "paper folding", "paper cut", "embedded figure", "figure completion", "pattern completion", "dice", "cube", "counting of figures", "triangles in the figure", "non-verbal"),
    R("Matrix / Puzzle", "puzzle", "matrix", "eight people", "five friends", "six persons", "seven persons", "each of them"),
    R("Statement & Assumption", "assumption", "course of action", "inference", "strong argument", "statement and"),
    R("Mathematical Operations", "interchange the signs", "interchanged", "mathematical operation", "if + means", "if × means", "if - means", "symbols"),
    R("Word / Alphabet Based", "dictionary", "meaningful word", "letters of the word", "alphabetical order", "arrange the words", "vowel", "positions in the english alphabet"),
    R("Logical / Venn Mix", "logical", "deduce", "valid", "argument"),
  ],
  quant: [
    R("Percentage", "percent", "percentage", "%", "प्रतिशत"),
    R("Profit & Loss", "profit", "loss", "cost price", "selling price", "marked price", "discount", "लाभ", "हानि", "mark up", "markup"),
    R("Ratio & Proportion", "ratio", "proportion", "अनुपात", "in the ratio"),
    R("Average", "average", "mean of", "औसत", "arithmetic mean"),
    R("Time & Work", "time and work", "work together", "can complete", "can do a work", "days to finish", "pipe", "cistern", "tank", "कार्य", "efficiency"),
    R("Time, Speed & Distance", "speed", "km/h", "kmph", "train", "stream", "boat", "upstream", "downstream", "relative speed", "m/s", "distance", "चाल"),
    R("Simple & Compound Interest", "simple interest", "compound interest", "rate of interest", "per annum", "principal", "ब्याज", "p.a."),
    R("Mixture & Alligation", "mixture", "alligation", "mixed", "litres of milk", "water in the"),
    R("Partnership", "partnership", "invested", "partners", "share of profit"),
    R("Ages", "ages", "years ago", "years hence", "present age", "age of", "आयु"),
    R("Number System", "number system", "divisible", "remainder", "factor", "prime", "unit digit", "digit sum", "multiple of", "संख्या", "divisibility"),
    R("HCF & LCM", "hcf", "lcm", "gcd", "l.c.m", "h.c.f", "ल.स.", "म.स."),
    R("Algebra", "algebra", "quadratic", "equation", "roots", "x + y", "x^2", "x²", "polynomial", "expression", "factorise", "simplify the expression", "if x"),
    R("Geometry", "triangle", "circle", "angle", "chord", "tangent", "polygon", "quadrilateral", "parallel lines", "circumcentre", "incentre", "centroid", "orthocentre", "त्रिभुज", "वृत्त"),
    R("Mensuration", "area of", "volume", "perimeter", "surface area", "cylinder", "cone", "sphere", "cuboid", "radius", "क्षेत्रफल", "आयतन", "trapezium", "rhombus"),
    R("Trigonometry", "sin", "cos", "tan", "cot", "sec", "cosec", "trigonometr", "height of the tower", "angle of elevation", "angle of depression"),
    R("Data Interpretation", "data interpretation", "the table", "the bar graph", "pie chart", "line graph", "following graph", "given table", "following table"),
    R("Simplification / BODMAS", "simplify", "bodmas", "evaluate", "value of", "÷", "of ", "approximately equal"),
    R("Surds & Indices", "surd", "indices", "square root", "cube root", "√", "root of", "power of"),
    R("Probability & P&C", "probability", "permutation", "combination", "arrangements", "ways can", "at random"),
    R("Statistics", "median", "mode", "standard deviation", "variance", "mean deviation"),
    R("Coordinate Geometry", "coordinates", "slope", "straight line", "x-axis", "y-axis", "origin"),
  ],
  english: [
    R("Synonyms", "synonym", "closest in meaning", "similar in meaning", "most similar"),
    R("Antonyms", "antonym", "opposite in meaning", "opposite of", "most opposite"),
    R("Idioms & Phrases", "idiom", "phrase", "meaning of the idiom", "proverb", "phrasal verb"),
    R("One Word Substitution", "one word", "one-word", "substitute", "single word for"),
    R("Error Spotting", "error", "spot the", "grammatically incorrect", "part of the sentence", "no error", "incorrect part"),
    R("Sentence Improvement", "improve the", "replace the underlined", "underlined part", "substitute the bold", "highlighted segment"),
    R("Fill in the Blanks", "fill in the blank", "fill in the blanks", "blank", "______", "__________"),
    R("Cloze Test", "cloze", "passage has", "numbered blank"),
    R("Reading Comprehension", "comprehension", "passage", "according to the passage", "author", "the passage"),
    R("Para Jumbles", "jumble", "rearrange", "arrange the sentences", "sequence of the sentences", "p, q, r, s", "pqrs"),
    R("Active / Passive Voice", "active voice", "passive voice", "change the voice", "in passive"),
    R("Direct / Indirect Speech", "direct speech", "indirect speech", "reported speech", "narration", "narrate"),
    R("Spelling", "spelling", "misspelt", "correctly spelt", "incorrectly spelt"),
    R("Vocabulary", "vocabulary", "meaning of the word", "the word means", "word that"),
    R("Articles / Prepositions", "article", "preposition", "the correct preposition", "determiner"),
    R("Tenses / Grammar", "tense", "subject-verb", "grammar", "verb", "adjective", "adverb", "conjunction"),
  ],
  hindi: [
    R("Hindi Vyakaran", "संधि", "समास", "उपसर्ग", "प्रत्यय", "कारक", "वचन", "लिंग", "विलोम", "पर्यायवाची", "मुहावरे", "लोकोक्ति", "शुद्ध वर्तनी", "अनेकार्थी", "तत्सम", "तद्भव", "रस", "अलंकार", "छंद", "वाक्यांश", "श्रुतिसम"),
  ],
  ga: [
    R("Indian History", "mughal", "british", "freedom struggle", "revolt of 1857", "gandhi", "maurya", "gupta", "harappan", "indus valley", "vedic", "ashoka", "akbar", "battle of", "congress session", "viceroy", "governor-general", "quit india", "non-cooperation", "इतिहास", "medieval", "ancient india", "sultanate", "chola", "vijayanagar", "maratha"),
    R("Polity & Constitution", "constitution", "article ", "fundamental rights", "directive principles", "preamble", "parliament", "lok sabha", "rajya sabha", "president of india", "supreme court", "amendment", "election commission", "panchayati", "schedule of the constitution", "संविधान", "अनुच्छेद", "governor"),
    R("Geography", "river", "mountain", "plateau", "monsoon", "soil", "national park", "latitude", "longitude", "delta", "peninsula", "himalaya", "desert", "lake", "strait", "continent", "equator", "भूगोल", "नदी", "biosphere reserve", "wildlife sanctuary", "ocean", "sea"),
    R("Economy", "gdp", "inflation", "rbi", "budget", "tax", "gst", "fiscal", "monetary", "bank", "five year plan", "niti aayog", "repo rate", "economy", "अर्थव्यवस्था", "sebi", "msp", "export", "import"),
    R("Static GK", "capital of", "currency of", "largest", "longest", "first woman", "first indian", "headquarter", "national animal", "national bird", "dance", "folk", "festival", "classical", "gi tag", "unesco", "tribe", "fair of", "temple", "dynasty built"),
    R("Current Affairs", "2024", "2025", "2026", "recently", "launched by", "appointed as", "inaugurated", "summit", "g20", "scheme launched", "yojana", "mission", "campaign", "chief minister", "union minister"),
    R("Awards, Books & Sports", "award", "prize", "author of", "book", "olympic", "world cup", "trophy", "grand slam", "padma", "bharat ratna", "nobel", "cricketer", "tournament", "cup", "stadium", "booker", "arjuna", "khel ratna", "dhyan chand"),
    R("Important Days & Organisations", "world day", "international day", "observed on", "united nations", "who ", "imf", "world bank", "wto", "organisation", "summit held", "headquartered"),
    R("Art & Culture", "art form", "folk dance", "classical dance", "musical instrument", "painting", "architecture", "temple architecture", "sculpture", "kathak", "bharatanatyam", "odissi", "madhubani"),
  ],
  science: [
    R("Physics (GS)", "force", "velocity", "acceleration", "newton", "momentum", "lens", "mirror", "refraction", "reflection", "current", "voltage", "resistance", "ohm", "magnet", "sound", "light", "wavelength", "pressure", "density", "energy", "work done", "power", "heat", "temperature", "thermal", "gravity", "friction", "unit of", "si unit", "nuclear", "fusion", "fission", "laser", "ammeter", "voltmeter", "transformer", "भौतिक"),
    R("Chemistry (GS)", "acid", "base", "salt", "ph ", "reaction", "element", "compound", "atom", "molecule", "periodic table", "valency", "alloy", "metal", "non-metal", "polymer", "carbon", "hydrocarbon", "oxidation", "reduction", "electrolysis", "isotope", "catalyst", "organic", "रसायन", "chemical formula", "bleaching", "cement"),
    R("Biology (GS)", "cell", "dna", "rna", "vitamin", "enzyme", "photosynthesis", "respiration", "blood", "heart", "disease", "bacteria", "virus", "plant", "hormone", "digestive", "kidney", "chromosome", "gene", "organ", "nutrition", "deficiency", "tissue", "protein", "जीव विज्ञान", "mitochondria", "ecosystem", "food chain"),
    R("Meteorology & Atmosphere", "atmosphere", "troposphere", "stratosphere", "cyclone", "anticyclone", "humidity", "barometer", "rainfall", "weather", "climate", "isobar", "front", "el nino", "la nina", "ozone", "greenhouse", "jet stream", "doppler radar", "monsoon onset", "imd", "meteorolog", "wind belt"),
  ],
  computer: [
    R("Computer Fundamentals", "computer", "cpu", "ram", "rom", "input device", "output device", "hardware", "software", "generation of computer", "motherboard", "bit", "byte", "kb ", "mb ", "gb "),
    R("MS Office", "ms word", "excel", "powerpoint", "spreadsheet", "shortcut key", "ctrl +", "ctrl+", "font", "cell reference", "formula bar", "worksheet", "slide"),
    R("Internet & Networking Basics", "internet", "browser", "email", "url", "www", "http", "ip address", "wifi", "modem", "router", "search engine", "protocol", "domain name", "cyber"),
    R("Operating System Basics", "windows", "linux", "operating system", "file extension", "folder", "desktop", "task manager"),
  ],
  physics: [
    R("Mechanics", "kinematics", "projectile", "torque", "moment of inertia", "angular momentum", "simple harmonic", "shm", "centripetal", "escape velocity", "kepler", "collision", "rigid body", "elastic"),
    R("Thermodynamics", "thermodynamic", "entropy", "carnot", "isothermal", "adiabatic", "specific heat", "latent heat", "kinetic theory", "ideal gas", "enthalpy", "first law"),
    R("Optics", "interference", "diffraction", "polarisation", "polarization", "young's double slit", "refractive index", "total internal reflection", "optical fibre", "lens maker", "resolving power"),
    R("Electromagnetism", "electric field", "gauss", "capacitor", "magnetic field", "biot", "ampere", "faraday", "lenz", "inductance", "maxwell", "electromagnetic induction", "dielectric", "poynting"),
    R("Modern Physics", "photoelectric", "de broglie", "bohr", "radioactive", "half-life", "nuclear binding", "x-ray", "compton", "semiconductor", "p-n junction", "schrodinger", "uncertainty principle", "quantum", "wave function", "relativity"),
    R("Waves & Oscillations", "standing wave", "beats", "doppler effect", "resonance", "damped", "wave equation", "superposition", "transverse wave", "longitudinal wave"),
    R("Mathematical Physics", "fourier", "laplace", "vector calculus", "divergence", "curl", "tensor", "eigenvalue", "matrix", "differential equation", "legendre", "bessel", "green's"),
    R("Statistical Mechanics", "boltzmann", "partition function", "fermi", "bose", "microstate", "maxwell-boltzmann", "statistical"),
  ],
  cs: [
    R("Data Structures", "stack", "queue", "linked list", "binary tree", "bst", "heap", "hash table", "graph traversal", "avl", "trie", "array", "priority queue", "deque"),
    R("Algorithms", "time complexity", "big o", "sorting", "quick sort", "merge sort", "dijkstra", "dynamic programming", "greedy", "binary search", "bfs", "dfs", "recurrence", "np-complete", "divide and conquer", "spanning tree"),
    R("DBMS & SQL", "dbms", "sql", "normalization", "normal form", "transaction", "acid", "primary key", "foreign key", "join", "relational", "er diagram", "index", "b+ tree", "select ", "functional dependency", "query"),
    R("Operating Systems", "process", "thread", "deadlock", "semaphore", "scheduling", "paging", "segmentation", "virtual memory", "mutex", "page replacement", "context switch", "kernel", "round robin", "fcfs", "thrashing"),
    R("Computer Networks", "osi", "tcp", "udp", "ip ", "subnet", "routing", "dns", "http", "ethernet", "mac address", "congestion", "firewall", "switch", "bandwidth", "icmp", "arp", "dhcp", "ipv4", "ipv6", "network layer", "transport layer"),
    R("Programming (C / C++ / Python / Java)", "pointer", "c++", "python", "java", "oop", "inheritance", "polymorphism", "recursion", "output of the following", "what will be the output", "int main", "#include", "class ", "function", "compile", "variable", "malloc", "constructor", "lambda"),
    R("Computer Organisation", "cache", "pipeline", "instruction set", "addressing mode", "alu", "microprogram", "memory hierarchy", "risc", "cisc", "dma", "interrupt", "bus", "register"),
    R("Theory of Computation & Compilers", "finite automata", "dfa", "nfa", "regular expression", "context free", "pushdown", "turing", "decidable", "lexical", "parser", "ll(1)", "lr", "compiler", "grammar"),
    R("Digital Logic", "boolean", "logic gate", "k-map", "flip-flop", "multiplexer", "decoder", "counter", "adder", "sequential circuit", "combinational", "nand", "nor", "latch"),
    R("Software Engineering & AI/ML", "sdlc", "agile", "uml", "software testing", "waterfall", "machine learning", "neural network", "artificial intelligence", "regression", "classification model", "deep learning", "overfitting", "gradient"),
    R("Discrete Maths", "propositional", "set theory", "relation", "lattice", "group theory", "graph theory", "pigeonhole", "recurrence relation", "predicate logic", "poset", "boolean algebra"),
  ],
  electronics: [
    R("Analog Electronics", "diode", "bjt", "mosfet", "transistor", "amplifier", "op-amp", "op amp", "oscillator", "rectifier", "biasing", "feedback", "jfet", "zener", "filter"),
    R("Digital Electronics", "flip-flop", "logic gate", "counter", "multiplexer", "k-map", "adc", "dac", "register", "sequential", "combinational", "boolean"),
    R("Signals & Systems", "fourier", "laplace", "z-transform", "convolution", "sampling", "nyquist", "lti", "impulse response", "transfer function", "dft", "fft"),
    R("Communication Systems", "modulation", "am ", "fm ", "pcm", "snr", "bandwidth", "antenna", "transmission line", "noise figure", "qam", "bpsk", "channel capacity", "shannon", "waveguide", "microwave", "radar"),
    R("Network Theory", "thevenin", "norton", "superposition theorem", "two-port", "resonance", "kvl", "kcl", "mesh", "nodal", "time constant", "maximum power transfer"),
    R("Microprocessors & Control", "8085", "8086", "microprocessor", "microcontroller", "8051", "arm", "pid", "control system", "bode", "nyquist plot", "root locus", "stability", "interfacing"),
    R("EM Theory", "maxwell", "poynting", "electromagnetic wave", "skin depth", "gauss law", "boundary condition", "reflection coefficient", "vswr", "smith chart"),
  ],
};

// Subjects compete using these weights (technical subjects need strong evidence to beat general ones).
const SUBJECT_BIAS: Partial<Record<SubjectKey, number>> = { science: 0.9, computer: 0.95, cs: 0.9, electronics: 0.9, physics: 0.9, ga: 0.85 };
const DEVANAGARI = /[\u0900-\u097F]/g;

export interface Detection { subject: SubjectKey; subjectName: string; topic: string; confidence: number }

function hits(text: string, rule: Rule): number {
  let n = 0;
  for (const w of rule.words) {
    if (typeof w === "string") { if (text.includes(w)) n += w.length >= 6 ? 1.4 : 1; }
    else if (w.test(text)) n += 1.6;
  }
  return n;
}

export function detect(rawText: string, hint?: { subject?: string | null; topic?: string | null }): Detection {
  const text = ` ${(rawText ?? "").toLowerCase()} `;
  const hintText = ` ${(hint?.subject ?? "").toLowerCase()} ${(hint?.topic ?? "").toLowerCase()} `;
  const devRatio = ((rawText ?? "").match(DEVANAGARI)?.length ?? 0) / Math.max(1, (rawText ?? "").length);
  const scores: { subject: SubjectKey; topic: string; score: number }[] = [];
  for (const subject of Object.keys(RULES) as SubjectKey[]) {
    let best = { topic: RULES[subject][0].topic, score: 0 };
    let total = 0;
    for (const rule of RULES[subject]) {
      // admin-provided hints (a Topic:/Subject: line) count triple
      const s = hits(text, rule) + hits(hintText, rule) * 3;
      total += s;
      if (s > best.score) best = { topic: rule.topic, score: s };
    }
    let score = (best.score * 1.0 + total * 0.15) * (SUBJECT_BIAS[subject] ?? 1);
    // Maths-looking expressions
    if (subject === "quant" && /\d\s*[+\-×÷*/^]\s*\d/.test(text)) score += 0.8;
    if (subject === "english" && /[a-z]{3,}/.test(text) && best.score === 0) score *= 0.5;
    if (subject === "hindi" && devRatio > 0.35) score += 1;
    scores.push({ subject, topic: best.topic, score });
  }
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0], second = scores[1];
  if (!top || top.score < 0.9) {
    const subject: SubjectKey = devRatio > 0.5 ? "ga" : "ga";
    return { subject, subjectName: SUBJECT_NAMES[subject], topic: "General", confidence: 0.15 };
  }
  const confidence = Math.max(0.2, Math.min(0.98, 0.45 + (top.score - (second?.score ?? 0)) / (top.score + 2) * 0.6 + Math.min(top.score, 6) * 0.03));
  return { subject: top.subject, subjectName: SUBJECT_NAMES[top.subject], topic: top.topic, confidence: +confidence.toFixed(2) };
}

/** Map any free-text subject/section name the admin typed to a canonical subject key. */
export function normalizeSubject(name?: string | null): SubjectKey | null {
  const n = (name ?? "").toLowerCase();
  if (!n.trim()) return null;
  if (/reason|intelligence|logic|mental ability|\bgi\b|\bgir\b/.test(n)) return "reasoning";
  if (/quant|math|numer|arith|aptitude|\bdi\b|data interp/.test(n)) return "quant";
  if (/english|verbal|grammar|comprehension/.test(n)) return "english";
  if (/hindi|हिंदी|हिन्दी/.test(n)) return "hindi";
  if (/computer|\bit\b|ms office/.test(n) && !/\bcs\b|science/.test(n)) return "computer";
  if (/\bcs\b|cs & it|cs and it|information tech|technical.*(cs|computer)/.test(n)) return "cs";
  if (/electronic|ece|e&t|telecom/.test(n)) return "electronics";
  if (/physic/.test(n)) return "physics";
  if (/general science|science|biology|chemistry/.test(n)) return "science";
  if (/awareness|\bgk\b|\bga\b|current|history|polity|geograph|econom|static|knowledge/.test(n)) return "ga";
  return null;
}
