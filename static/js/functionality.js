// =============================================================================
// GLOBALS
// =============================================================================
var MY_REQUIREMENTS; // calories, protein, fat, carbs, calculation_method, max_calories_per_meal, min_calories_per_meal
var MY_CURRENT_PLAN; // full plan
var MY_EXPRESS_PLAN; // single plan
var MY_SETTINGS;     // username, userid, login_token, completed_days, history, preset_foods, grocery_list_selected_items,

var MY_FOOD_DATA = []; // food data to be loaded from csv

var SELECTED_DAY_ID = "R";


// =============================================================================
// INITIALIZE
// =============================================================================
var MODAL_ADD_FOOD;
var MODAL_CREATE_PLAN;

$( document ).ready(function(){
	M.AutoInit();

	// Initialize Materialize
	//M.Tabs.init(document.getElementById("main-tabs"),{swipeable:true});
	MODAL_ADD_FOOD = M.Modal.getInstance($("#modal_add_food"));
	MODAL_CREATE_PLAN = M.Modal.getInstance($("#modal_create_plan"));

	download( function(){
		toast("Hello " + MY_SETTINGS["username"]);
		init();
	});
});

function init(){
	show_spinner();

	load_food_modal(); // add all foods to the load_food_modal
	display_day_selector(); // show the day selector with the current plan
	select_day(0); // select a day
	display_grocery_list(); // display the grocery list
	create_new_plan_modal_requirements_reset(); // reset the requirements in the new plan modal

	hide_spinner();
}

// =============================================================================
// SPINNER
// =============================================================================
function show_spinner(){ $(".mega_spinner").show(); }
function hide_spinner(){ $(".mega_spinner").hide(); }

// =============================================================================
// TOAST
// =============================================================================
function toast(text){ M.toast({html : text }); }

// =============================================================================
// DOWNLOAD AND UPLOAD DATA
// =============================================================================
function download(after = function(){}){
	$.get("/load_meals_data").done(function(response){
		response = JSON.parse(response);

		MY_REQUIREMENTS = response["requirements"];
		MY_CURRENT_PLAN = response["current_plan"];
		MY_EXPRESS_PLAN = response["express_plan"];
		MY_SETTINGS     = response["settings"];

		if(typeof MY_REQUIREMENTS === "undefined") MY_REQUIREMENTS = {calories:2002, protein:75, fat:78, carbs:250, calculation_method:"match_all"};
		if(typeof MY_CURRENT_PLAN === "undefined") MY_CURRENT_PLAN = [];
		if(typeof MY_EXPRESS_PLAN === "undefined") MY_EXPRESS_PLAN = [];
		if(typeof MY_SETTINGS === "undefined") MY_SETTINGS = {username:"",userid:"",completed_days:[],history:{}};

		console.log("Requirements:" + MY_REQUIREMENTS);
		console.log("Current plan:" + MY_CURRENT_PLAN);
		console.log("Express plan:" + MY_EXPRESS_PLAN);
		console.log("Settings:" + MY_SETTINGS);

		MY_FOOD_DATA    = parse_raw_data( response["raw_food_data"] );
		after();
	});
}

function upload(after = function(){}){
	var all = {requirements:MY_REQUIREMENTS, current_plan:MY_CURRENT_PLAN, express_plan:MY_EXPRESS_PLAN, settings:MY_SETTINGS};
	$.post("/save_meals_data", {"data": JSON.stringify(all) }).done(function(response){ console.log("Uploaded data: " + response);	after(); });
}

function parse_raw_data(raw_food_data){
	var data_raw = $.csv.toArrays(raw_food_data);
	var aux_ = [];

	for(const item in data_raw){
		if(item == 0) continue;
		if(data_raw[item][0] == "") continue;

		new_item = {};
		new_item["food"] = data_raw[item][0];
		new_item["is_usual"] = (data_raw[item][1] != "");
		new_item["icon"] = data_raw[item][2];
		new_item["category"] = data_raw[item][3];
		new_item["protein"] = data_raw[item][4];
		new_item["carbs"] = data_raw[item][5];
		new_item["fat"] = data_raw[item][6];
		new_item["calories"] = data_raw[item][4]*4+data_raw[item][5]*4+data_raw[item][6]*9;
		new_item["multiplier"] = 1;
		aux_.push(new_item);
	}

	return aux_;
}

// =============================================================================
// DISPLAY PLAN INFO (2nd TAB)
// =============================================================================
function get_grocery_item_html(text, extra, id_tag = ""){
	return "<div class='item truncate'><label><input type='checkbox' class='grocery_item' id_tag='" + id_tag + "' onclick='updated_grocery_list()'><span>" + text + "</span> <span class='extra'>" + extra + "</class></label></div>";
}

