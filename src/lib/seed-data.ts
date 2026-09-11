/**
 * Verified company content used by the seed script.
 *
 * Every string here comes from the company profile (Lalica Company
 * Profile_.pdf) or from the accepted writing brief, with physical PDF
 * page references in docs/content-provenance.md. Nothing in this file is
 * invented. No fictional projects, clients, certifications, testimonials,
 * or CSR metrics are seeded.
 */

import { randomUUID } from "node:crypto";

import type { Body } from "@/lib/content/blocks";
import type {
  ContentDraft,
  ServiceMetadata,
} from "@/lib/content/types";

const uuid = () => randomUUID();

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export const SEED_SETTINGS: Record<string, Record<string, unknown>> = {
  company: {
    name: "Lalica Engineering Limited",
    shortName: "Lalica",
    description:
      "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients. Based in Kahawa West, Nairobi, we support reliable operations through installation, maintenance, and technical engineering services.",
    priorities: [
      "Excellence",
      "Innovation",
      "Reliability",
      "Tailored services",
      "Efficient project execution",
      "Long-term performance",
      "Client satisfaction",
    ],
    addressLine: "DSM Center, Kahawa West, Nairobi, Kenya",
    region: "Nairobi, Kenya",
    telephone: "+254728112444",
    telephoneDisplay: "+254 728 112 444",
    email: "info@lalicaengineering.com",
    websiteDisplay: "www.lalicaengineering.com",
    locationSearchUrl:
      "https://www.google.com/maps/search/?api=1&query=DSM%20Center%2C%20Kahawa%20West%2C%20Nairobi%2C%20Kenya",
  },
  contacts: {
    telephone: "+254728112444",
    telephoneDisplay: "+254 728 112 444",
    email: "info@lalicaengineering.com",
    whatsappNumber: "",
    whatsappConfirmed: false,
    businessHours: "",
    addressLine: "DSM Center, Kahawa West, Nairobi, Kenya",
    locationSearchUrl:
      "https://www.google.com/maps/search/?api=1&query=DSM%20Center%2C%20Kahawa%20West%2C%20Nairobi%2C%20Kenya",
  },
  mission_vision: {
    mission:
      "To provide professional, reliable, and innovative engineering solutions that enhance operational efficiency, safety, and sustainability for our clients.",
    vision:
      "To be a leading engineering solutions provider recognized for quality, integrity, and technological advancement in industrial and commercial sectors.",
    brandStatement: "Transforming concepts into reality and nurturing innovation",
    brandStatementSource: "Statement from the Lalica company profile",
  },
  homepage: {
    heroTitle: "Engineering solutions for reliable operations.",
    heroSubtitle:
      "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients.",
    introTitle: "An engineering partner for dependable operations",
    introBody:
      "Based in Kahawa West, Nairobi, we support reliable operations through installation, maintenance, and technical engineering services. Our work is guided by a commitment to excellence, innovation, reliability, tailored services, efficient project execution, long-term performance, and client satisfaction.",
    servicesTitle: "Our services",
    servicesSubtitle:
      "Three service groups cover electrical and automation engineering, mechanical engineering, and refrigeration and HVAC solutions.",
    whyTitle: "Why choose Lalica",
    storyTitle: "Transforming concepts into reality",
    projectsTitle: "Recent projects",
    csrTitle: "Corporate social responsibility",
    partnersTitle: "Our partners",
    contactTitle: "Talk to our team",
    contactBody:
      "Tell us about your facility, plant, or project. We will get back to you to discuss the best way forward.",
  },
  partners: {
    published: false,
    label: "Our partners",
    disclaimer:
      "The Lalica company profile displays these brands under the heading Our Partners.",
    sourceReference:
      "Lalica Company Profile_.pdf, physical page 10, Our Partners",
    entries: [
      "ABB",
      "CHINT",
      "FAG",
      "NSK",
      "WIKA",
      "Siemens",
      "Allen-Bradley",
      "Schneider Electric",
      "Honeywell",
    ].map((name) => ({ id: uuid(), name, note: "" })),
  },
  certifications: {
    published: false,
    label: "Certifications and licences",
    entries: [],
  },
  social: {
    published: false,
    entries: [],
  },
  seo_defaults: {
    defaultTitle:
      "Lalica Engineering Limited | Electrical, Mechanical, Refrigeration and HVAC Solutions in Nairobi",
    defaultDescription:
      "Lalica Engineering Limited provides electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients in Kenya.",
    siteName: "Lalica Engineering Limited",
  },
  features: {
    newsNav: "auto",
    homeProjects: true,
    homeCsr: true,
  },
  profile_download: {
    enabled: false,
    fileName: "Lalica Company Profile.pdf",
    sizeLabel: "approximately 12.2 MB",
  },
  navigation: {
    primary: [
      { id: "home", label: "Home", href: "/" },
      { id: "about", label: "About", href: "/about" },
      { id: "services", label: "Services", href: "/services" },
      { id: "projects", label: "Projects", href: "/projects" },
      { id: "csr", label: "CSR", href: "/csr" },
      { id: "contact", label: "Contact", href: "/contact" },
    ],
  },
  privacy: {
    draft: {
      sections: [
        {
          id: uuid(),
          heading: "About this policy",
          body:
            "This privacy policy explains how Lalica Engineering Limited (DSM Center, Kahawa West, Nairobi, Kenya) handles the information collected through this website, including the enquiry form. This draft was prepared to match the data the website actually collects and the processors it uses, and it must be reviewed by the company owner before publication.",
        },
        {
          id: uuid(),
          heading: "Information we collect",
          body:
            "When you send an enquiry we collect your full name, email address, optional organisation name, optional telephone number, the service you are interested in, your message, and your acknowledgement of this privacy notice. We also process technical data needed to protect the website: your network address is used in hashed form for rate limiting and is not retained in raw form beyond the request.",
        },
        {
          id: uuid(),
          heading: "How we use your information",
          body:
            "We use enquiry information to respond to your request, prepare quotations, keep business records, and improve our services. We do not sell personal information, and we do not use your details for unrelated marketing without permission.",
        },
        {
          id: uuid(),
          heading: "Service providers",
          body:
            "We use technology providers to operate the website. Depending on the features enabled, these may include Vercel for hosting, Neon for the PostgreSQL database, Upstash for rate limiting, Vercel Blob for image storage, Resend for transactional email, and Cloudflare Turnstile for bot protection. Each provider processes only the data needed for its function.",
        },
        {
          id: uuid(),
          heading: "How long we keep your information",
          body:
            "Enquiries are kept for 12 months by default so we can maintain accurate business records, after which they are deleted. The retention period can be changed by the website owner. You can ask us to delete your enquiry earlier using the contact details below.",
        },
        {
          id: uuid(),
          heading: "Your rights",
          body:
            "You may request access to the personal information we hold about you, ask for corrections, or ask for deletion. Contact us at info@lalicaengineering.com or call +254 728 112 444. We respond to reasonable requests promptly and without charge.",
        },
        {
          id: uuid(),
          heading: "Changes to this policy",
          body:
            "If this policy changes, the updated version will be published on this page with a new version date. Your continued use of the website after a change means you accept the updated policy.",
        },
        {
          id: uuid(),
          heading: "Contact",
          body:
            "Lalica Engineering Limited, DSM Center, Kahawa West, Nairobi, Kenya. Email: info@lalicaengineering.com. Telephone: +254 728 112 444.",
        },
      ],
    },
    publishedAt: null,
    publishedSections: null,
    version: 0,
    reviewedNote:
      "This draft was prepared to match the data the website actually collects and the processors it uses. It must be reviewed by the company owner before publication.",
  },
  redirects: {
    entries: [],
  },
};

