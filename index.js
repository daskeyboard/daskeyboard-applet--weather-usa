const q = require('daskeyboard-applet');
const request = require('request-promise');

const apiUrl = "https://api.weather.gov/";

class WeatherAlerts extends q.DesktopApp {
  constructor() {
    super();

    console.log("Construction...");
    process.on('message', (m) => this.handleMessage(m));
  }

  async handleMessage(m) {
    if (m === 'START') {
      this.start();
    } else if (m.startsWith('{')) {
      let json = JSON.parse(m);
      console.log("Received message: ", json);
      let response = {
        text: "Roger, roger!"
      };
      process.send(JSON.stringify(response));

    } else {
      console.error("Don't know what to do with message: '" + m + "'");
    }
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