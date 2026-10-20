"use strict";
/*
 * Content model. Each collection declares its validation schema and how API
 * fields map to table columns. Repositories and routes are generic over this
 * registry, so adding a collection = a migration + an entry here.
 */
const { z } = require("zod");

const text = (max = 200) => z.string().trim().max(max);
const required = (max = 200) => text(max).min(1, "Required");

// Links and image paths end up in href/src attributes - block script-capable schemes.
const UNSAFE_SCHEME = /^\s*(javascript|vbscript|data|file):/i;
const link = () =>
  z.string().trim().max(2000)
    .refine((v) => !UNSAFE_SCHEME.test(v), "Unsupported link scheme");
const email = () => z.union([z.literal(""), z.email().max(254)]);
const isoDate = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time = () => z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM")]);
const stringList = () => z.array(text(80)).max(30);

const COLLECTIONS = {
  people: {
    label: "people",
    shape: {
      name: required(120), role: required(120), team: required(40), year: text(80),
      photo: link(), bio: text(1000), linkedin: link(), github: link(), email: email()
    },
    defaults: { year: "", photo: "", bio: "", linkedin: "", github: "", email: "" }
  },
  projects: {
    label: "projects",
    shape: {
      title: required(160), domain: text(60), status: z.enum(["Ongoing", "Completed", "Planned"]),
      image: link(), description: text(4000), tech: stringList(), team: stringList(),
      github: link(), demo: link(), year: z.coerce.number().int().min(2000).max(2100).nullable()
    },
    json: ["tech", "team"],
    defaults: { domain: "", status: "Ongoing", image: "", description: "", tech: [], team: [], github: "", demo: "", year: null }
  },
  events: {
    label: "events",
    shape: {
      title: required(160), date: isoDate(), time: time(), venue: text(160), type: required(40),
      image: link(), description: text(4000), registerLink: link()
    },
    defaults: { time: "", venue: "", type: "Other", image: "", description: "", registerLink: "" },
    orderBy: "date DESC"
  },
  gallery: {
    label: "gallery",
    shape: { src: link().pipe(z.string().min(1, "Required")), caption: text(200), album: text(60) },
    defaults: { caption: "", album: "" }
  },
  news: {
    label: "news",
    shape: {
      title: required(200), date: isoDate(), category: required(40), image: link(),
      summary: text(500), content: text(20000)
    },
    defaults: { category: "Announcement", image: "", summary: "", content: "" },
    orderBy: "date DESC"
  },
  sponsors: {
    label: "sponsors",
    shape: { name: required(120), logo: link(), url: link() },
    defaults: { logo: "", url: "" }
  }
};

for (const [name, c] of Object.entries(COLLECTIONS)) {
  c.name = name;
  c.table = name;
  c.json = c.json || [];
  c.orderBy = c.orderBy || "position ASC, created_at ASC";
  // Fields with a default may be omitted on create; the repository fills them in.
  const createShape = Object.fromEntries(Object.entries(c.shape).map(([k, v]) => [k, k in c.defaults ? v.optional() : v]));
  c.create = z.object(createShape).strict();
  c.update = z.object(c.shape).partial().strict();
  // Backups/seed data carry ids and may carry extra keys - keep the id, drop the rest.
  c.import = z.object({ id: z.string().min(1).max(64).optional(), ...createShape });
}

const SETTINGS = z.object({
  clubName: required(80),
  institute: required(120),
  tagline: text(200),
  about: text(2000),
  logo: link(),
  instituteLogo: link(),
  email: email(),
  address: text(300),
  joinLink: link(),
  socials: z.record(z.string().regex(/^[a-z0-9_-]{1,30}$/), link()),
  stats: z.record(z.string().regex(/^[a-z0-9_-]{1,30}$/), z.coerce.number().int().min(0).max(1e7))
}).partial().strict();

const MESSAGE = z.object({
  name: required(120),
  email: z.email().max(254),
  topic: required(60),
  body: required(5000),
  website: z.string().max(0).optional() // honeypot: real visitors leave it empty
}).strict();

const PASSWORD = z.string().min(10, "Use at least 10 characters").max(200);

const USER_CREATE = z.object({
  email: z.email().max(254),
  name: required(120),
  role: z.enum(["admin", "editor"]),
  password: PASSWORD
}).strict();

const USER_UPDATE = z.object({
  name: required(120),
  role: z.enum(["admin", "editor"]),
  password: PASSWORD
}).partial().strict();

module.exports = { COLLECTIONS, SETTINGS, MESSAGE, PASSWORD, USER_CREATE, USER_UPDATE, z };
