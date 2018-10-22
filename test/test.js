const assert = require('assert');
const t = require('../index');
const zoneId = 'TXZ211';

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
    assert.ok(!result.storm, "False positive on snow.");
  });
  it('can evaluate sunny', function () {
    let result = t.evaluateForecast('Sunny, with a high near 81.');
    assert.ok(result.sunny, "Did not detect sunny.");
    assert.ok(!result.snow, "False positive on snow.");
    assert.ok(!result.storm, "False positive on snow.");
  });
  it('can evaluate sunny', function () {
    let result = t.evaluateForecast('Clear, with a low around 57.');
    assert.ok(result.clear, "Did not detect clear.");
    assert.ok(!result.sunny, "False positive sunny.");
    assert.ok(!result.snow, "False positive on snow.");
    assert.ok(!result.storm, "False positive on snow.");
  });
});

describe('getForecast', function () {
  it('can get a forecast', function () {
    t.getForecast(zoneId).then((periods) => {
      assert.ok(periods, "Did not get valid periods.");
      assert(periods.length > 10, "Did not get enough periods.");
    });
  });

})

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
  let app = new t.WeatherForecast();
  app.config = {
    zoneId: zoneId,
    geometry: {
      width: 4,
      height: 1,
    }
  };
  it('can run', function () {
    app.run().then((signal) => {
      console.log(signal);
      assert.ok(signal);
    });
  })
})