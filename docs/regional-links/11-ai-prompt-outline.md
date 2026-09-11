# AI Prompt Outline For Regional Links In Productivity App

Use this template to generate per-country links in a consistent format for the app.

## Prompt Template

You are curating links for young adults in **[COUNTRY_NAME]** for a mobile app.  
Return exactly **15 items** for this country using reliable official or widely trusted sources.

Rules:
1. Include a mix of: emergency numbers, non-emergency support, helplines, government portals, jobs, housing, healthcare, tax, education, and legal/rights support.
2. Prefer official government sources first, then trusted major providers.
3. If a service is phone-based, include `tel:` format (example: `tel:911`).
4. Keep descriptions short (max 1 sentence) and practical for young adults.
5. Avoid duplicate services or duplicate categories.
6. Output must be valid JSON array only.

JSON schema for each item:
- `id`: machine-safe unique id (kebab-case)
- `title`: friendly display name
- `urlOrNumber`: full URL or `tel:` number
- `category`: one of ["Government", "Emergency", "Health", "Finance", "Employment", "Education", "Housing", "Wellbeing", "Legal", "Transport", "Consumer"]
- `description`: short practical summary
- `priority`: number 1-10 where 10 is most important

Example output item:
{
  "id": "country-emergency-services",
  "title": "Emergency Services",
  "urlOrNumber": "tel:911",
  "category": "Emergency",
  "description": "Police, fire, and ambulance emergency support.",
  "priority": 10
}

Now generate the 15 items for **[COUNTRY_NAME]** with country code **[COUNTRY_CODE]**.