function generate_grocery_list(){
	grocery_list = {};
	for(const plan in MY_CURRENT_PLAN){
		for(const item in MY_CURRENT_PLAN[plan]){
			food_dict = MY_CURRENT_PLAN[plan][item];
			item_text = food_dict["icon"] + " " + food_dict["food"];
			if(!(item_text in grocery_list)) { grocery_list[item_text] = 0; }
			grocery_list[item_text] += 1;
		}
	}
	return grocery_list;
}

function display_grocery_list(){
	grocery_list = generate_grocery_list();
	var div = "<p>Total: " + Object.keys(grocery_list).length + " items</p>";

	var title = "";
	for(const item in grocery_list){
		div += get_grocery_item_html( item , "x " + grocery_list[item] + "" );
	}
	// Set Content
	$("#grocery_list_container").html(div);
}

function updated_grocery_list(){
	MY_SETTINGS["grocery_list_selected_items"] = [];
	$(".grocery_item").each(function(){
		let gorcery_item_id = parseInt( this.getAttribute("id_tag") );
		if(this.checked) { MY_SETTINGS["grocery_list_selected_items"].push(gorcery_item_id); }
	});
}

// =============================================================================
// DISPLAY FOOD DATABASE
// =============================================================================
function display_food_database(){

}

// =============================================================================
// DISPLAY FOOD LIST (DISPLAY PLAN)
// =============================================================================
function get_item_html(text, extra, input_class = "", id_tag = "", is_checked = false){
	return "<div class='item truncate'><label><input class='" + input_class + "' id_tag='" + id_tag + "' type='checkbox' " + (is_checked ? "checked" : "") + "><span>" + text + "</span> <span class='extra'>" + extra + "</class></label></div>";
}

function get_title_html(meal){
	//return "<div class='m_title'>" + text + "<a class='button_plus'></a>" + "</div>";
	return title = "<div class='m_title'>" + meal + "<a class='button_plus' onclick='add_food_with_modal(\"" + meal + "\")'>+</a>" + "</div>";
}

function display_food_list(food_list){ //display plan
	var div = "";

	// main meals
	meals = ["breakfast","snack","lunch","dinner"];
	for(meal in meals){
		div += get_title_html(meals[meal]);
		for(const item in food_list){
			if(food_list[item]["meal"] != meals[meal]) { continue; }
			else { div += get_item_html( food_list[item]["icon"] + " " + food_list[item]["food"] , "" + Math.round(food_list[item]["calories"]) + " kcal", "food_list_item" , item, food_list[item]["checked"] ); }
		}
	}

	// other meals
	var title = "";
	for(const item in food_list){
		if(meals.includes(food_list[item]["meal"])) { continue; }
		if(food_list[item]["meal"] == "") { food_list[item]["meal"] = "preset" }
		if(title != food_list[item]["meal"]) { title = food_list[item]["meal"] ; div += get_title_html(title) }
		div += get_item_html( food_list[item]["icon"] + " " + food_list[item]["food"] , "" + Math.round(food_list[item]["calories"]) + " kcal", "food_list_item" , item, food_list[item]["checked"] );
	}

	$("#main_container").html(div);
}

// =============================================================================
// ADD FOOD MODAL
// =============================================================================
function load_food_modal(){
	$(".modal_add_food_container").html("");
	var div = "";
	var title = "";
	for(const item in MY_FOOD_DATA){
		if(MY_FOOD_DATA[item]["category"] != title) { title = MY_FOOD_DATA[item]["category"]; div += "<div class='m_title'>" + title + "</div>"}
		div += get_item_html(MY_FOOD_DATA[item]["icon"] + " " + MY_FOOD_DATA[item]["food"], Math.round(MY_FOOD_DATA[item]["calories"]) + " kcal", "add_food_modal_item", item );
	}
	$("#modal_add_food_container").html(div);
}

function deselect_all_food_modal(){
	$(".add_food_modal_item").prop("checked",false);
}

function add_food_with_modal(meal, day = SELECTED_DAY_ID){
	// open modal
	MODAL_ADD_FOOD.open();
	deselect_all_food_modal();

	foodlst = SELECTED_DAY_ID == "R" ? MY_EXPRESS_PLAN : MY_CURRENT_PLAN[SELECTED_DAY_ID] ;

	$("#modal_add_food_ok").off('click').on('click',function(){

		$(".add_food_modal_item").each(function(){
			let food_item = Object.assign({}, MY_FOOD_DATA[parseInt( this.getAttribute("id_tag") )]);
			food_item["meal"] = meal;
			if(this.checked) { foodlst.push(food_item); }
		});
		select_day();
		MODAL_ADD_FOOD.close();
		upload();
	});
}

