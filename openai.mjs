import fs from "fs";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import dotenv from "dotenv";

// DEFINE SCHEMAS FOR STRUCTURED OUTPUT

const measurementSchema = z.object({
  unit: z.string(), // Unit of measurement, e.g., "g", "ml", etc.
  value: z.number(), // Numerical value of the measurement
});

const ingredientSchema = z.object({
  name: z.string(), // Name of the ingredient
  measurement: measurementSchema.nullable(), // Nullable measurement object for the ingredient
  note: z.string().nullable(), // Nullable note property for additional details
});

const IngredientSectionSchema = z.object({
  name: z.string().nullable(), // Nullable section name, e.g., "Chicken & Marinade"
  ingredients: z.array(ingredientSchema), // Array of ingredients in section
});

const recipeSchema = z.object({
  id: z.string(), // The recipe ID
  name: z.string(), // Name of the recipe
  numDays: z.number(), // Number of days of the week assigned to the recipe
  servings: z.number(), // Number of servings
  adjustedServings: z.number(), // Adjusted number of servings
  formatted: z.boolean(), // Whether ingredients list is formatted or not
  ingredientSections: z.array(IngredientSectionSchema).nullable(), // Nullable array of ingredient sections
});

// Wrapper object for array of recipe objects to comply with OpenAI API
const RecipeArrayWrapperSchema = z.object({
  recipes: z.array(recipeSchema),
});

// CHATGPT FUNCTIONS

// Grant access to environment variables
dotenv.config();

// Initialize OpenAI API client (automatically finds API key in environment variables)
const openai = new OpenAI();

// Returns array of parsed recipe objects from Notion DB
export async function parseRecipes(recipesMessage) {
  try {
    const systemMessage = fs.readFileSync("parse-recipes-prompt.txt", "utf-8");
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: recipesMessage },
      ],
      response_format: zodResponseFormat(RecipeArrayWrapperSchema, "recipes"),
    });

    console.log("Successfully parsed recipes using OpenAI request");
    const recipeArrayWrapper = completion.choices[0].message.parsed;
    return recipeArrayWrapper.recipes;
  } catch (error) {
    console.error("Error parsing recipes using OpenAI request:", error);
  }
}

// Returns string with aisle-organized grocery list
export async function organizeGroceryList(groceryList) {
  try {
    const systemMessage = `
    Group the grocery list by category, using an emoji to label each category (e.g., '🥩 Meat').
    When applicable, use the following categories: 'Produce' (for fruits, vegetables, and mushrooms), 'Dairy & Eggs', 'Meat' (including poultry and seafood), 'Baked Goods', 'Grains & Cereals', 'Canned Goods', and 'Pantry' (for condiments, spices, etc.).
    Add other categories if necessary.
    Keep the format and content of individual items unchanged.
    Do not add any bullets or hyphens beside each item.
    `;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: groceryList },
      ],
      temperature: 0.2,
    });

    console.log("Successfully organized grocery list using OpenAI request");
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error organizing grocery list using OpenAI request:", error);
  }
}