/* ------------------------------------------------------------------ */
/* Services                                                           */
/* ------------------------------------------------------------------ */

interface SeedService {
  slug: string;
  draft: ContentDraft<"service">;
}

const electricalAutomationBody: Body = [
  {
    id: uuid(),
    type: "paragraph",
    text: "Our electrical and automation engineering services support safe, efficient, and dependable operations for industrial facilities, commercial spaces, and institutional clients.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Electrical installations",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We deliver safe and efficient electrical installations tailored to meet the demands of industrial facilities and commercial spaces, ensuring compliance with all standards.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Power distribution systems",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We design and implement reliable power distribution systems that ensure consistent energy flow, optimal load management, and operational stability.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Control panels and switchgear installation",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We install and configure high-quality control panels and switchgear to enhance system control, protection, and overall electrical performance.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Fault diagnosis and system maintenance",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We provide rapid fault detection and professional maintenance services to minimize downtime and keep your electrical systems running efficiently.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Automation",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "Automation is offered as a general service category within our electrical engineering work. We tailor the scope to your operation, and we are happy to discuss your specific requirements directly.",
  },
];

const mechanicalBody: Body = [
  {
    id: uuid(),
    type: "paragraph",
    text: "Our mechanical engineering services support industrial plant operations through installation, technical assistance, optimisation, and maintenance, and through the fabrication and assembly of mechanical components.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Plant installation",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We support smooth plant operations through technical assistance, system optimisation, and continuous production line maintenance. Plant installation work is planned with your team and quoted on a project basis after a site assessment.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Fabrication and assembly of components",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We design, fabricate, and assemble high-quality mechanical components tailored to meet specific operational and industrial requirements.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Ongoing support",
  },
  {
    id: uuid(),
    type: "list",
    ordered: false,
    items: [
      "Technical assistance for plant operations",
      "System optimisation",
      "Production line maintenance",
    ],
  },
];

