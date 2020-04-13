// Cloudflare
var cfConfig = {key: 'KEY HERE', email: 'ACCOUNT EMAIL'};

// Local Railgun

var rgConfig = [];
//rgConfig.push({ ipAddress: 'RG INSTANCE IP', port: 24088, name: 'rg1' });
//rgConfig.push({ ipAddress: 'RG INSTANCE IP', port: 24088, name: 'rg2' });


// NewRelic Plugin Configuration
var newRelicConfig = {host: 'rocky.mobilenations.com', licenseKey: '***REMOVED***'};

//npm install cloudflare4

//-----------------------------
// Nothing to configure below
//-----------------------------

"use strict"

var async = require('async');
var request = require('request');
var util = require('util');
var CloudFlareAPI = require('cloudflare4');

var cfApi = new CloudFlareAPI({
  email: cfConfig.email,
  key: cfConfig.key,
  autoPagination: true,
  autoPaginationConcurrency: 5
});

// Interal Data
var cfData = {};
cfData['zones'] = {};
cfData['newData'] = {};
cfData['summary'] = {};

var parsedMetrics = {};

start();

// Connect to Pool Masters
function start() {

  // On startup, fetch and post
  getZoneIDs(function () {
    if (rgConfig.length > 0) {
      getRailgun();
    }
    getAnalytics(function () {
      newrelicPost();

    });
  });


  // Setup intervals.
  // Every 60 minutes update getZoneIDs
  setInterval(function () {
    getZoneIDs(function () {
    });
  }, (1000 * 60 * 60));

  // Every minute getXenMetrics, followed by newrelicPost 30s later
  // We execute newrelicPost seperate from getAnalytics
  setInterval(function () {

    if (rgConfig.length > 0) {
      getRailgun();
    }

    getAnalytics(function () {
    });

    setTimeout(function () {
      newrelicPost();
    }, (1000 * 30)); //30

  }, (1000 * 60)); //60


}


function getZoneIDs(callback) {
  console.log("getZoneIDs()");

  var parameters = [];
  parameters.status = 'active';

  cfApi.zoneGetAll(parameters).then(function (zones) {

    for (var i = 0; i < zones.length; i++) {
      if (zones[i].plan.name == "Enterprise Website") {
        var zone = {id: zones[i].id, name: zones[i].name, untiltime: 0};
        cfData['zones'][zone.id] = {};
        cfData['zones'][zone.id] = zone;
      }
    }
    callback();
  }).catch(function (error) {
    console.error(error);
    callback();
  });
}


