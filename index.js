const fs = require('fs');
const {
  parseString
} = require('xml2js');
const moment = require('moment');
const readline = require('readline');
const request = require('request-promise');
const q = require('daskeyboard-applet');
const logger = q.logger;

const Colors = Object.freeze({
  CLEAR: '#FFFF00',
  CLOUDY: '#FF00FF',
  SHOWER: '#0000FF',
  SNOW: '#FFFFFF',
  STORM: '#FF0000',
  SUNNY: '#FFFF00'
})

const Units = Object.freeze({
  metric: 'metric',
  imperial: 'imperial'
});

/**
 * Loads the weather cities from an installed text file
 */
async function loadCities() {
  logger.info(`Retrieving cities...`);

  return new Promise((resolve, reject) => {
    const lines = [];

    const reader = readline.createInterface({
      input: fs.createReadStream('cities.txt'),
      crlfDelay: Infinity
    });

    reader.on('line', (line) => {
      lines.push(line);
    });

    reader.on('close', () => {
      // the first line is a header
      resolve(lines.slice(1));
    });

    reader.on('error', error => {
      reject(error);
    })
  })
}

/**
 * Process a list of zones into a list of options
 * @param {Array<*>} lines 
 */
function processCities(lines) {
  const options = [];
  for (line of lines) {
    const values = line.split("\t");
    const url = values[17].trim() || values[16].trim() || values[15].trim();
    const urlParts = url.split('//')[1].split('/');
    options.push({
      key: url,
      value: `${values[3]}, ${urlParts[3]} (${values[10]})`,
    })
  }

  return options;
}

/**
 * Retrieve forecast XML from the service
 * @param {String} forecastUrl 
 */
async function retrieveForecast(forecastUrl) {
  logger.info("Getting forecast via URL: " + forecastUrl);
  return request.get({
    url: forecastUrl,
    json: false
  }).then(async body => {
    return new Promise((resolve, reject) => {
      parseString(body, function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  });
}

/**
 * Represents a single forecast period within a day
 */
class Period {
  constructor({
    from,
    to,
    number,
    symbol = {},
    precipitation = {},
    windDirection = {},
    windSpeed = {},
    temperature = {},
    pressure = {}
  }) {

    this.from = from;
    this.to = to;
    this.number = number;

    this.symbol = symbol;
    this.precipitation = precipitation;
    this.windDirection = windDirection;
    this.windSpeed = windSpeed;
    this.temperature = temperature;
    this.pressure = pressure;
  }
}

Period.revive = function (json) {
  const meta = json['$'];
  return new Period({
    from: meta.from,
    to: meta.to,
    number: meta.period,

    symbol: json.symbol[0]['$'],
    precipitation: json.precipitation[0]['$'],
    windDirection: json.windDirection[0]['$'],
    windSpeed: json.windSpeed[0]['$'],
    temperature: json.temperature[0]['$'],
    pressure: json.pressure[0]['$'],
  });
}

/**
 * Represents a day's worth of forecasts
 */
class Day {
  constructor(date, periods) {
    this.date = date;
    this.periods = periods;
  }
}

/**
 * Process raw JSON forecast data into Days and Periods
 * @param {String} data 
 */
function processForecast(data) {
  const periods = data.weatherdata.forecast[0].tabular[0].time;
  const days = [];
  let currentDate = '';
  let thisDay = null;
  for (periodJson of periods) {
    let period = Period.revive(periodJson);
    let thisDate = period.from.split('T')[0];
    if (thisDate !== currentDate) {
      currentDate = thisDate;
      if (thisDay) {
        days.push(thisDay);
      }
      thisDay = new Day(thisDate, [period]);
    } else {
      thisDay.periods.push(period);
    }

    if (thisDay && thisDay.length) {
      days.push(thisDay)
    }
  }

  return days;
}

/**
 * Choose the most relevant forecast period within a day.
 * @param {Day} day 
 */
function choosePeriod(day) {
  let periods = [...day.periods];
  // strip the overnight period
  if (periods.length === 4) {
    periods = periods.slice(1);
  }

  // strip the late night period
  if (periods.length > 1) {
    periods = periods.slice(0, periods.length - 1);
  }

  // if only one period, then we return it
  if (periods.length === 1) {
    return periods[0];
  }

  // return the period with more precipitation
  return (periods[0].precipitation.value > periods[1].precipitation.value) ?
    periods[0] : periods[1];
}

const periodNameMap = {
  '0': 'Overnight',
  '1': 'Morning',
  '2': 'Afternoon',
  '3': 'Evening',
}

function generatePeriodText(period, units) {
  const temperature = (units == Units.imperial) ?
    Math.round(period.temperature.value * 1.8 + 32) + '°F' :
    period.temperature.value + '°C';
  return `${periodNameMap[period.number]}: ${period.symbol.name}, ${temperature}`;
}

/**
 * Chooses the appropriate signal color for a period
 * @param {Period} period 
 */
function chooseColor(period) {
  const text = period.symbol.name.toLowerCase();
  if (text.includes('snow')) {
    return Colors.SNOW;
  } else if (text.includes('storm')) {
    return Colors.STORM;
  } else if (text.includes('rain') || text.includes('shower')) {
    return Colors.SHOWER;
  } else if (text.includes('cloud')) {
    return Colors.CLOUDY;
  } else {
    return Colors.CLEAR;
  }
}

class WeatherForecast extends q.DesktopApp {
  constructor() {
    super();
    this.cityName = null;
  }

  async applyConfig() {}

  async options() {
    return loadCities().then(cities => {
      return processCities(cities)
    }).catch(error => {
      logger.error(error);
      return [];
    });
  }

  /**
   * Generate a signal from a forecast day
   * @param {Array<Day>} days
   */
  generateSignal(days) {
    days = days.slice(0, this.getWidth());
    const messages = [];

    for (let day of days) {
      messages.push(moment(day.date).format('dddd, MMMM Do'));
      for (let period of day.periods) {
        messages.push(generatePeriodText(period, this.config.units));
      }
      messages.push("\n");
    }

    const signal = new q.Signal({
      points: [
        days.map(day => {
          return new q.Point(chooseColor(choosePeriod(day)))
        })
      ],
      name: `Forecast for ${this.config.cityId_LABEL}`,
      message: messages.join("\n"),
    });

    return signal;
  }

  async run() {
    logger.info("Running.");
    const forecastUrl = this.config.cityId;
    const cityName = this.config.cityId_LABEL || this.config.cityId;

    if (forecastUrl) {
      logger.info("My forecast URL is  : " + forecastUrl);
      logger.info("My city name is: " + cityName);

      return retrieveForecast(forecastUrl)
        .then(body => {
          return processForecast(body);
        })
        .then(days => {
          return this.generateSignal(days);
        })
    } else {
      logger.info("No cityId configured.");
      return null;
    }
  }
}


module.exports = {
  Colors: Colors,
  Units: Units,

  Day: Day,
  Period: Period,
  WeatherForecast: WeatherForecast,

  chooseColor: chooseColor,
  choosePeriod: choosePeriod,
  generatePeriodText: generatePeriodText,
  loadCities: loadCities,
  processCities: processCities,
  processForecast: processForecast,
  retrieveForecast: retrieveForecast,
}

const applet = new WeatherForecast();