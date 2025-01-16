// Transforms array of recipe objects from section segmented to section indexed
export function flattenRecipes(recipes) {
  const result = [];

  recipes.forEach((recipe) => {
    let ingredientCounter = 0;
    let allIngredients = [];
    let modIngredientSections = [];

    if (Array.isArray(recipe.ingredientSections)) {
      recipe.ingredientSections.forEach((section) => {
        if (section.name) {
          const modSection = {
            name: section.name,
            firstIngredientIndex: ingredientCounter,
          };
          modIngredientSections.push(modSection);
        }

        allIngredients.push(...section.ingredients);
        ingredientCounter += section.ingredients.length;
      });
    } else {
      allIngredients = null;
      modIngredientSections = null;
    }

    const modRecipe = {
      id: recipe.id,
      name: recipe.name,
      numDays: recipe.numDays,
      servings: recipe.servings,
      adjustedServings: recipe.adjustedServings,
      formatted: recipe.formatted,
      ingredients: allIngredients,
      ingredientSections: modIngredientSections,
    };
    result.push(modRecipe);
  });

  return result;
}

// Mutates input recipe array, scaling ingredients based on adjusted servings
// Does not affect 'servings' and 'adjustedServings' properties
export function scaleServings(recipes) {
  recipes.forEach((recipe) => {
    // Skip if the scaling factor is 1 or if the ingredients array is null
    if (
      recipe.adjustedServings === recipe.servings ||
      !Array.isArray(recipe.ingredients)
    ) {
      return;
    }

    const scalingFactor = recipe.adjustedServings / recipe.servings;

    recipe.ingredients.forEach((ingredient) => {
      if (ingredient.measurement && ingredient.measurement.value) {
        ingredient.measurement.value *= scalingFactor;
      }
    });
  });
}

// Returns ingredients list as natural language string
export function stringifyIngredients(recipe) {
  let result = "";

  // Handle case where ingredients array is null
  if (!Array.isArray(recipe.ingredients)) {
    return result;
  }

  // Create a map to store section headers by their first ingredient index for easy access
  const sectionMap = new Map();
  if (Array.isArray(recipe.ingredientSections)) {
    recipe.ingredientSections.forEach((section) => {
      sectionMap.set(section.firstIngredientIndex, section.name);
    });
  }

  // Iterate through all ingredients in their original order
  recipe.ingredients.forEach((ingredient, index) => {
    // If the current ingredient starts a section, add the section header
    if (sectionMap.has(index)) {
      result += `**${sectionMap.get(index)}**\n`;
    }

    // Add the ingredient's information to the string
    if (ingredient) {
      const measurement = ingredient.measurement
        ? `${formatValue(ingredient.measurement.value)} ${
            ingredient.measurement.unit
          } `
        : "";

      const notes = ingredient.note ? ` (${ingredient.note})` : "";
      result += `${measurement}${ingredient.name}${notes}\n`;
    }
  });

  return result.trim(); // Remove any trailing newlines
}

export function generateGroceryList(recipes) {
  const groceryList = new Map();

  // Iterate over all recipes and their ingredients
  recipes.forEach((recipe) => {
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((ingredient) => {
        if (!ingredient || !ingredient.name) {
          return; // Skip invalid ingredients (should never happen)
        }

        const ingredientName = ingredient.name.toLowerCase(); // Normalize name (should not be necessary)
        const measurement = ingredient.measurement;

        // Initialize entry for this ingredient if not present
        if (!groceryList.has(ingredientName)) {
          groceryList.set(ingredientName, []);
        }

        // Check measurement isn't null
        if (measurement) {
          // Scale the ingredient by the number of times the recipe is repeated in the week
          const scaledValue = measurement.value * recipe.numDays;

          // Check if this ingredient has already been measured in the same unit
          let existingMeasurement = groceryList
            .get(ingredientName)
            .find((m) => m.unit === measurement.unit);

          if (existingMeasurement) {
            // If a measurement with the same unit exists, sum the values
            existingMeasurement.value += scaledValue;
          } else {
            // Otherwise, add a new entry for this measurement
            groceryList.get(ingredientName).push({
              unit: measurement.unit,
              value: scaledValue,
            });
          }
        }
        // Skip adding anything for ingredients without measurement
      });
    }
  });

  // Format the grocery list for display
  const formattedGroceryList = [];
  groceryList.forEach((measurements, name) => {
    if (measurements.length === 0) {
      // If there are no measurements, just display the ingredient name
      formattedGroceryList.push(capitalize(name));
    } else {
      const formattedMeasurements = measurements
        .map(
          (measurement) =>
            `${formatValue(measurement.value)} ${measurement.unit}`
        )
        .join(" + ");

      // Capitalize the ingredient name and format it with the measurements
      formattedGroceryList.push(
        `${capitalize(name)}: ${formattedMeasurements}`
      );
    }
  });

  return formattedGroceryList.join("\n");
}

// Helper function to capitalize the first letter of a string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to format values as integers or rounded to two decimals
function formatValue(value) {
  return Number.isInteger(value) ? value : value.toFixed(2);
}