const refrigerationBody: Body = [
  {
    id: uuid(),
    type: "paragraph",
    text: "We provide refrigeration and HVAC services for commercial, industrial, and institutional clients, including cold room installation and servicing, and air conditioning systems.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Cold room installation and servicing",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We install and service cold rooms to keep temperature sensitive operations running reliably.",
  },
  {
    id: uuid(),
    type: "heading",
    level: 2,
    text: "Air conditioning systems",
  },
  {
    id: uuid(),
    type: "paragraph",
    text: "We install and service air conditioning systems for commercial and industrial spaces.",
  },
  {
    id: uuid(),
    type: "callout",
    variant: "info",
    title: "",
    text: "Tell us about your cold room or air conditioning requirement and we will advise on the best approach for your site.",
  },
];

export const SEED_SERVICES: SeedService[] = [
  {
    slug: "electrical-automation",
    draft: {
      title: "Electrical and Automation Engineering",
      slug: "electrical-automation",
      excerpt:
        "Safe and efficient electrical installations, power distribution, control panels and switchgear, and fault diagnosis and maintenance for industrial facilities and commercial spaces.",
      body: electricalAutomationBody,
      coverMediaId: null,
      seoTitle: "Electrical and Automation Engineering in Nairobi | Lalica",
      seoDescription:
        "Electrical installations, power distribution, control panels and switchgear, and fault diagnosis and maintenance for industrial and commercial clients, from Kahawa West, Nairobi.",
      metadata: {
        serviceGroup: "electrical_automation",
        order: 1,
      } satisfies ServiceMetadata,
    },
  },
  {
    slug: "mechanical-engineering",
    draft: {
      title: "Mechanical Engineering",
      slug: "mechanical-engineering",
      excerpt:
        "Plant installation support, technical assistance, system optimisation, production line maintenance, and fabrication and assembly of mechanical components.",
      body: mechanicalBody,
      coverMediaId: null,
      seoTitle: "Mechanical Engineering in Nairobi | Lalica",
      seoDescription:
        "Plant installation support, production line maintenance, system optimisation, and fabrication and assembly of mechanical components from Kahawa West, Nairobi.",
      metadata: {
        serviceGroup: "mechanical",
        order: 2,
      } satisfies ServiceMetadata,
    },
  },
  {
    slug: "refrigeration-hvac",
    draft: {
      title: "Refrigeration and HVAC Solutions",
      slug: "refrigeration-hvac",
      excerpt:
        "Cold room installation and servicing, and air conditioning systems for commercial and industrial clients.",
      body: refrigerationBody,
      coverMediaId: null,
      seoTitle: "Refrigeration and HVAC Solutions in Nairobi | Lalica",
      seoDescription:
        "Cold room installation and servicing and air conditioning systems for commercial and industrial clients, from Kahawa West, Nairobi.",
      metadata: {
        serviceGroup: "refrigeration_hvac",
        order: 3,
      } satisfies ServiceMetadata,
    },
  },
];

export const SEED_SYSTEM_USER = {
  id: "system-seed",
  subject: "system:seed",
  name: "Website Seed",
  email: "system@lalica.local",
};

export const SEED_DEMO_USERS = [
  {
    subject: "demo:administrator",
    name: "Demo Administrator",
    email: "demo-admin@lalica.local",
    role: "administrator" as const,
  },
  {
    subject: "demo:editor",
    name: "Demo Editor",
    email: "demo-editor@lalica.local",
    role: "editor" as const,
  },
  {
    subject: "demo:enquiry_manager",
    name: "Demo Enquiry Manager",
    email: "demo-enquiries@lalica.local",
    role: "enquiry_manager" as const,
  },
];