// =============================================================================
// REMOVE SELECTED, RANDOMIZE AND DONE
// =============================================================================
function remove_selected(){
	foodlst = SELECTED_DAY_ID == "R" ? MY_EXPRESS_PLAN : MY_CURRENT_PLAN[SELECTED_DAY_ID] ;
	var j = 0;
	$(".food_list_item").each(function(){
		if(this.checked) { foodlst.splice( parseInt(this.getAttribute("id_tag")) - j , 1 ); j++;}
	});
	display_grocery_list();
	select_day();
	upload();
}

function randomize(){
	foodlst = SELECTED_DAY_ID == "R" ? MY_EXPRESS_PLAN : MY_CURRENT_PLAN[SELECTED_DAY_ID] ;

	preset_foods = [];
	$(".food_list_item").each(function(){
		let food_item = [];
		food_item = Object.assign(food_item, foodlst[parseInt( this.getAttribute("id_tag") )]);
		if(this.checked) { food_item["checked"] = true ; preset_foods.push(food_item); }
	});

	show_spinner();
	new_plan = create_diet_plan(MY_REQUIREMENTS, MY_FOOD_DATA, preset_foods);
	if(SELECTED_DAY_ID == "R") { MY_EXPRESS_PLAN = new_plan }	else { MY_CURRENT_PLAN[SELECTED_DAY_ID] = new_plan }
	select_day();
	display_grocery_list();
	hide_spinner();
	upload();
}

function mark_as_done(){
	if(SELECTED_DAY_ID == "R") {
		return;
	}

	// deselect
	if("completed_days" in MY_SETTINGS && MY_SETTINGS["completed_days"].includes(SELECTED_DAY_ID)){
		MY_SETTINGS["completed_days"] = MY_SETTINGS["completed_days"].filter(item => item !== SELECTED_DAY_ID)
	// select
	} else {
		MY_SETTINGS["completed_days"].push(SELECTED_DAY_ID);
	}

	display_day_selector();
	select_day();
	upload();
}

// =============================================================================
// REQUIREMENTS TABLE
// =============================================================================
function display_requirements_table(plan_totals){
	$("#reqs_general_cals").html(Math.round(MY_REQUIREMENTS["calories"]));
	$("#reqs_general_prot").html(Math.round(MY_REQUIREMENTS["protein"]));
	$("#reqs_general_fat").html(Math.round(MY_REQUIREMENTS["fat"]));
	$("#reqs_general_carbs").html(Math.round(MY_REQUIREMENTS["carbs"]));

	$("#reqs_specific_cals").html(Math.round(plan_totals["calories"]));
	$("#reqs_specific_prot").html(Math.round(plan_totals["protein"]));
	$("#reqs_specific_fat").html(Math.round(plan_totals["fat"]));
	$("#reqs_specific_carbs").html(Math.round(plan_totals["carbs"]));

	$("#reqs_general_cals_2").html(Math.round(MY_REQUIREMENTS["calories"]));
	$("#reqs_general_prot_2").html(Math.round(MY_REQUIREMENTS["protein"]));
	$("#reqs_general_fat_2").html(Math.round(MY_REQUIREMENTS["fat"]));
	$("#reqs_general_carbs_2").html(Math.round(MY_REQUIREMENTS["carbs"]));

	$("#reqs_general_cals_3").html("100%");
	$("#reqs_general_prot_3").html(Math.round(100 * 4 * MY_REQUIREMENTS["protein"] / MY_REQUIREMENTS["calories"]) + "%");
	$("#reqs_general_fat_3").html(Math.round(100 * 9 * MY_REQUIREMENTS["fat"] / MY_REQUIREMENTS["calories"]) + "%");
	$("#reqs_general_carbs_3").html(Math.round(100 * 4 * MY_REQUIREMENTS["carbs"] / MY_REQUIREMENTS["calories"]) + "%");

	averages = {"calories":0,"fat":0,"protein":0,"carbs":0}
	for(const item in MY_CURRENT_PLAN){
		totals = get_totals(MY_CURRENT_PLAN[item]);
		for(const val in averages) { averages[val] += totals[val] / MY_CURRENT_PLAN.length }
	}

	$("#reqs_general_cals_4").html(Math.round(averages["calories"]));
	$("#reqs_general_prot_4").html(Math.round(averages["protein"]));
	$("#reqs_general_fat_4").html(Math.round(averages["fat"]));
	$("#reqs_general_carbs_4").html(Math.round(averages["carbs"]));

	$("#reqs_general_cals_5").html("100%");
	$("#reqs_general_prot_5").html(Math.round(100 * 4 * averages["protein"] / averages["calories"]) + "%");
	$("#reqs_general_fat_5").html(Math.round(100 * 9 * averages["fat"] / averages["calories"]) + "%");
	$("#reqs_general_carbs_5").html(Math.round(100 * 4 * averages["carbs"] / averages["calories"]) + "%");

	$("#reqs_general_plan_duration").html(MY_CURRENT_PLAN.length);
	$("#reqs_general_calculation_method").html(MY_REQUIREMENTS["calculation_method"]);

}

