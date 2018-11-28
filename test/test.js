const assert = require('assert');
const t = require('../index');
const forecastUrl = 'http://www.yr.no/place/Andorra/Encamp/Vila/forecast.xml';
const cityName = 'Austin, Texas (USA)';

describe('loadCities', function () {
  it('returns an array of lines', async function () {
    this.timeout(1000);
    return t.loadCities().then(lines => {
      assert.ok(lines);
      console.log(`I have ${lines.length} lines.`);
      assert(lines.length > 1000);
    });
  });
});


describe('processCities', function () {
  it('processes the cities', async function () {
    this.timeout(1000);
    return t.loadCities().then(lines => {
      const options = t.processCities(lines);
      assert.ok(options);
      assert(options.length > 1000);
      assert.strictEqual(options[0].key, 'http://www.yr.no/place/Andorra/Encamp/Vila/forecast.xml');
      assert.strictEqual(options[0].value, 'Vila, Encamp (Andorra)');

    });
  });
});

describe('retrieveForecast', function () {
  it('retrieves a forecast', async function () {
    return t.retrieveForecast(forecastUrl).then(data => {
      assert.ok(data);
      assert.ok(data.weatherdata.forecast);
      assert(Array.isArray(data.weatherdata.forecast));
      assert(Array.isArray(data.weatherdata.forecast[0].tabular));
      assert.ok(data.weatherdata.forecast[0].tabular[0].time);
      const period = data.weatherdata.forecast[0].tabular[0].time[0];
      assert.ok(period);
    })
  })
})

const testPeriodJson = {
  "$": {
    "from": "2018-11-28T21:00:00",
    "to": "2018-11-29T00:00:00",
    "period": "3"
  },
  "symbol": [{
    "$": {
      "number": "3",
      "numberEx": "3",
      "name": "Partly cloudy",
      "var": "03n"
    }
  }],
  "precipitation": [{
    "$": {
      "value": "0"
    }
  }],
  "windDirection": [{
    "$": {
      "deg": "356.3",
      "code": "N",
      "name": "North"
    }
  }],
  "windSpeed": [{
    "$": {
      "mps": "0.6",
      "name": "Light air"
    }
  }],
  "temperature": [{
    "$": {
      "unit": "celsius",
      "value": "7"
    }
  }],
  "pressure": [{
    "$": {
      "unit": "hPa",
      "value": "1021.4"
    }
  }]
}

describe('Period', function () {
  it('revive(json)', function () {
    const period = t.Period.revive(testPeriodJson);
    assert.ok(period);
    assert.ok(period.from);
    assert.ok(period.to);
    assert.ok(period.number);
    assert.ok(period.symbol);
    assert.ok(period.precipitation);
    assert.ok(period.temperature);
  })
});

describe('processForecast', function () {
  it('processes a forecast JSON', async function () {
    return t.retrieveForecast(forecastUrl).then(data => {
      const days = t.processForecast(data);
      assert.ok(days);
      assert(days.length > 1);
      for (day of days) {
        assert(day instanceof t.Day);
        assert(day.date);
        assert(day.periods);
        assert(day.periods.length);
      }
    });
  });
});

describe('chooseColor', function () {
  it('picks snow', function () {
    assert.equal(t.Colors.SNOW, t.chooseColor(new t.Period({
      symbol: {
        name: 'Snow'
      }
    })));
  });
  it('picks storm', function () {
    assert.equal(t.Colors.STORM, t.chooseColor(new t.Period({
      symbol: {
        name: 'Stormy and Windy'
      }
    })));
  });
  it('picks rain', function () {
    assert.equal(t.Colors.SHOWER, t.chooseColor(new t.Period({
      symbol: {
        name: 'Rain'
      }
    })));
  });
  it('picks clouds', function () {
    assert.equal(t.Colors.CLOUDY, t.chooseColor(new t.Period({
      symbol: {
        name: 'Cloudy and warm'
      }
    })));
  });
  it('picks clear', function () {
    assert.equal(t.Colors.CLEAR, t.chooseColor(new t.Period({
      symbol: {
        name: 'Clear'
      }
    })));
  });
});


describe('choosePeriod', function () {
  it('picks the only period', function () {
    const period = new t.Period({
      from: 'foo'
    });
    const day = new t.Day('foo', [period]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period.from, test.from)
  });

  it('picks the first of two periods', function () {
    const period1 = new t.Period({
      from: 'foo'
    });

    const period2 = new t.Period({
      from: 'bar'
    });

    const day = new t.Day('foo', [period1, period2]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period1.from, test.from)
  });

  it('picks the rainiest of three periods', function () {
    const period1 = new t.Period({
      precipitation: {
        value: '2.4'
      }
    });

    const period2 = new t.Period({
      precipitation: {
        value: '4.4'
      }
    });

    const period3 = new t.Period({
      precipitation: {
        value: '4.9'
      }
    });

    const day = new t.Day('foo', [period1, period2, period3]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period2.precipitation.value, test.precipitation.value);
  });

  it('picks the rainiest of four periods', function () {
    const period0 = new t.Period({
      precipitation: {
        value: '1.4'
      }
    });

    const period1 = new t.Period({
      precipitation: {
        value: '6.4'
      }
    });

    const period2 = new t.Period({
      precipitation: {
        value: '4.4'
      }
    });

    const period3 = new t.Period({
      precipitation: {
        value: '4.9'
      }
    });

    const day = new t.Day('foo', [period0, period1, period2, period3]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period1.precipitation.value, test.precipitation.value);
  });
});

