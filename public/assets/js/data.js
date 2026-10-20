/*
 * Hardly Human (AI Club, IIT Dharwad) - site content.
 *
 * This is the single source of truth for everything shown on the site.
 * Edit it by hand, or use admin.html and click "Export data.js" to download
 * an updated copy, then replace this file with it.
 *
 * All names, images and numbers below are PLACEHOLDERS - swap them for real ones.
 */
window.DEFAULT_SITE_DATA = {
  settings: {
    clubName: "Hardly Human",
    institute: "IIT Dharwad",
    tagline: "The AI club of IIT Dharwad. We build machines that are hardly human - yet.",
    about:
      "Hardly Human is the AI club of IIT Dharwad - a student-run community of learners, builders and researchers exploring machine learning, deep learning, computer vision, NLP, robotics and the ethics of AI. We run workshops, hackathons, reading groups and long-term research projects open to every student on campus.",
    logo: "assets/img/logo-placeholder.svg",
    instituteLogo: "assets/img/iitdh-logo-placeholder.svg",
    email: "aiclub@iitdh.ac.in",
    address: "Indian Institute of Technology Dharwad, Chikkamalligawad, Dharwad, Karnataka 580007",
    socials: {
      instagram: "https://instagram.com/",
      linkedin: "https://linkedin.com/",
      github: "https://github.com/",
      youtube: "https://youtube.com/",
      x: "https://x.com/"
    },
    joinLink: "https://forms.gle/your-form-id",
    stats: { members: 240, projects: 18, events: 42, workshops: 25 }
  },

  people: [
    { id: "p1", name: "Faculty Advisor Name", role: "Faculty Advisor", team: "Faculty", year: "", photo: "", bio: "Associate Professor, Dept. of CSE. Research interests in machine learning and optimization.", linkedin: "#", github: "", email: "advisor@iitdh.ac.in" },
    { id: "p2", name: "Coordinator Name", role: "Overall Coordinator", team: "Core", year: "4th Year, CSE", photo: "", bio: "Leads the club's vision, partnerships and flagship events.", linkedin: "#", github: "#", email: "" },
    { id: "p3", name: "Co-Coordinator Name", role: "Co-Coordinator", team: "Core", year: "3rd Year, EE", photo: "", bio: "Runs operations and keeps every project on track.", linkedin: "#", github: "#", email: "" },
    { id: "p4", name: "Tech Lead Name", role: "Technical Lead", team: "Core", year: "3rd Year, CSE", photo: "", bio: "Mentors project teams and maintains the club's compute resources.", linkedin: "#", github: "#", email: "" },
    { id: "p5", name: "Research Lead Name", role: "Research Lead", team: "Research", year: "4th Year, MnC", photo: "", bio: "Runs the weekly paper reading group and research mentorship.", linkedin: "#", github: "#", email: "" },
    { id: "p6", name: "Events Lead Name", role: "Events Lead", team: "Events", year: "3rd Year, ME", photo: "", bio: "Plans hackathons, talks and workshops across the semester.", linkedin: "#", github: "", email: "" },
    { id: "p7", name: "Design Lead Name", role: "Design & Media Lead", team: "Design", year: "2nd Year, CSE", photo: "", bio: "Owns the club's visual identity, posters and social media.", linkedin: "#", github: "", email: "" },
    { id: "p8", name: "Web Lead Name", role: "Web Lead", team: "Tech", year: "2nd Year, CSE", photo: "", bio: "Builds and maintains this website.", linkedin: "#", github: "#", email: "" },
    { id: "p9", name: "Member Name A", role: "ML Engineer", team: "Tech", year: "2nd Year, EE", photo: "", bio: "Works on computer vision projects.", linkedin: "#", github: "#", email: "" },
    { id: "p10", name: "Member Name B", role: "NLP Researcher", team: "Research", year: "3rd Year, CSE", photo: "", bio: "Interested in multilingual language models.", linkedin: "#", github: "#", email: "" },
    { id: "p11", name: "Member Name C", role: "Robotics Member", team: "Tech", year: "2nd Year, ME", photo: "", bio: "Reinforcement learning for robot control.", linkedin: "#", github: "#", email: "" },
    { id: "p12", name: "Member Name D", role: "Outreach Member", team: "Events", year: "1st Year, CSE", photo: "", bio: "Handles outreach and inter-college collaborations.", linkedin: "#", github: "", email: "" }
  ],

  projects: [
    { id: "pr1", title: "Kannada Speech Recognition", domain: "NLP", status: "Ongoing", image: "assets/img/placeholders/project-1.svg", description: "An open-source ASR model fine-tuned for Kannada and regional dialects spoken around Dharwad.", tech: ["PyTorch", "Whisper", "HuggingFace"], team: ["Member Name B", "Research Lead Name"], github: "#", demo: "", year: 2026 },
    { id: "pr2", title: "Crop Disease Detector", domain: "Computer Vision", status: "Completed", image: "assets/img/placeholders/project-2.svg", description: "A mobile-friendly CNN that identifies common crop diseases from leaf photos for local farmers.", tech: ["TensorFlow Lite", "Flutter"], team: ["Member Name A"], github: "#", demo: "#", year: 2025 },
    { id: "pr3", title: "Campus Copilot", domain: "LLMs", status: "Ongoing", image: "assets/img/placeholders/project-3.svg", description: "A retrieval-augmented assistant that answers questions about courses, rules and campus life.", tech: ["LangChain", "FAISS", "FastAPI"], team: ["Tech Lead Name", "Web Lead Name"], github: "#", demo: "", year: 2026 },
    { id: "pr4", title: "Autonomous Rover", domain: "Robotics", status: "Ongoing", image: "assets/img/placeholders/project-4.svg", description: "A small rover that learns to navigate the campus using reinforcement learning and SLAM.", tech: ["ROS2", "Stable-Baselines3", "Jetson"], team: ["Member Name C"], github: "#", demo: "", year: 2026 },
    { id: "pr5", title: "Fair Lens", domain: "AI Ethics", status: "Completed", image: "assets/img/placeholders/project-5.svg", description: "A toolkit to audit tabular ML models for bias across protected attributes.", tech: ["scikit-learn", "Streamlit"], team: ["Coordinator Name"], github: "#", demo: "#", year: 2025 },
    { id: "pr6", title: "Satellite Flood Mapper", domain: "Computer Vision", status: "Planned", image: "assets/img/placeholders/project-6.svg", description: "Segmenting flood extents from Sentinel-1 SAR imagery for disaster response.", tech: ["PyTorch", "U-Net", "Google Earth Engine"], team: ["Member Name A", "Co-Coordinator Name"], github: "", demo: "", year: 2026 }
  ],

  events: [
    { id: "e1", title: "Intro to Machine Learning Bootcamp", date: "2026-11-08", time: "10:00", venue: "Lecture Hall Complex, LHC-101", type: "Workshop", image: "assets/img/placeholders/event-1.svg", description: "A hands-on, beginner-friendly bootcamp covering regression, classification and model evaluation in Python.", registerLink: "#" },
    { id: "e2", title: "HackAI 2026 - 36 Hour Hackathon", date: "2026-12-05", time: "09:00", venue: "Central Library Atrium", type: "Hackathon", image: "assets/img/placeholders/event-2.svg", description: "Build AI-powered solutions for sustainability, healthcare and education. Prizes, mentors and plenty of coffee.", registerLink: "#" },
    { id: "e3", title: "Paper Reading: Attention Is All You Need", date: "2026-10-28", time: "18:00", venue: "Seminar Room 2", type: "Reading Group", image: "assets/img/placeholders/event-3.svg", description: "Weekly reading group - this week we revisit the transformer paper line by line.", registerLink: "" },
    { id: "e4", title: "Guest Talk: AI in Healthcare", date: "2026-09-20", time: "16:00", venue: "Auditorium", type: "Talk", image: "assets/img/placeholders/event-4.svg", description: "An industry researcher shares how deep learning is used in medical imaging diagnostics.", registerLink: "" },
    { id: "e5", title: "Computer Vision Workshop", date: "2026-08-30", time: "14:00", venue: "CSE Lab 3", type: "Workshop", image: "assets/img/placeholders/event-1.svg", description: "From convolutions to YOLO - build an object detector from scratch.", registerLink: "" },
    { id: "e6", title: "Orientation & Club Fair", date: "2026-08-10", time: "17:00", venue: "Open Air Theatre", type: "Meetup", image: "assets/img/placeholders/event-2.svg", description: "Meet the team, see our projects and find out how to join.", registerLink: "" },
    { id: "e7", title: "LLM Fine-tuning Workshop", date: "2026-04-12", time: "11:00", venue: "CSE Lab 1", type: "Workshop", image: "assets/img/placeholders/event-3.svg", description: "Fine-tune an open-weight language model on your own data using LoRA.", registerLink: "" },
    { id: "e8", title: "Kaggle Sprint", date: "2026-02-21", time: "10:00", venue: "Online", type: "Competition", image: "assets/img/placeholders/event-4.svg", description: "A week-long internal Kaggle-style competition with a live leaderboard.", registerLink: "" }
  ],

  gallery: [
    { id: "g1", src: "assets/img/placeholders/gallery-1.svg", caption: "HackAI 2025 opening ceremony", album: "Hackathons" },
    { id: "g2", src: "assets/img/placeholders/gallery-2.svg", caption: "ML Bootcamp - Day 1", album: "Workshops" },
    { id: "g3", src: "assets/img/placeholders/gallery-3.svg", caption: "Team photo 2025-26", album: "Team" },
    { id: "g4", src: "assets/img/placeholders/gallery-4.svg", caption: "Guest talk on generative AI", album: "Talks" },
    { id: "g5", src: "assets/img/placeholders/gallery-5.svg", caption: "Rover field test", album: "Projects" },
    { id: "g6", src: "assets/img/placeholders/gallery-6.svg", caption: "Winners of HackAI 2025", album: "Hackathons" },
    { id: "g7", src: "assets/img/placeholders/gallery-7.svg", caption: "CV Workshop hands-on session", album: "Workshops" },
    { id: "g8", src: "assets/img/placeholders/gallery-8.svg", caption: "Club fair stall", album: "Team" },
    { id: "g9", src: "assets/img/placeholders/gallery-9.svg", caption: "Late night debugging", album: "Hackathons" },
    { id: "g10", src: "assets/img/placeholders/gallery-10.svg", caption: "Panel discussion on AI ethics", album: "Talks" },
    { id: "g11", src: "assets/img/placeholders/gallery-11.svg", caption: "Crop disease demo day", album: "Projects" },
    { id: "g12", src: "assets/img/placeholders/gallery-12.svg", caption: "Farewell for graduating seniors", album: "Team" }
  ],

  news: [
    { id: "n1", title: "AI Club wins at Inter-IIT Tech Meet", date: "2026-10-12", category: "Achievement", image: "assets/img/placeholders/news-1.svg", summary: "Our team secured a podium finish in the ML problem statement at the Inter-IIT Tech Meet.", content: "Our team of five secured a podium finish in the machine learning problem statement at the Inter-IIT Tech Meet. The solution combined self-supervised pre-training with a lightweight ensemble. Congratulations to everyone involved!" },
    { id: "n2", title: "Paper accepted at a workshop", date: "2026-09-28", category: "Research", image: "assets/img/placeholders/news-2.svg", summary: "Work from the Kannada Speech Recognition project was accepted at a speech workshop.", content: "Work from our Kannada Speech Recognition project has been accepted at a speech processing workshop. The paper describes a low-resource fine-tuning recipe and a new evaluation set." },
    { id: "n3", title: "Recruitments for 2026-27 are open", date: "2026-08-15", category: "Announcement", image: "assets/img/placeholders/news-3.svg", summary: "Freshers and seniors alike - applications for all teams are now open.", content: "Applications for the Tech, Research, Events and Design teams are open. No prior experience needed - just curiosity. Fill the form linked on the home page." },
    { id: "n4", title: "New GPU workstation for members", date: "2026-07-02", category: "Announcement", image: "assets/img/placeholders/news-4.svg", summary: "Thanks to institute support, members can now book time on a dedicated GPU workstation.", content: "Thanks to support from the institute, members can now book compute time on a dedicated GPU workstation for project work. Contact the Tech Lead for access." }
  ],

  sponsors: [
    { id: "s1", name: "Partner One", logo: "assets/img/placeholders/sponsor.svg", url: "#" },
    { id: "s2", name: "Partner Two", logo: "assets/img/placeholders/sponsor.svg", url: "#" },
    { id: "s3", name: "Partner Three", logo: "assets/img/placeholders/sponsor.svg", url: "#" },
    { id: "s4", name: "Partner Four", logo: "assets/img/placeholders/sponsor.svg", url: "#" }
  ]
};