function getAnalytics(callback) {
  console.log("getAnalytics()");

  cfData['summary'] = [];
  cfData['summary']['requests'] = 0;
  cfData['summary']['requests_cached'] = 0;
  cfData['summary']['requests_uncached'] = 0;
  cfData['summary']['bandwidth'] = 0;
  cfData['summary']['bandwidth_cached'] = 0;
  cfData['summary']['bandwidth_uncached'] = 0;
  cfData['summary']['threats'] = 0;
  cfData['summary']['pageviews'] = 0;
  cfData['summary']['pageviews_googlebot'] = 0;
  cfData['summary']['ssl_encrypted'] = 0;
  cfData['summary']['ssl_unencrypted'] = 0;

  async.each(Object.keys(cfData['zones']), function (zoneid, callback) {
    var zone = cfData['zones'][zoneid];

    var parameters = [];
    parameters.continuous = true;
    parameters.since = -30;

    cfApi.zoneAnalyticsDashboardGet(zone.id, parameters).then(function (analytics) {

      var dataset = analytics.timeseries[analytics.timeseries.length - 1];
      var untiltime = Math.floor(Date.parse(dataset.until) / 1000);

      var metric_id;

      //console.log(dataset);

      // Requests
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Requests/total[Requests/second]';
      parsedMetrics[metric_id] = round(dataset['requests']['all'] / 60);
      cfData['summary']['requests'] += parsedMetrics[metric_id];
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Requests/cached[Requests/second]';
      parsedMetrics[metric_id] = round(dataset['requests']['cached'] / 60)
      cfData['summary']['requests_cached'] += parsedMetrics[metric_id]
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Requests/uncached[Requests/second]';
      parsedMetrics[metric_id] = round(dataset['requests']['uncached'] / 60);
      cfData['summary']['requests_uncached'] += parsedMetrics[metric_id];

      // (For Cache-Only graph)
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Cache/Requests/cached[Requests/second]';
      parsedMetrics[metric_id] = round(dataset['requests']['cached'] / 60);
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Cache/Requests/uncached[Requests/second]';
      parsedMetrics[metric_id] = round(dataset['requests']['uncached'] / 60);
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Cache_Ratio/requests[%]';
      parsedMetrics[metric_id] = round((dataset['requests']['cached'] / 60) / (dataset['requests']['all'] / 60)) * 100;

      // Bandwidth
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Bandwidth/total[Bits/second]';
      parsedMetrics[metric_id] = round(dataset['bandwidth']['all'] / 60 * 8);
      cfData['summary']['bandwidth'] += parsedMetrics[metric_id];
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Bandwidth/cached[Bits/second]';
      parsedMetrics[metric_id] = round(dataset['bandwidth']['cached'] / 60 * 8);
      cfData['summary']['bandwidth_cached'] += parsedMetrics[metric_id];
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Bandwidth/uncached[Bits/second]';
      parsedMetrics[metric_id] = round(dataset['bandwidth']['uncached'] / 60 * 8);
      cfData['summary']['bandwidth_uncached'] += parsedMetrics[metric_id];

      // (For Cache-Only graph)
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Cache/Bandwidth/cached[Bits/second]';
      parsedMetrics[metric_id] = round(dataset['bandwidth']['cached'] / 60 * 8);
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Cache/Bandwidth/uncached[Bits/second]';
      parsedMetrics[metric_id] = round(dataset['bandwidth']['uncached'] / 60 * 8);
      metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Cache_Ratio/bandwidth[%]';
      parsedMetrics[metric_id] = round((dataset['bandwidth']['cached'] / 60) / (dataset['bandwidth']['all'] / 60)) * 100;

      // Threats
      if (dataset['threats']) {
        metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Threats/total[Requests/second]';
        parsedMetrics[metric_id] = round(dataset['threats']['all'] / 60);
        cfData['summary']['threats'] += parsedMetrics[metric_id];
      }

      // Pageviews
      if (dataset['pageviews']) {
        metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Pageviews/total[Requests/second]';
        parsedMetrics[metric_id] = round(dataset['pageviews']['all'] / 60);
        cfData['summary']['pageviews'] += parsedMetrics[metric_id];

        try {
          if (dataset['pageviews']['search_engine']['googlebot']) {
            metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/Pageviews/google[Requests/second]';
            parsedMetrics[metric_id] = round(dataset['pageviews']['search_engine']['googlebot'] / 60);
            cfData['summary']['pageviews_googlebot'] += parsedMetrics[metric_id];
          }
        } catch (err) {

        }
      }

      // SSL
      if (dataset['requests']['ssl']) {
        metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/SSL/encrypted[Requests/second]';
        parsedMetrics[metric_id] = round(dataset['requests']['ssl']['encrypted'] / 60);
        cfData['summary']['ssl_encrypted'] += parsedMetrics[metric_id];
        metric_id = 'Component/Cloudflare/bySite/' + cfData['zones'][zone.id].name + '/SSL/unencrypted[Requests/second]';
        parsedMetrics[metric_id] = round(dataset['requests']['ssl']['unencrypted'] / 60);
        cfData['summary']['ssl_unencrypted'] += parsedMetrics[metric_id];
      }

      callback(); // complete!
    }).catch(function (error) {
      console.error(zone, error);
    });

  }, function (err) {
    if (err) {
      console.log(err); // One of the iterations produced an error.
    } else {

      // Summary
      var metric_id;
      metric_id = 'Component/Cloudflare_Summary/Requests/total[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests']);
      metric_id = 'Component/Cloudflare_Summary/Requests/cached[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests_cached']);
      metric_id = 'Component/Cloudflare_Summary/Requests/uncached[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests_uncached']);

      metric_id = 'Component/Cloudflare_Summary/Bandwidth/total[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth']);
      metric_id = 'Component/Cloudflare_Summary/Bandwidth/cached[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth_cached']);
      metric_id = 'Component/Cloudflare_Summary/Bandwidth/uncached[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth_uncached']);

      metric_id = 'Component/Cloudflare_Summary/Threats/threats[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['threats']);

      metric_id = 'Component/Cloudflare_Summary/Pageviews/pageviews[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['pageviews']);
      metric_id = 'Component/Cloudflare_Summary/Pageviews/pageviews_google[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['pageviews_googlebot']);

      metric_id = 'Component/Cloudflare_Summary/SSL/ssl_encrypted[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['ssl_encrypted'])
      metric_id = 'Component/Cloudflare_Summary/SSL/ssl_unencrypted[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['ssl_unencrypted'])


      // Duplicates for Graphing purposes
      metric_id = 'Component/Cloudflare_Summary/Origin/Bandwidth/bandwidth[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth_uncached']);
      metric_id = 'Component/Cloudflare_Summary/Origin/Requests/requests[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests_uncached']);

      metric_id = 'Component/Cloudflare_Summary/Cache/Bandwidth/cached[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth_cached']);
      metric_id = 'Component/Cloudflare_Summary/Cache/Bandwidth/uncached[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth_uncached']);

      metric_id = 'Component/Cloudflare_Summary/Cache/Requests/cached[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests_cached']);
      metric_id = 'Component/Cloudflare_Summary/Cache/Requests/uncached[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests_uncached']);

      metric_id = 'Component/Cloudflare/Railgun/rgvsuncached/origin_bandwidth[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['bandwidth_uncached']);
      metric_id = 'Component/Cloudflare/Railgun/rgvsuncached_req/origin_requests[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary']['requests_uncached']);

      callback();

    }
  });
}


