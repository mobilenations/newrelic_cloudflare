# Cloudflare Plugin for Newrelic

Fetches metrics from Cloudflare and aggregates the data, providing one dashboard that covers multiple Cloudflare sites.
The code currently only supports Cloudflare Enterprise plans, as that is the only plan level that offers per-minute reporting.
Can also collect performance data from local RailGun servers.

- Total Bandwidth Mbps  (Total, Cached, Uncached, Railgun)
- Total Requests/s (Total, Cached, Uncached)
- Bandwidth and Requests by Site
- Cache Ratio
- Origin bandwidth and requests
- Pageviews and Googlebot request
- Threats
- Origin vs Railgun Bandwidth
- Railgun Compression
- Railgun WAN Mpbs

## Requirements

- Node.js (version 8 or 9) & npm
- Cloudflare Enterprise account

## Installation

- Install [Node.js](https://nodejs.org/en/download/) and npm.  Note: only node version 8.x and 9.x have been tested to work.
- Download plugin: `git clone git@github.com:mobilenations/newrelic_cloudflare.git`
- Inside the plugin directory, install the dependencies:
    - `npm install`
    
## Configuration

Configure by updating the `config/default.json` with the appropirate credentials.  You will need:

1. The Cloudflare API email and key.  You can get this from your Cloudflare enterprise account (REQUIRED).
```json
"cf": {
  "key": "CF_KEY",  // Cloudflare Key
  "email" : "CF_EMAIL"  // Cloudflare Email
}
```

2. The NewRelic Agent Credentials.  The metrics get posted to this [endpoint](https://docs.newrelic.com/docs/plugins/plugin-developer-resources/developer-reference/metric-data-plugin-api).  You will need to supply your NR license key and the hostname of the server where this plugin is running. (REQUIRED)
```json
"nr_agent": {
  "host": "NR_HOST",  // Hostname of server running the plugin
  "key": "NR_KEY"   // License key for NewRelic API
},
```

3.  If you have railgun servers, then you can supply the info for these and these will be monitored as well.  If not, then leave the array empty.  
`"railgun": []`

## Deamonizing

We use [PM2](http://pm2.keymetrics.io) as a node process manager, which enables node.js script to run forever,
gather logs, and to run at boot. PM2 assigns each process an ID, so the first (and only) process will be ID 0.

```
npm install pm2@latest -g  
pm2 start cloudflare_monitor.js

pm2 stop 0  
pm2 restart 0  
pm2 reload 0
```

To check if the script is configured and running properly, `pm2 status 0`
To start at boot: `pm2 startup`, followed by `pm2 save`.

## License

As-Is. Use at your own risk etc.


## Support

Report issues on [GitHub Issues tracker](https://github.com/mobilenations/newrelic_railgun/issues)