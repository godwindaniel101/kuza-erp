# Kuza — Brevo (Sendinblue) transactional email templates

Source HTML for Kuza's transactional emails. Paste each file's contents into the
Brevo template editor (Transactional > Templates). All dynamic values use Brevo's
parameter syntax `{{ params.NAME }}`, and optional blocks use Brevo/Django-style
conditionals `{% if params.NAME %}...{% endif %}`.

## How the app references these

The app sends each email by **numeric Brevo template ID**, not by filename. Brevo
assigns a real numeric ID when you save a template — override the defaults below with
those real IDs via the corresponding `BREVO_TEMPLATE_*` env vars.

The proposed IDs 1–7 are only convenient defaults; replace them with the actual IDs
Brevo returns for each saved template.

## Template → proposed ID → env var → params

| Proposed ID | File | Env var | Purpose |
|---|---|---|---|
| 1 | `1-welcome.html` | `BREVO_TEMPLATE_WELCOME` | Welcome new user |
| 2 | `2-invitation.html` | `BREVO_TEMPLATE_INVITATION` | Invite user to a business |
| 3 | `3-password-reset.html` | `BREVO_TEMPLATE_PASSWORD_RESET` | Password reset link |
| 4 | `4-reservation-confirmation.html` | `BREVO_TEMPLATE_RESERVATION` | Reservation confirmation/request |
| 5 | `5-invoice.html` | `BREVO_TEMPLATE_INVOICE` | Send an invoice |
| 6 | `6-supplier-invite.html` | `BREVO_TEMPLATE_SUPPLIER_INVITE` | Invite a supplier to the network |
| 7 | `7-partnership-request.html` | `BREVO_TEMPLATE_PARTNERSHIP_REQUEST` | Buyer → supplier partnership request |

## Params per template

### 1 — Welcome (`1-welcome.html`)
- `params.name` — recipient's name
- `params.appUrl` — dashboard URL (CTA "Go to your dashboard")

### 2 — Invitation (`2-invitation.html`)
- `params.inviterName` — person who sent the invite
- `params.businessName` — business being joined
- `params.invitationUrl` — accept-invite URL (CTA "Accept invitation")

### 3 — Password reset (`3-password-reset.html`)
- `params.name` — recipient's name
- `params.resetUrl` — reset URL (CTA "Reset password"); link expires

### 4 — Reservation confirmation (`4-reservation-confirmation.html`)
- `params.venueName` — venue name
- `params.customerName` — customer name
- `params.statusLabel` — status badge text (e.g. "Confirmed", "Pending")
- `params.intro` — intro sentence
- `params.dateTime` — reservation date & time
- `params.partySize` — number of guests
- `params.tableLabel` — table (optional, `{% if %}`)
- `params.reference` — booking reference (optional, `{% if %}`)
- `params.notes` — notes (optional, `{% if %}`)

### 5 — Invoice (`5-invoice.html`)
- `params.businessName` — sending business
- `params.invoiceNumber` — invoice number
- `params.customerName` — customer name
- `params.amount` — amount (pre-formatted)
- `params.currency` — currency code/symbol
- `params.dueDate` — due date
- `params.invoiceUrl` — invoice URL (CTA "View invoice")
- `params.emailBody` — custom message block (may contain HTML)
- `params.senderName` — signature name

### 6 — Supplier invite (`6-supplier-invite.html`)
- `params.inviterBusinessName` — inviting business
- `params.inviteUrl` — join URL (CTA "Join Kuza")
- `params.note` — optional message (optional, `{% if %}`)

### 7 — Partnership request (`7-partnership-request.html`)
- `params.buyerBusinessName` — requesting buyer business
- `params.note` — optional message (optional, `{% if %}`)
- `params.actionUrl` — review URL (CTA "Review request")

## Notes

- `params.emailBody` in the invoice template is rendered as raw HTML inside a `<div>`.
  Sanitize it before sending if it can contain user-supplied content.
- Keep param names exactly as documented — the app populates them by these names.
