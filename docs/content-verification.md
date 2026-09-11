# Content verification checklist

Status: open items as of 10 September 2026. Every item below must be
resolved with the company owner before the related public content is
enabled. Nothing on this list is published or shown on the live site until
it is confirmed here.

## Open facts to verify with the company

| Item | Why it matters | How to resolve | Site effect |
| --- | --- | --- | --- |
| Printed domain www.lalicaengineering.com | The PDF prints it, but ownership and control are unverified | Confirm ownership of the domain and where it points; the production origin (PUBLIC_APP_URL) is only set after domain ownership is verified in Vercel | Canonical URLs, OG metadata, and sitemap entries use the production origin |
| Partner relationships with the brands named on PDF page 10 | The PDF displays them under "Our Partners", which implies a relationship the site should not assert without confirmation | Ask the owner which brands may be named, and whether any logo or trademark may be reproduced | The partner section stays unpublished until confirmed |
| Partner logo reproduction rights | Using partner logos requires permission or a licence from each brand | Confirm in writing which logos may be used; keep the confirmation on file | Partner logo section remains unpublished |
| WhatsApp number | The site must not imply the telephone number supports WhatsApp | Ask the owner to confirm a WhatsApp number and that it is operated by the company | A WhatsApp setting exists in the admin area; the feature stays disabled until confirmed |
| Social media profiles | No social links exist in the PDF | Ask the owner for confirmed profile URLs | A social settings record exists; it stays empty and unpublished until confirmed |
| Certifications and licences | None are listed in the source PDF | Ask the owner for certificate names, issuing bodies, and validity | A certifications setting exists; it stays empty and unpublished |
| Company registration details | None are stated in the source PDF | Ask the owner for the registered name and any registration number they want published | Nothing is published today; the footer deliberately omits registration wording |
| Establishment history and staff count | None are stated in the source PDF | Only publish what the owner provides in writing | Not published |
| Business hours | None are stated in the source PDF | Ask the owner | Not published |
| Map coordinates | None are stated in the source PDF | Confirm the exact pin location with the owner before adding a map | No map is embedded |
| Project case studies | The brief requires projects to start empty rather than invent history | The owner supplies the first real project write-ups through the CMS | /projects stays empty until real content exists |
| CSR activities and impact figures | No CSR data exists in the source PDF, and impact numbers must never be invented | The owner supplies real activities, dates, and any figures with evidence notes | /csr stays empty until real content exists |
| News items | None exist yet | The owner supplies announcements through the CMS | News navigation stays hidden until substantive content exists |
| Privacy policy review | The drafted policy describes the data the site actually collects and the processors used, but the wording is the owner's decision | The owner reviews the draft on /privacy, then an administrator publishes it | The draft currently renders with a review pending banner |

## Asset rights status

See docs/assets-manifest.md for the full inventory. In short:

- The logo and all photographs are extracted unchanged from the company
  supplied PDF, so they are assumed to be the company's own material.
- This assumption is recorded, not verified. Before using any extracted
  photograph as a project or CSR documentary image, confirm with the
  owner that it depicts Lalica's own work and that Lalica holds the rights.
- No AI generated imagery is used anywhere. No extracted image is used as
  evidence of a project, client, or activity without confirmation.

## Record of confirmed items

| Date | Item | Confirmed by | Evidence |
| --- | --- | --- | --- |
| None yet | Nothing beyond the PDF has been confirmed | | |

Keep this table updated as the owner confirms items. Only after an item is
confirmed here may the corresponding public content be published.
