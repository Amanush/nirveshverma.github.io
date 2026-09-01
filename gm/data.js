const TOPIC_DB = {
  units: [
    {
      id: "u1",
      title: "Unit 1: Nature and Significance of Management",
      topics: [
        {
          id: "management-concept",
          term: "Management — Concept",
          mnemonic: null,
          bullets: [
            "Process of getting things done with the aim of achieving goals effectively and efficiently.",
            "Working with and through others to achieve organisational objectives, using limited resources efficiently.",
            "Core functions: Planning, Organising, Staffing, Directing, Controlling (mnemonic: POSDC).",
            "Effectiveness = doing the right task, finishing the given task (goal-focused).",
            "Efficiency = doing the task correctly with minimum cost/resources (input-output focused).",
            "Ideal management = effective + efficient simultaneously."
          ],
          links: ["effectiveness-vs-efficiency", "levels-of-management", "coordination"]
        },
        {
          id: "effectiveness-vs-efficiency",
          term: "Effectiveness vs Efficiency",
          mnemonic: null,
          bullets: [
            "Effectiveness: concerned with end result — achieving goals, right task.",
            "Efficiency: concerned with means — minimum resource/cost usage.",
            "Classic example: hitting production target via double shifts = effective but not efficient (higher cost)."
          ],
          links: ["management-concept"]
        },
        {
          id: "characteristics-of-management",
          term: "Characteristics / Features of Management",
          mnemonic: "G2IP MCD",
          bullets: [
            "Goal-oriented process — unites individual efforts toward common goals.",
            "All-pervasive — needed in every type of organisation (economic, social, political).",
            "Multidimensional — 3 dimensions: management of work, of people, of operations.",
            "Continuous process — planning, organising, staffing, directing, controlling run continuously.",
            "Dynamic function — must adapt to changing environment.",
            "Intangible force — cannot be seen, only felt through results (orderliness vs chaos).",
            "Group activity — ensures teamwork and coordination of individual effort."
          ],
          links: ["management-concept", "coordination"]
        },
        {
          id: "objectives-of-management",
          term: "Objectives of Management",
          mnemonic: null,
          bullets: [
            "Organisational/Economic: Survival, Profit, Growth.",
            "Social: creating benefit for society — eco-friendly production, employment to disadvantaged groups, basic amenities.",
            "Personal: employee needs — financial (salary/perks), social (recognition), higher-level (growth/development)."
          ],
          links: ["management-concept"]
        },
        {
          id: "importance-of-management",
          term: "Importance of Management",
          mnemonic: "DPS EG",
          bullets: [
            "Increases efficiency — reduces cost, increases productivity.",
            "Develops society — quality products, employment, new technology.",
            "Achieves group goals — common direction to individual effort.",
            "Creates a dynamic organisation — adapts to changing environment.",
            "Helps achieve personal objectives via motivation and leadership."
          ],
          links: ["management-concept", "objectives-of-management"]
        },
        {
          id: "levels-of-management",
          term: "Levels of Management",
          mnemonic: null,
          bullets: [
            "Top Level: CEO, COO, CFO, Chairman, President, VP — sets overall goals, coordinates departments, responsible for organisation's survival & society impact.",
            "Middle Level: divisional/departmental heads (Production/Marketing/Operations Manager) — interprets top policy, staffs department, assigns duties, motivates staff.",
            "Operational/Supervisory Level: Supervisors, Foremen — oversees workforce, passes down instructions, ensures quality & safety standards."
          ],
          links: ["management-concept"]
        },
        {
          id: "management-as-science",
          term: "Management as a Science",
          mnemonic: null,
          bullets: [
            "Management is a science, but NOT an exact science.",
            "Systematised body of knowledge — has own theories & principles developed over time. (Present)",
            "Principles based on observation & experimentation — but human-behaviour outcomes aren't fully predictable, so not exact. (Partly present)",
            "Universal validity — pure science principles are universal, but management principles must be modified per situation. (Not fully present)"
          ],
          links: ["management-as-art", "management-as-profession"]
        },
        {
          id: "management-as-art",
          term: "Management as an Art",
          mnemonic: null,
          bullets: [
            "Management fully qualifies as an art (all 3 features present).",
            "Existence of theoretical knowledge — extensive management literature exists.",
            "Personalised application — each manager applies knowledge in own unique style.",
            "Based on practice and creativity — skill improves with experience."
          ],
          links: ["management-as-science", "management-as-profession"]
        },
        {
          id: "management-as-profession",
          term: "Management as a Profession",
          mnemonic: "SWEEP",
          bullets: [
            "Management is a profession, but NOT a full-fledged one like law/medicine.",
            "Well-defined body of knowledge — present (systematic principles exist).",
            "Restricted entry — absent (anyone can be appointed manager, no mandatory qualification).",
            "Ethical code of conduct — absent (AIMA code exists but has no statutory/legal backing).",
            "Entry via professional association — absent (no compulsion to join any body, unlike Bar Council/Medical Council).",
            "Professional association — associations like AIMA exist but membership isn't compulsory.",
            "Service motive — only partially recognised (profit motive still dominant, though service to society increasingly acknowledged)."
          ],
          links: ["management-as-science", "management-as-art"]
        },
        {
          id: "coordination",
          term: "Coordination — Concept, Nature & Importance",
          mnemonic: "DU PCR I",
          bullets: [
            "Concept: process by which a manager synchronises activities of different departments toward a common goal.",
            "Not a separate function — it is the ESSENCE of management, running through all 5 functions (like thread in a garland).",
            "Nature: (i) integrates group efforts (ii) ensures unity of action (iii) continuous process (iv) pervasive — needed at all levels & departments (v) responsibility of all managers, all levels (vi) deliberate function.",
            "Needed because: growth in size, functional differentiation across departments, specialisation of staff — each creates coordination gaps.",
            "Cooperation without coordination → wasted effort. Coordination without cooperation → employee dissatisfaction."
          ],
          links: ["management-concept", "characteristics-of-management", "levels-of-management"]
        }
      ]
    }
  ]
};
