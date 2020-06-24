// =============================================================================
// GLOBALS
// =============================================================================
var ERROR = 0.0005;
var MAX_ITERATIONS = 8000;

var DATA = [];

// calculation methods (for the requirements):
// match_all
// prioritize_protein_intake
// prioritize_carbs_intake


// =============================================================================
// GET TOTALS AND OFFSET
// =============================================================================
// given a food list, calculate it's total calories, proteins, fat and carbs
function get_totals(food_list){
	result={calories:0, protein:0, fat:0, carbs:0};
	for(const food in food_list){
		for(const item in result){
			result[item] += food_list[food][item] * food_list[food]["multiplier"];
		}
	}
	return result;
}

// calculate the difference between the totals of a food list and the
// requirements (relative error). This error is called 'offset'
function get_requirements_offset(food_list, requirements){
	totals = get_totals(food_list);

	offset = {protein:0, fat:0, carbs:0};
	if(requirements["calculation_method"] == "prioritize_protein_intake") offset = {calories:0, protein:0};
	if(requirements["calculation_method"] == "prioritize_carbs_intake") offset = {calories:0, carbs:0};

	for(const item in offset){ offset[item] = 1-totals[item]/requirements[item]; }
	return offset;
}

// get the 2-norm error of the offset (the norm squared)
function get_requirements_offset_norm(food_list,requirements){
	offset = get_requirements_offset(food_list,requirements);
	result = 0;
	for(const item in offset){result+= offset[item]*offset[item]}
	return result;
}

// =============================================================================
// GET SINGLE MEAL PLAN
// =============================================================================
// given an array, create a subarray (sample)
function get_random_subarray(arr, size) {
	if(size > arr.length) { size = arr.length; }

	var shuffled = arr.slice(0), i = arr.length, temp, index;
	while (i--) {
		index = Math.floor((i + 1) * Math.random());
		temp = shuffled[index];
		shuffled[index] = shuffled[i];
		shuffled[i] = temp;
	}
	return shuffled.slice(0, size);
}

// filter the food list for each meal
// (so that you don't end up eating cheerio's for dinner)
function get_filtered_data(food_data, meal){
	filtered_data = [];
	for(const item in food_data){
		if(!food_data[item]["is_usual"]) continue;

		if(meal == "breakfast"){
			if(!["Breakfast"].includes(food_data[item]["category"])) continue;
		}

		if(meal == "snack"){
			if(!["Breakfast","Fruits","General","Snack","Beverages"].includes(food_data[item]["category"])) continue;
		}

		if(meal == "dinner" || meal == "lunch"){
			if(!["Pasta","General","Meat / Fish","Elaborate","Fast food","Side dishes","Salad / Veggie","Fruits"].includes(food_data[item]["category"])) continue;
		}

		var item_copy = {};
		filtered_data.push(Object.assign(item_copy,food_data[item]));
	}
	return filtered_data;
}

// create a diet plan for 1 day
function get_single_meal_plan(food_data, requirements, meal){

	if(!("calories" in requirements)) requirements["calories"] = requirements["protein"]*4+requirements["carbs"]*4+requirements["fat"]*9;
	if(!("max_calories_per_meal" in requirements)) requirements["max_calories_per_meal"] = requirements["calories"] * 0.33;
	if(!("min_calories_per_meal" in requirements)) requirements["min_calories_per_meal"] = 250;

	var max_sample_size = Math.ceil(requirements["max_calories_per_meal"]/250)+1;

	var filtered_data = get_filtered_data(food_data, meal);
	var food_list = get_random_subarray(filtered_data,max_sample_size);
	var totals = get_totals(food_list);

	while(totals["calories"]>requirements["max_calories_per_meal"] || totals["calories"]<requirements["min_calories_per_meal"]){
		var sample_size = max_sample_size;
		if(Math.random() > 0.25) sample_size -= 1;
		if(Math.random() > 0.50) sample_size -= 1;
		if(Math.random() > 0.75) sample_size -= 1;
		food_list = get_random_subarray(filtered_data,sample_size);
		totals = get_totals(food_list);
	}

	for(const item in food_list){ food_list[item]["meal"] = meal; }

	return food_list;
}

