const q = require('daskeyboard-applet');
const fs = require('fs');
const request = require('request-promise');
const logger = q.logger;
const apiUrl = "https://api.weather.gov";

var zones = null;

const COLORS = Object.freeze({
  CLEAR: '#FFFF00',
  CLOUDY: '#FF00FF',
  SHOWER: '#0000FF',
  SNOW: '#FFFFFF',
  STORM: '#FF0000',
  SUNNY: '#FFFF00'
})


const FORECASTS = Object.freeze({
  CLEAR: 'CLEAR',
  CLOUDY: 'CLOUDY',
  SHOWER: 'SHOWER',
  SNOW: 'SNOW',
  STORM: 'STORM',
  SUNNY: 'SUNNY'
});

class Observation {
  constructor({
    clear = false,
    cloudy = false,
    shower = false,
    snow = false,
    storm = false,
    sunny = false,
    percent = 0
  }) {
    this.clear = clear;
    this.cloudy = cloudy;
    this.shower = shower;
    this.snow = snow;
    this.storm = storm;
    this.sunny = sunny;
    this.percent = percent;
  }

  isLikely() {
    return (this.percent && this.percent >= Observation.LIKELY_THRESHOLD);
  }

  isClear() {
    return this.clear;
  }

  isCloudy() {
    return this.cloudy;
  }

  isShower() {
    return this.shower;
  }

  isSnow() {
    return this.snow && this.isLikely();
  }

  isStorm() {
    return this.storm && this.isLikely();
  }

  isSunny() {
    return this.sunny;
  }

  prioritize() {
    if (this.isSnow()) {
      return FORECASTS.SNOW;
    } else if (this.isStorm()) {
      return FORECASTS.STORM;
    } else if (this.isShower()) {
      return FORECASTS.SHOWER;
    } else if (this.isCloudy()) {
      return FORECASTS.CLOUDY;
    } else if (this.isSunny()) {
      return FORECASTS.SUNNY;
    } else {
      return FORECASTS.CLEAR;
    }
  }
}

Observation.LIKELY_THRESHOLD = 20;
const percentChanceExpression = /(\d+) percent/;


/**
 * Evaluate a forecast string for specific features
 * @param {string} forecastText 
 */
function evaluateForecast(forecastText) {
  const forecast = forecastText.toLowerCase();
  const percentMatches = percentChanceExpression.exec(forecast);

  return new Observation({
    clear: forecast.includes('clear'),
    cloudy: forecast.includes('cloudy'),
    shower: ( forecast.includes('showers') || forecast.includes('rain') ),
    snow: forecast.includes('snow'),
    storm: forecast.includes('storm'),
    sunny: forecast.includes('sunny'),
    percent: (percentMatches && percentMatches.length > 1) ?
      percentMatches[1] : '0'
  });
}

// this is a work-around to a bug in the API that seems to send stale forecasts
function generateServiceHeaders() {
  return {
    'User-Agent': 'request(q-applet-weather)',
    'Accept': `application/geo+json, application/qawf-${new Date().getTime() + '' + Math.round(Math.random() * 10000)}`,
  };
}

async function getForecast(zoneId) {
  const url = apiUrl + `/zones/ZFP/${zoneId}/forecast`;
  logger.info("Getting forecast via URL: " + url);
  return request.get({
    url: url,
    headers: generateServiceHeaders(),
    json: true
  }).then(body => {
    const periods = body.properties.periods;
    if (periods) {
      return body;
    } else {
      throw new Error("No periods returned.");
    }
  }).catch((error) => {
    logger.error(`Error when trying to getForecast: ${error}`);
    throw new Error(`Error when trying to getForecast: ${error}`);
  })
}

function generateText(periods) {
  const forecasts = [];
  for (let i = 0; i < periods.length; i += 1) {
    let text = periods[i].detailedForecast.trim();
    text = text.replace(/\n/g, " ");
    text = text.replace(/\s+/g, ' ');
    text = `<div>${text}</div>`;
    forecasts.push(`<em>${periods[i].name}:</em> ${text}`);
  }

  return forecasts.join("\n");
}

// Used for sorting search results when searching through zones.
// The state will be placed first in the value used for sorting.
// This will make it easier to find results for a specific state.
function getSortValue(zone) {
  var stateZone = zone.toUpperCase().split(", ") // ignore upper and lowercase
  return stateZone.reverse().join(" ")
}


class WeatherForecast extends q.DesktopApp {
  constructor() {
    super();
    this.zoneName = null;
    // run every 30 min
    this.pollingInterval = 30 * 60 * 1000;
  }

  async options(fieldId, search) {
    if (zones) {
      logger.info("Sending preloaded zones");
      return this.processZones(zones, search);
    } else if (fs.existsSync('./zones.json')) {
      logger.info('Loading zones from a file.');
      zones = require('./zones.json');
      return this.processZones(zones, search);
    } else {
      logger.info("Retrieving zones via API...");
      return request.get({
        url: apiUrl + '/zones?type=forecast',
        headers: generateServiceHeaders(),
        json: true
      }).then(body => {
        zones = body;
        return this.processZones(zones, search);
      }).catch((error) => {
        logger.error("Caught error:", error);
      })
    }
  }


