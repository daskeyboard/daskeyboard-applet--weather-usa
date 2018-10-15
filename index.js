const q = require('daskeyboard-applet');
const request = require('request-promise');

const apiUrl = "https://api.weather.gov/";
const serviceHeaders = {
  "User-Agent": "Das Keyboard q-applet-weather"
}

class WeatherAlerts extends q.DesktopApp {
  async selections(fieldName) {
    console.log("Generating selections...");
    const zones = require('./zones.json');
    const options = [];
    for (let feature of zones.features) {
      options.push([feature.properties.id, feature.properties.name]);
    }
    return options;
  }


  async run() {
    console.log("Running.");
    // return request.post({
    //   url: apiUrl,
    //   headers: {
    //     "Content-Type": "application/json"
    //   },
    //   body: {
    //   },
    //   json: true
    // }).then(body => {
    //   console.log("Got body: ", body);
    // })
  }
}

const applet = new WeatherAlerts();