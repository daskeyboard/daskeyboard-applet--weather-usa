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
    if (m.startsWith('{')) {
      const message = JSON.parse(m);
      console.log("Received JSON message: ", message);

      const type = message.type;
      switch (type) {
        case 'SELECTIONS': {
          console.log("Handling " + type);
          this.selections(message.id).then(selections => {
            const response = {
              type: 'SELECTIONS',
              selections: selections
            }
            process.send(JSON.stringify(response));
          });
          break;
        }
        default: {
          console.error("Don't know how to handle JSON message of type: '" + type + "'");
        }
      }
    } else {
      switch (m) {
        case 'START':
          {
            console.log("Got START");
            break;
          }
        default:
          {
            console.error("Don't know what to do with message: '" + m + "'");
          }
      }
    }
  }

  async selections(id) {
    
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