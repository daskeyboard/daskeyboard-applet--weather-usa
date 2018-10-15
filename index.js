const q = require('daskeyboard-applet');
const request = require('request-promise');

const apiUrl = "https://api.weather.gov";
const serviceHeaders = {
  "User-Agent": "Das Keyboard q-applet-weather"
}

class WeatherAlerts extends q.DesktopApp {
  async selections(fieldName) {
    console.log("Generating selections...");
    //const zones = require('./zones.json');
    return request.get({
      url: apiUrl + '/zones',
      headers: serviceHeaders,
      json: true
    }).then(zones => {
      //console.log("Got body: ", body);
      const options = [];
      for (let feature of zones.features) {
        if (feature.properties.type === 'public') {
          const id = feature.properties.id;
          let label = feature.properties.name;
          if (feature.properties.state) {
            label = label + ', ' + feature.properties.state;
          }
          options.push([id, label]);
        }
      }
      return options;
    }).catch((error) => {
      console.error("Caught error:", error);
    })
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