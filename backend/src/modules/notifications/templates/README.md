# Email Templates

This directory contains email templates used by the NotificationsService.

## File Naming Convention

Templates must be named with the following pattern:
- `{template-name}.{language-code}` (without .hbs extension)

For example:
- `welcome.en` - Welcome email in English
- `invitation.en` - Invitation email in English  
- `password-reset.en` - Password reset email in English

## Template Files

Currently available templates:

### Welcome Email (`welcome.en`)
- Sent when a new user registers
- Variables: `name`

### Invitation Email (`invitation.en`)
- Sent when a user is invited to join
- Variables: `invitationUrl`, `inviterName`

### Password Reset Email (`password-reset.en`)
- Sent when a user requests password reset
- Variables: `resetUrl`

## Adding New Templates

1. Create the template file with the correct naming convention
2. Use Handlebars syntax for variables: `{{variableName}}`
3. Ensure both the template file without extension and with .hbs extension exist (for compatibility)
4. Update the NotificationsService to use the new template

## Supported Languages

Currently supported language codes:
- `en` - English (default)
- `es` - Spanish (planned)
- `fr` - French (planned)

Note: Only English templates are currently available. To add support for other languages, create template files with the appropriate language code (e.g., `welcome.es`, `welcome.fr`).
