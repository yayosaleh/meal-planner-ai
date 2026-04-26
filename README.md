# Meal Planner AI

Node.js script that pulls recipes from Notion, uses OpenAI to structure ingredients, updates recipe entries, and creates a grocery list page in Notion.

## Getting Started

Requires Node.js 24 and a `.env` file with:

- `OPENAI_API_KEY`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `NOTION_PAGE_ID`

Install dependencies and run:

```bash
npm ci
npm start
```