// =============================================================================
// GET FULL DIET FOR A DAY
// =============================================================================
function create_diet_plan(requirements_, food_data = DATA, preset_foods = []){
	// copy requirements
	var requirements = {};
	requirements = Object.assign(requirements,requirements_);

	//update requirements from preset foods
	var preset_meals = [];
	if(preset_foods.length){
		var preset_totals = get_totals(preset_foods);
		for(const item in preset_totals){ requirements[item] -= preset_totals[item]; }
		for(const item in preset_foods){
			if(!preset_meals.includes(preset_foods[item]["meal"])){
				preset_meals.push(preset_foods[item]["meal"]);
			}
		}
	}

	if(!("calories" in requirements)) requirements["calories"] = requirements["protein"]*4+requirements["carbs"]*4+requirements["fat"]*9;
	if(!("max_calories_per_meal" in requirements)) requirements["max_calories_per_meal"] = requirements["calories"] * 0.33;
	if(!("min_calories_per_meal" in requirements)) requirements["min_calories_per_meal"] = 250;

	var offset = 10;
	var best_offset = 10;
	var iterations = 0;
	var food_list = [];
	var best_food_list = [];

	while(offset > ERROR) {
		food_list = [];

		if(!preset_meals.includes("breakfast")) { food_list = food_list.concat(get_single_meal_plan(food_data, requirements, "breakfast"));}
		if(!preset_meals.includes("snack")) { food_list = food_list.concat(get_single_meal_plan(food_data, requirements, "snack"));}
		if(!preset_meals.includes("lunch")) { food_list = food_list.concat(get_single_meal_plan(food_data, requirements, "lunch"));}
		if(!preset_meals.includes("dinner")) { food_list = food_list.concat(get_single_meal_plan(food_data, requirements, "dinner"));}

		offset = get_requirements_offset_norm(food_list,requirements);
		iterations += 1;

		if(best_offset > offset){
			best_offset = offset;
			Object.assign(best_food_list, food_list);
		}

		if(iterations > MAX_ITERATIONS){
			console.log("Returning best plan after " + iterations + " iterations");
			return best_food_list.concat(preset_foods);
		}
	}

	console.log("Created diet plan after " + iterations + " iterations");
	return food_list.concat(preset_foods)
}

// =============================================================================
// GET FULL DIET FOR MANY
// =============================================================================
function get_simplified_data(food_data, sample_size){
	var simplified_data = []

	var breakfast_data = get_filtered_data(food_data, "breakfast");
	var snack_data     = get_filtered_data(food_data, "snack");
	var lunch_data     = get_filtered_data(food_data, "lunch");
	var dinner_data    = get_filtered_data(food_data, "dinner");

	simplified_data = simplified_data.concat( get_random_subarray( breakfast_data , sample_size ) );
	simplified_data = simplified_data.concat( get_random_subarray( snack_data     , sample_size ) );
	simplified_data = simplified_data.concat( get_random_subarray( lunch_data     , sample_size ) );
	simplified_data = simplified_data.concat( get_random_subarray( dinner_data    , sample_size ) );

	return simplified_data;
}

function create_sequence_plan(requirements, number_of_days, food_data = DATA, preset_foods = []){

	// get a small sample size of food data (so the grocery list is not that large)
	var simplified_food_data = get_simplified_data(food_data, 15);
	console.log("Caclulating full plan with " + simplified_food_data.length + " food items");

	// calculate each plan
	var full_plan = [];
	for(i = 0; i<number_of_days; i++){
		full_plan.push( create_diet_plan(requirements, simplified_food_data, preset_foods) );
	}

	return full_plan;
}