// =============================================================================
// DAT SELECTOR
// =============================================================================
function display_day_selector(){
	$("#days_container").html("");
	for(const item in MY_CURRENT_PLAN){
		day = parseInt(item)+1;
		$("#days_container").append('<a id="day_selector_' + item + '" onclick="select_day(' + item + ')" class="day_selector waves-effect waves-light little-container-item amber lighten-4 ' + (MY_SETTINGS["completed_days"].includes(day-1) ? "strikethrough" : "") + '">' + day + '</a>');
	}
}

function select_day(id = SELECTED_DAY_ID){
	if(! $("#day_selector_" + id).length) { id="R" }
	SELECTED_DAY_ID = id;

	$(".day_selector").removeClass("accent-4");
	$(".day_selector").removeClass("lighten-4");
	$(".day_selector").addClass("lighten-4");
	$("#day_selector_" + id).removeClass("lighten-4");
	$("#day_selector_" + id).addClass("accent-4");

	if(id=="R"){
		show_spinner();
		//MY_EXPRESS_PLAN = create_diet_plan(MY_REQUIREMENTS);
		display_food_list(MY_EXPRESS_PLAN);
		display_requirements_table(get_totals(MY_EXPRESS_PLAN));
		hide_spinner();
		return;
	}

	display_food_list(MY_CURRENT_PLAN[id]);
	display_requirements_table(get_totals(MY_CURRENT_PLAN[id]));
}

// =============================================================================
// CREATE NEW PLAN MODAL
// =============================================================================
function create_new_plan_modal_requirements_reset(){
	$("#reqs_general_prot_new_plan_input").val(MY_REQUIREMENTS["protein"]);
	$("#reqs_general_fat_new_plan_input").val(MY_REQUIREMENTS["fat"]);
	$("#reqs_general_carbs_new_plan_input").val(MY_REQUIREMENTS["carbs"]);

	$("#prioritize_match_all").prop('checked', true)
	if(MY_REQUIREMENTS["calculation_method"] == "prioritize_protein_intake") $("#prioritize_protein_intake").prop('checked', true);
	if(MY_REQUIREMENTS["calculation_method"] == "prioritize_carbs_intake") $("#prioritize_carbs_intake").prop('checked', true);

	$("#create_new_plan_modal_number_of_days_input").val(MY_CURRENT_PLAN.length == 0 ? "7" : MY_CURRENT_PLAN.length);

	create_new_plan_modal_requirements_update();
}

function create_new_plan_modal_requirements_update(){
	var protein = parseFloat( $("#reqs_general_prot_new_plan_input").val() );
	var fat     = parseFloat( $("#reqs_general_fat_new_plan_input").val() );
	var carbs   = parseFloat( $("#reqs_general_carbs_new_plan_input").val() );
	if(isNaN(protein) || isNaN(fat) || isNaN(carbs)) { return; }

	var calories = protein * 4 + fat * 9 + carbs * 4;
	$("#reqs_general_cals_new_plan").html(calories);
	$("#reqs_general_prot_new_plan_2").html(Math.round(protein*4*100/calories) + "%");
	$("#reqs_general_fat_new_plan_2").html(Math.round(fat*9*100/calories) + "%");
	$("#reqs_general_carbs_new_plan_2").html(Math.round(carbs*4*100/calories) + "%");
}

function create_new_plan_modal_ok(){
	var protein = parseFloat( $("#reqs_general_prot_new_plan_input").val() );
	var fat     = parseFloat( $("#reqs_general_fat_new_plan_input").val() );
	var carbs   = parseFloat( $("#reqs_general_carbs_new_plan_input").val() );
	var number_of_days = parseFloat( $("#create_new_plan_modal_number_of_days_input").val() );
	var calculation_method = "match_all";
	if($("#prioritize_protein_intake").is(':checked')) calculation_method = "prioritize_protein_intake";
	if($("#prioritize_carbs_intake").is(':checked')) calculation_method = "prioritize_carbs_intake";

	if(isNaN(protein) || isNaN(fat) || isNaN(carbs) || isNaN(number_of_days)) { toast("Error, check settings and try again"); return; }
	if(number_of_days < 1 || number_of_days > 30) { toast("Plan duration must be between 1 and 30 days"); return; }

	MODAL_CREATE_PLAN.close();
	show_spinner();
	MY_REQUIREMENTS = {protein:protein, fat:fat, carbs:carbs, calories:protein*4+fat*9+carbs*4, calculation_method:calculation_method};
	MY_CURRENT_PLAN = create_sequence_plan(MY_REQUIREMENTS, number_of_days, MY_FOOD_DATA);
	hide_spinner();
	init();
	upload();
}
