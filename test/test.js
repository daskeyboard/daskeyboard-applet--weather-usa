const assert = require('assert');
const t = require('../index');
const zoneId = 'TXZ211';
const zoneName = 'Austin, TX';

describe('evaluateForecast', function () {
  it('can evaluate percentage', function () {
    let result = t.evaluateForecast('A 20 percent chance of showers and thunderstorms. Partly cloudy, with a low around 60. East southeast wind 3 to 5 mph.');
    assert.equal(result.percent, 20);
  });
  it('can evaluate showers and thunderstorms', function () {
    let result = t.evaluateForecast('A 40 percent chance of showers and thunderstorms. Partly sunny, with a high near 84. South wind 5 to 7 mph.');
    assert.ok(result.storm, "Did not detect storm.");
    assert.ok(result.shower, "Did not detect shower.");
    assert.ok(!result.snow, "False positive on snow.");
  });
  it('can evaluate cloudy', function () {
    let result = t.evaluateForecast('Cloudy, with a high near 81.');
    assert.ok(result.cloudy, "Did not detect cloudy.");
    assert.ok(!result.snow, "False positive on snow.");
    assert.ok(!result.storm, "False positive on storm.");
  });
  it('can evaluate sunny', function () {
    let result = t.evaluateForecast('Sunny, with a high near 81.');
    assert.ok(result.sunny, "Did not detect sunny.");
    assert.ok(!result.snow, "False positive on snow.");
    assert.ok(!result.storm, "False positive on storm.");
  });
  it('can evaluate sunny', function () {
    let result = t.evaluateForecast('Clear, with a low around 57.');
    assert.ok(result.clear, "Did not detect clear.");
    assert.ok(!result.sunny, "False positive sunny.");
    assert.ok(!result.snow, "False positive on snow.");
    assert.ok(!result.storm, "False positive on storm.");
  });
  it('evaluates rain and percent chance', function () {
    let result = t.evaluateForecast('Showers and isolated thunderstorms. ' +
      'Locally heavy rainfall possible. Cooler. Lows in the upper 450s. ' +
      'North winds 10 to 20 mph. Chance of rain near 100 percent.');

    assert.ok(!result.clear, "False positive clear.");
    assert.ok(!result.sunny, "False positive sunny.");
    assert.ok(!result.snow, "False positive on snow.");
    assert.ok(result.storm, "Did not detect storm.");
    assert.ok(result.shower, "Did not detect shower.");
    assert.ok(result.percent, "Did not detect percent.");
    assert.ok(result.isLikely, "Did not detect likeliness");
  })
});

describe('getForecast', function () {
  it('can get a forecast', function () {
    t.getForecast(zoneId).then((body) => {
      console.log("Got forecast: " + JSON.stringify(body));
      const periods = body.periods;
      assert.ok(periods, "Did not get valid periods.");
      assert(periods.length > 10, "Did not get enough periods.");
    });
  });
})

describe('generateServiceHeaders', function () {
  it('can generate a header object', function () {
    const test = t.generateServiceHeaders();
    assert.ok(test);
  });
  it('generates unique service headers', function () {
    const test1 = t.generateServiceHeaders();
    const test2 = t.generateServiceHeaders();
    console.log("Service headers: " + JSON.stringify(test1));
    console.log("Service headers: " + JSON.stringify(test2));
    assert.notDeepEqual(test1, test2);
  });
});


describe('generateText', function () {
  it('can generate meaningful text', function () {
    const periods = [{
        name: 'Rest of Today',
        detailedForecast: 'Sunny'
      },
      {
        name: 'Tuesday',
        detailedForecast: '10% chance of rain'
      },
      {
        name: 'Wednesday',
        detailedForecast: '90% chance of showers'
      },
      {
        name: 'Thursday',
        detailedForecast: 'Scattered clouds'
      },
    ]
    const text = t.generateText(periods);
    const lines = text.split("\n");
    assert(lines.length == periods.length, "Incorrect number of forecast lines");
  });

  it('can handle line feeds', function () {
    const periods = [{
        name: 'Rest of Today',
        detailedForecast: "Lots\nof\nlines"
      },
      {
        name: 'Tuesday',
        detailedForecast: "Even\nmore\n\n\nlines"
      }
    ];
    const text = t.generateText(periods);
    const lines = text.split("\n");
    assert(lines.length == periods.length, "Incorrect number of forecast lines");
  });

});

