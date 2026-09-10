# Admin guide (short, nontechnical)

This guide is for the people who run the Lalica website day to day. No
technical background needed.

## Signing in

1. Open the website address followed by /admin, for example
   https://www.example.com/admin.
2. Sign in with your Google account. If you see a message that your
   account is not active yet, an administrator has not switched you on.
   Ask them to activate your account in the Users page.
3. Keep your Google account secure with two-step verification. That second
   step protects the website too.

If your sign-in ever stops working, an administrator can check the Users
page. Deleting and re-adding a staff account is safe; content and
enquiries are not tied to individual accounts.

## The dashboard

The dashboard shows at a glance how many services, projects, CSR stories,
and news articles exist, and whether any enquiries need attention.

## Adding or changing a page

1. Open the section on the left (Services, Projects, CSR, or News).
2. Choose New to create a page, or open an existing one.
3. Type the title and the summary. The web address (slug) fills itself
   from the title and can be edited if needed.
4. Add body sections with the Add block buttons: headings, paragraphs,
   lists, quotes, callouts, images, and divider lines. Use the arrows to
   move a block, and the bin to delete it.
5. Add images with the image block. First upload the image in the Media
   library, and publish it there, then pick it in the page. The site only
   accepts JPG, PNG, and WebP images, and it strips hidden data from them
   before they are stored.
6. Choose Save draft to keep working later. Drafts are invisible to the
   public.

## Getting content published

- Editors prepare drafts and then use Save and submit to hand the page to
  an administrator for review.
- Only an administrator can publish. Publish makes the page live on the
  public site immediately, including the sitemap, with no further steps.
- Unpublish takes the page down immediately everywhere. Nothing is
  deleted; the text stays as a draft.
- If you change a page's web address, the site remembers the old address
  and sends visitors to the new one automatically.

## Enquiries

- Every enquiry from the contact form appears in Enquiries with a
  reference like ENQ-4F8K2M.
- Statuses: New, In progress, Resolved. Change the status as you handle
  the enquiry, and optionally assign it to a team member.
- If the automatic email notification failed, the enquiry shows a warning.
  Nothing is lost: the message is always stored even when email fails, and
  there is a Retry button for the notification.
- Export CSV downloads a spreadsheet of the enquiries. The file is
  protected so formulas inside enquiry text cannot run in your
  spreadsheet program.
- Old resolved enquiries are deleted after the retention period (365 days
  by default). The deletion is recorded in the Audit page.

## Users

- Staff appear in Users after they have signed in once. An administrator
  activates them and picks a role:
  - Administrator: everything.
  - Editor: pages, images, drafts, and review requests. Cannot publish.
  - Enquiry Manager: enquiries only.
- The website refuses to deactivate or demote the last active
  administrator, so you can never lock the whole team out.

## Settings

- Settings covers the homepage wording, contact details, navigation,
  partner list, social links, and a few feature switches.
- The partner section, social links, and any features marked unpublished
  stay hidden from visitors until an administrator turns them on. Do not
  turn on partners or social links until the company has confirmed the
  wording and permissions (see the content verification notes).
- After saving settings, the public site updates within moments.

## Media library

- Upload images here first. A new image starts as a draft and is private.
  Publish it in the library before using it in a published page.
- The site refuses to delete an image that a published page still uses.
  Remove it from the page first.
- Add a short description (alt text) to every image; it is what screen
  readers and search engines read.

## Safety notes

- If a save is rejected because of a special dash character, replace the
  dash with a comma, colon, parentheses, a full stop, or a normal hyphen.
  The message tells you which text to fix.
- If two people edit the same page at the same time, the second save is
  stopped with a friendly message. Reload the page, check the latest
  version, and save again.
- To delete a page, archive it first, then delete. This protects against
  accidental deletion.