  async applyConfig() {
    this.zoneName = this.config.zoneId_LABEL;
  }

  async getZoneName() {
    if (this.config.zoneId_LABEL) {
      return this.config.zoneId_LABEL;
    } else if (this.zoneName) {
      return this.zoneName;
    } else {
      // we save the zoneId's corresponding zone name to persistent storage so
      // that we can include it in the forecast.
      const zoneId = this.config.zoneId;
      if (zoneId) {
        const zoneInfo = this.store.get('zoneInfo');
        logger.info("My saved zoneInfo is: " + JSON.stringify(zoneInfo));

        if (zoneInfo && zoneInfo.id === zoneId) {
          this.zoneName = zoneInfo.name;
          logger.info("Retrieved zoneName: " + this.zoneName);
          return this.zoneName;
        } else {
          logger.info('Saved zone is inconsistent with configured zone. ' +
            'Retrieving from service...');
          // store the new zone name in my configuration
          const options = await this.options();
          logger.info("Checking for matching zoneId: " + zoneId);
          for (let option of options) {
            if (option.key === zoneId) {
              this.zoneName = option.value;
              logger.info("My zone name is: " + this.zoneName);

              this.store.put('zoneInfo', {
                id: zoneId,
                name: this.zoneName
              });
              break;
            }
          }
          logger.info("Finished checking for matching zoneId.");

          if (this.zoneName) {
            return this.zoneName;
          } else {
            throw new Error("Could not find zone with ID: " + zoneId);
          }
        }
      } else {
        return null;
      }
    }
  }

  /**
   * Process a zones JSON to an options list
   * @param {*} zones
   * @param {String} search 
   */
  async processZones(zones, search) {
    if (search != null) {
      search = search.trim().toLowerCase();
    }

    logger.info("Processing zones JSON");
    const options = [];
    for (let feature of zones.features) {
      if (feature.properties.type === 'public') {
        const key = feature.properties.id;
        let value = feature.properties.name;

        if (!search || value.toLowerCase().includes(search)) {
          if (feature.properties.state) {
            value = value + ', ' + feature.properties.state;
          }

          options.push({
            key: key,
            value: value
          });
        }
      }
    }

    // We sort by alphabetical order first by state and then the region/city
    let optionsSorted = options.sort(function (a, b) {
      var nameA = getSortValue(a.value)
      var nameB = getSortValue(b.value)
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      // names must be equal
      return 0;
    });

    // return options[value].sort();
    return optionsSorted;

  }

  async run() {
    logger.info("Weather USA running.");
    const zoneId = this.config.zoneId;
    const zoneName = await this.getZoneName();

    if (zoneId) {
      logger.info("My zone ID is  : " + zoneId);
      logger.info("My zone name is: " + zoneName);

      return getForecast(zoneId).then(body => {
        const periods = body.properties.periods || [];
        const updated = body.properties.updated;
        const width = this.geometry.width || 4;

        logger.info("Forecast was updated on " + updated);
        logger.info(`Forecast contains ${periods.length} periods.`);
        logger.info("My width is: " + width);
        const points = [];
        const forecastPeriods = [];
        if (periods.length > 0) {
          logger.info("Got forecast: " + zoneId);
          for (let i = 0; i < width; i += 1) {
            // we skip every other one because we get a daily and nightly
            // forecast for each day
            if (periods.length > i * 2) {
              const period = periods[i * 2];
              forecastPeriods.push(period);
              const observation = evaluateForecast(period.detailedForecast);
              const forecastValue = observation.prioritize();
              const color = COLORS[forecastValue];
              points.push(new q.Point(color));
            }
          }

          const signal = new q.Signal({
            points: [points],
            name: `${zoneName}`,
            message: `<div><b>Weather Forecast for ${zoneName}:</b></div>` +
              generateText(forecastPeriods)
          });
          logger.info('Sending signal: ' + JSON.stringify(signal));
          return signal;
        } else {
          logger.info("No forecast for zone: " + zoneId);
          return null;
        }
      }).catch((error) => {
        logger.error(`Error while getting forecast data: ${error}`);
          if(`${error.message}`.includes("getaddrinfo")){
            // Commented in order to do not send this kind of notification. Boring to close the signal.
            // return q.Signal.error(
            //   'The Weather forecast USA service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([`The Weather forecast USA service returned an error. Detail: ${error}`]);
          }
      })
    } else {
      logger.info("No zoneId configured.");
      return null;
    }
  }
}


module.exports = {
  FORECASTS: FORECASTS,
  Observation: Observation,
  WeatherForecast: WeatherForecast,
  evaluateForecast: evaluateForecast,
  generateServiceHeaders: generateServiceHeaders,
  getForecast: getForecast,
  generateText: generateText
}

const applet = new WeatherForecast();
