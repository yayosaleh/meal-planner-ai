import fs from "fs";
import {
  loadRecipes,
  updateRecipes,
  createGroceryListPage,
} from "./notion.mjs";
import { parseRecipes, organizeGroceryList } from "./openai.mjs";
import {
  flattenRecipes,
  scaleServings,
  stringifyIngredients,
  generateGroceryList,
} from "./recipe-processing.mjs";

// Load recipes from Notion database
const recipesMessage = await loadRecipes();

// Parse recipes (structure ingredients) using OpenAI API
const parsedRecipes = await parseRecipes(recipesMessage);

// Convert ChatGPT response to convenient internal representation
const recipes = flattenRecipes(parsedRecipes);

// Scale ingredients based on adjusted servings, (does not affect 'servings' property)
scaleServings(recipes);

// Create Notion-compatible copy of recipe array
const notionRecipes = JSON.parse(JSON.stringify(recipes));
notionRecipes.forEach((recipe) => {
  recipe.ingredients = stringifyIngredients(recipe);
});
console.log(notionRecipes) // REMOVE

// Only update recipes if servings != adjusted servings or ingredients list is not formatted
// No need to wait
updateRecipes(
  notionRecipes.filter(
    (recipe) =>
      recipe.servings !== recipe.adjustedServings || recipe.formatted === false
  )
);

// Generate grocery list
const groceryList = generateGroceryList(recipes);

// Organize grocery list
const organizedGroceryList = await organizeGroceryList(groceryList);

// Post grocery list to Notion
// No need to wait
createGroceryListPage(organizedGroceryList);
