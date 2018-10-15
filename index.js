const q = require('daskeyboard-applet');
const request = require('request-promise');

const apiUrl = "https://api.weather.gov/";

class WeatherAlerts extends q.DesktopApp {
  constructor() {
    super();

    console.log("Construction...");
    process.on('message', (m) => {
      console.log("Got message ", m);

      process.send("Roger, roger!");
    })
  }



  async run() {
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
applet.start();