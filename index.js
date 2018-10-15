const q = require('daskeyboard-applet');
const request = require('request-promise');

const apiUrl = "https://api.weather.gov";
const serviceHeaders = {
  "User-Agent": "Das Keyboard q-applet-weather"
}

var zones = null;

class WeatherAlerts extends q.DesktopApp {
  async selections(fieldName) {
    if (zones) {
      console.log("Sending preloaded zones");
      return this.processZones(zones);
    } else {
      console.log("Retrieving zones...");
      //const zones = require('./zones.json');
      return request.get({
        url: apiUrl + '/zones',
        headers: serviceHeaders,
        json: true
      }).then(body => {
        zones = body;
        return this.processZones(zones);
      }).catch((error) => {
        console.error("Caught error:", error);
      })
    }
  }

  /**
   * Process a zones JSON to an options list
   * @param {*} zones 
   */
  async processZones(zones) {
    console.log("Processing zones JSON");
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
  }

  async run() {
    console.log("Running.");
    const zone = this.config.zoneId;
    if (zone) {
      return request.get({
        url: apiUrl + '/alerts/active/zone/' + zone,
        headers: serviceHeaders,
        json: true
      }).then(body => {
        const features = body.features;
        if (features && features.length > 0) {
          console.log("Got alert for zone: " + zone);
          return new q.Signal([[new q.Point('#FF0000')]]);
        } else {
          console.log("No alerts for zone: " + zone);
          return null;
        }
      }).catch((error) => {
        console.error("Caught error:", error);
        return null;
      })
    } else {
      console.log("No zoneId configured.");
      return null;
    }
  }
}

const applet = new WeatherAlerts();