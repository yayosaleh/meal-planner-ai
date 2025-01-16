import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import { format } from "date-fns";

// Grant access to environment variables
dotenv.config();

// Initialize Notion client with integration token
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Notion recipe database and grocery list page id
const databaseId = process.env.NOTION_DATABASE_ID;
const parentPageId = process.env.NOTION_PAGE_ID;

// Returns stringified list of recipe objects loaded from Notion database
export async function loadRecipes() {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    // Access entries from response
    const entries = response.results;

    // Loop through entries to extract relevant recipe properties into list of recipe objects
    const recipes = entries
      .map((entry) => {
        const properties = entry.properties;

        const id = entry.id;
        const name =
          properties["Recipe Name"]?.title?.[0]?.plain_text || "No Name";
        const numDays = properties["Day"]?.multi_select?.length || 0;
        const servings = properties["Servings"]?.number || 0;
        const adjustedServings = properties["Adjusted Servings"]?.number || 0;
        const formatted = properties["Formatted"]?.checkbox;
        const ingredients =
          properties["Ingredients"]?.rich_text
            ?.map((item) => item.plain_text)
            .join("") || "No Ingredients";

        return {
          id,
          name,
          numDays,
          servings,
          adjustedServings,
          formatted,
          ingredients,
        };
      })
      .filter((recipe) => recipe.numDays > 0);

    console.log("Successfully loaded recipes from Notion database");
    const stringified_recipes = JSON.stringify(recipes);
    return stringified_recipes;
  } catch (error) {
    console.error("Error loading recipes from Notion database:", error.message);
  }
}

// Updates recipes in the Notion database
export async function updateRecipes(recipes) {
  try {
    for (const recipe of recipes) {
      const { id, adjustedServings, ingredients } = recipe;

      await notion.pages.update({
        page_id: id,
        properties: {
          Servings: {
            number: adjustedServings,
          },
          Formatted: {
            checkbox: true,
          },
          Ingredients: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: ingredients,
                },
              },
            ],
          },
        },
      });
    }

    console.log("Recipes updated in Notion database successfully");
  } catch (error) {
    console.error("Error updating recipes in Notion database:", error.message);
  }
}

// Creates a new grocery list page in Notion
export async function createGroceryListPage(groceryList) {
  try {
    const currentDate = format(new Date(), "MMMM dd, yyyy");

    await notion.pages.create({
      parent: { page_id: parentPageId },
      properties: {
        title: [
          {
            type: "text",
            text: {
              content: currentDate,
            },
          },
        ],
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: groceryList,
                },
              },
            ],
          },
        },
      ],
    });

    console.log("Notion grocery list page created successfully");
  } catch (error) {
    console.error("Error creating Notion grocery list page:", error.message);
  }
}
