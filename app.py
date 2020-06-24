from random import random
from flask import Flask
from flask import request, render_template
app = Flask(__name__)
import json
import requests

# ====================================================================================
# ROUTES
# ====================================================================================

@app.route("/", methods=['GET'])
def meal_planner():
	return render_template("meal_planner.html")

@app.route('/save_meals_data', methods=['GET','POST'])
def save_meals_data():
	if request.method != 'POST': return "error: method != post"
	if "data" not in request.form: return "error: data parse error"

	f = open("meals_data/data.json","w+", encoding="UTF-8")
	f.write(request.form["data"])
	f.close()

	return "ok"

@app.route('/load_meals_data', methods=['GET'])
def load_meals_data():
	data = {}
	try:
		f = open("meals_data/data.json","r", encoding="UTF-8")
		data = json.loads( f.read() )
		f.close()
	except:
		pass

	raw_food_data = requests.get("https://docs.google.com/spreadsheets/d/13O7ab0KMrUQ6FWYvOpHdHMmqYIBoXwldKm0M7Y76o74/gviz/tq?tqx=out:csv&sheet=food_data")
	data["raw_food_data"] = raw_food_data.text

	return json.dumps(data)

# ====================================================================================
# MAIN
# ====================================================================================

if __name__ == '__main__':
	# Threaded option to enable multiple instances for multiple user access support
	app.run(threaded=True, port=5000)