function getRailgun() {

  cfData['summary_rg'] = [];
  cfData['summary_rg']['bandwidth'] = 0;
  cfData['summary_rg']['requests'] = 0;

  async.each(rgConfig, function (rg, callback) {

    var url = "http://" + rg.ipAddress + ":" + rg.port;
    request({url: url, json: true}, function (err, response, dataset) {
      if (!err && response.statusCode == 200) {

        var metric_id;

        metric_id = 'Component/Cloudflare/Railgun/wanbps/' + rg.name + '_bandwidth[Bits/second]';
        parsedMetrics[metric_id] = round(dataset['wan_bytes_sent'] / 60 * 8);
        cfData['summary_rg']['bandwidth'] += parsedMetrics[metric_id];

        metric_id = 'Component/Cloudflare/Railgun/http_requests/' + rg.name + '_requests[Requests/second]';
        parsedMetrics[metric_id] = round(dataset['requests_started'] / 60);
        cfData['summary_rg']['requests'] += parsedMetrics[metric_id];

        metric_id = 'Component/Cloudflare/Railgun/compression/' + rg.name + '_compression[%]';
        parsedMetrics[metric_id] = round((10000 - dataset['delta_compression_ratio']) / 100);

        metric_id = 'Component/Cloudflare/Railgun/uncompressed/' + rg.name + '_uncompressed_chunks[Units]';
        parsedMetrics[metric_id] = round(dataset['uncompressed_chunks'] / 60);

        callback();

      } else {
        callback(err);
      }
    });

  }, function (err) {
    if (err) {
      console.log(err); // One of the iterations produced an error.
    } else {

      // Summary
      var metric_id;
      metric_id = 'Component/Cloudflare_Summary/Bandwidth/railgun[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary_rg']['bandwidth']);

      metric_id = 'Component/Cloudflare_Summary/Origin/Bandwidth/railgun[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary_rg']['bandwidth']);

      // Railgun (RG vs Uncached Bandwidth)
      metric_id = 'Component/Cloudflare/Railgun/rgvsuncached/rg_bandwidth[Bits/second]';
      parsedMetrics[metric_id] = round(cfData['summary_rg']['bandwidth']);

      // Railgun (RG vs Uncached Requests)
      metric_id = 'Component/Cloudflare/Railgun/rgvsuncached_req/rg_requests[Requests/second]';
      parsedMetrics[metric_id] = round(cfData['summary_rg']['requests']);

    }
  });

}


function newrelicPost() {
  console.log("newrelicPost()");

  var data = {};
  data['agent'] = {};
  data['components'] = [];

  data['agent']['host'] = newRelicConfig.host;
  data['agent']['version'] = '1.0.1';

  var component = {};
  component.name = 'Summary';
  component.guid = 'com.mobilenations.cloudflare';
  component.duration = 60;
  component.metrics = parsedMetrics;
  data['components'].push(component);

  //console.log(util.inspect(data, false, null));

  request({
    url: 'https://platform-api.newrelic.com/platform/v1/metrics',
    method: 'POST',
    json: data,
    headers: {
      'X-License-Key': newRelicConfig.licenseKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
  }, function (error, response, body) {
    if (error) {
      console.log(error);
    } else {
      console.log(response.statusCode, body);
    }
  });

}


// Helper JS
function toObject(names, values) {
  var result = {};
  for (var i = 0; i < names.length; i++)
    result[names[i]] = values[i];
  return result;
}

function average(input) {
  var total = 0;
  for (var i = 0; i < input.length; i++) {
    total += input[i];
  }
  var avg = total / input.length;
  avg = Math.round(avg * 100) / 100;
  return avg;
}

function sum(input) {
  var total = 0;
  for (var i = 0; i < input.length; i++) {
    total += input[i];
  }
  total = Math.round(total * 100) / 100;
  return total;
}

function round(input) {
  input = Math.round(input * 100) / 100;
  return input;
}

function inArray(needle, haystack) {
  var length = haystack.length;
  for (var i = 0; i < length; i++) {
    if (haystack[i] == needle) return true;
  }
  return false;
}

function now() {
  var d = new Date();
  return Math.floor(d.getTime() / 1000);
}

function nowMinute() {
  var d = new Date();
  var s = d.getSeconds();
  return Math.floor(d.getTime() / 1000) - s;
}

function nextSpan(span) {
  var d = new Date();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var base = Math.floor(d.getTime() / 1000) - (m * 60) - s;

  var offset;
  if (span == 15) {
    if (m < 15) {
      offset = 15;
    } else if (m < 30) {
      offset = 30;
    } else if (m <= 45) {
      offset = 45;
    } else {
      offset = 60;
    }
  } else if (span == 60) {
    offset = 60;
  } else {
    offset = m + 1;
  }

  base = base + (offset * 60);

  return base;
}