describe('generatePeriodText', function () {
  it('generates overnight text', function () {
    const text = t.generatePeriodText(new t.Period({
      number: 0,
      symbol: {
        name: 'Cloudy'
      },
      temperature: {
        unit: 'celsius',
        value: '8'
      }
    }))

    console.info(text);
    assert.equal('Overnight: Cloudy, 8°C', text);
  });

  it('generates morning text', function () {
    const text = t.generatePeriodText(new t.Period({
      number: 1,
      symbol: {
        name: 'Cloudy'
      },
      temperature: {
        unit: 'celsius',
        value: '8'
      }
    }), t.Units.imperial);

    console.info(text);
    assert.equal('Morning: Cloudy, 46°F', text);
  });

  it('generates afternoon text', function () {
    const text = t.generatePeriodText(new t.Period({
      number: 2,
      symbol: {
        name: 'Cloudy'
      },
      temperature: {
        unit: 'celsius',
        value: '8'
      }
    }))

    console.info(text);
    assert.equal('Afternoon: Cloudy, 8°C', text);
  });

  it('generates evening text', function () {
    const text = t.generatePeriodText(new t.Period({
      number: 3,
      symbol: {
        name: 'Cloudy'
      },
      temperature: {
        unit: 'celsius',
        value: '8'
      }
    }), t.Units.imperial);

    console.info(text);
    assert.equal('Evening: Cloudy, 46°F', text);
  });
});


describe('WeatherForecast', function () {

  const days = [
    new t.Day('2018-11-30', [
      new t.Period({
        number: 0,
        symbol: {
          name: 'Rain'
        },
        temperature: {
          unit: 'celsius',
          value: '8'
        }
      }),
      new t.Period({
        number: 1,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '9'
        }
      }),
      new t.Period({
        number: 2,
        symbol: {
          name: 'Sunny'
        },
        temperature: {
          unit: 'celsius',
          value: '10'
        }
      }),
      new t.Period({
        number: 3,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '11'
        }
      })
    ]),
    new t.Day('2018-12-01', [
      new t.Period({
        number: 0,
        symbol: {
          name: 'Rain'
        },
        temperature: {
          unit: 'celsius',
          value: '8'
        }
      }),
      new t.Period({
        number: 1,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '9'
        }
      }),
      new t.Period({
        number: 2,
        symbol: {
          name: 'Sunny'
        },
        temperature: {
          unit: 'celsius',
          value: '10'
        }
      }),
      new t.Period({
        number: 3,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '11'
        }
      })
    ]),
    new t.Day('2018-12-02', [
      new t.Period({
        number: 0,
        symbol: {
          name: 'Rain'
        },
        temperature: {
          unit: 'celsius',
          value: '8'
        }
      }),
      new t.Period({
        number: 1,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '9'
        }
      }),
      new t.Period({
        number: 2,
        symbol: {
          name: 'Sunny'
        },
        temperature: {
          unit: 'celsius',
          value: '10'
        }
      }),
      new t.Period({
        number: 3,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '11'
        }
      })
    ]),
    new t.Day('2018-12-03', [
      new t.Period({
        number: 0,
        symbol: {
          name: 'Rain'
        },
        temperature: {
          unit: 'celsius',
          value: '8'
        }
      }),
      new t.Period({
        number: 1,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '9'
        }
      }),
      new t.Period({
        number: 2,
        symbol: {
          name: 'Sunny'
        },
        temperature: {
          unit: 'celsius',
          value: '10'
        }
      }),
      new t.Period({
        number: 3,
        symbol: {
          name: 'Cloudy'
        },
        temperature: {
          unit: 'celsius',
          value: '11'
        }
      })
    ])
  ];

  it('#generateSignal(days)', function () {
    const app = buildApp();
    const signal = app.generateSignal(days);

    assert(signal);
    assert(signal.name.includes('Forecast for'));
    assert(signal.message.includes("\nOvernight: Rain, 8°C\n"));
    assert(signal.message.includes("\Morning: Cloudy, 9°C\n"));
    assert(signal.message.includes("\nAfternoon: Sunny, 10°C\n"));
    assert(signal.message.includes("\nEvening: Cloudy, 11°C"));

  });

  it('#generateSignal(days) with imperial units', function () {
    const app = buildApp();
    app.config.units = t.Units.imperial;
    const signal = app.generateSignal(days);
    assert(signal);
    assert(signal.name.includes('Forecast for'));
    assert(signal.message.includes("\nOvernight: Rain, 46°F\n"));
    assert(signal.message.includes("\Morning: Cloudy, 48°F\n"));
    assert(signal.message.includes("\nAfternoon: Sunny, 50°F\n"));
    assert(signal.message.includes("\nEvening: Cloudy, 52°F"));

  });

  it('#run()', function () {
    const app = buildApp();    
    return app.run().then((signal) => {
      console.log(JSON.stringify(signal));
      assert.ok(signal);
      assert(signal.name.includes('Forecast for'));
      assert(signal.message.includes('Overnight:'));
    });
  });

  it('#options()', async function () {
    const app = buildApp();
    this.timeout(1000);
    return app.options('zoneId').then(options => {
      assert.ok(options);
      assert(options.length > 1, 'Selections did not have an array of values.');
      const option = options[0];
      assert.ok(option.key);
      assert.ok(option.value);
      assert(option.key.toLowerCase().includes('vila'));
      assert(option.key.toLowerCase().includes('.xml'));
      assert(option.value.toLowerCase().includes('vila'));
    })
  })
})

function buildApp() {
  const app = new t.WeatherForecast();
  app.config = {
    cityId: forecastUrl,
    cityId_LABEL: cityName,
    units: t.Units.metric,
    geometry: {
      width: 4,
      height: 1,
    }
  };

  return app;
}