describe('Observation', function () {
  it('can prioritize storm', function () {
    let test = new t.Observation({
      storm: true,
      sunny: true,
      percent: t.Observation.LIKELY_THRESHOLD
    });
    assert.equal(test.prioritize(), t.FORECASTS.STORM);
  });
  it('can prioritize shower', function () {
    let test = new t.Observation({
      shower: true,
      sunny: true,
      percent: t.Observation.LIKELY_THRESHOLD
    });
    assert.equal(test.prioritize(), t.FORECASTS.SHOWER);
  });
  it('can prioritize sunny with unlikely shower', function () {
    let test = new t.Observation({
      shower: true,
      sunny: true,
      percent: t.Observation.LIKELY_THRESHOLD - 1
    });
    assert.equal(test.prioritize(), t.FORECASTS.SUNNY);
  });
  it('can prioritize cloudy', function () {
    let test = new t.Observation({
      cloudy: true,
      sunny: true
    });
    assert.equal(test.prioritize(), t.FORECASTS.CLOUDY);
  });
  it('can prioritize sunny', function () {
    let test = new t.Observation({
      sunny: true
    });
    assert.equal(test.prioritize(), t.FORECASTS.SUNNY);
  });
  it('can prioritize clear', function () {
    let test = new t.Observation({
      clear: true
    });
    assert.equal(test.prioritize(), t.FORECASTS.CLEAR);
  });
  it('defaults to clear', function () {
    let test = new t.Observation({});
    assert.equal(test.prioritize(), t.FORECASTS.CLEAR);
  });
});

describe('WeatherForecast', function () {
  it('#run()', async function () {
    return buildApp().then(app => {
      app.run().then((signal) => {
        console.log(JSON.stringify(signal));
        assert.ok(signal);
        assert(signal.message.includes(zoneName));
      });
    })
  });

  it('#options()', async function () {
    return buildApp().then(app => {
      app.options('zoneId').then((options) => {
        assert.ok(options);
        assert(options.length > 1, 'Selections did not have an array of values.');
        assert(options.length > 100, 'Selections did not have enough values.');
        const option = options[0];
        assert.ok(option.key);
        assert.ok(option.value);
      })
    })
  });

  it('#options(fieldId, search)', async function () {
    return buildApp().then(app => {
      app.options('zoneId', 'texas').then((options) => {
        assert.ok(options);
        assert(options.length > 1, 'Selections did not have an array of values.');
        assert(options.length < 100, 'Search did not filter values');

        for (let option of options) {
          assert.ok(option.key);
          assert.ok(option.value);
          assert(option.value.toLowerCase().includes('texas'));
        }
      })
    })
  });

  it('#options(fieldId, search)', async function () {
    return buildApp().then(app => {
      app.options('zoneId', 'New').then((options) => {
        assert.ok(options);
        assert(options.length > 0, 'Selections did not have an array of values.');
        assert(options.length < 100, 'Search did not filter values');

        assert.ok(options.filter(option => {
          return option.value.includes('New York')
        }));
      })
    })
  });

  it('#options(fieldId, search)', async function () {
    return buildApp().then(app => {
      app.options('zoneId', 'new').then((options) => {
        assert.ok(options);
        assert(options.length > 0, 'Selections did not have an array of values.');
        assert(options.length < 100, 'Search did not filter values');

        assert.ok(options.filter(option => {
          return option.value.includes('New York')
        }));
      })
    })
  });
})

async function buildApp() {
  let app = new t.WeatherForecast();
  app.config = {
    zoneId: zoneId,
    zoneId_LABEL: zoneName,
    geometry: {
      width: 4,
      height: 1,
    }
  };

  return app;
}