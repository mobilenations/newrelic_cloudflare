# Description

Cloudflare Plugin for Newrelic
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

----

# Requirements

- Node.JS/NPM
- Cloudflare Enterprise account

----

# Installation

- Install NodeJs and NPM [Download](https://nodejs.org/en/download/package-manager/)
- Download plugin from GitHub and extract
- Inside the plugin directory, install the required npm modules:
    - `npm install async cloudflare4 request`

Configure by changing the following variables in: `cloudflare_monitor.js`

- cfConfig
    - API Key/Email 
  
- rgConfig
    - If you use railgun, enable stats.listen in railgun.conf and set stats.interval = 1
    - Specify each railgun server in rgConfig
    
- newRelicConfig
    - Newrelic license key and host name of the server this script will run it.

We use [PM2](http://pm2.keymetrics.io) as a node process manager, which enables node.js script to run forever,
gather logs, and to run at boot. PM2 assigns each process an ID, so the first (and only) process will be ID 0.

    npm install pm2@latest -g  
    pm2 start cloudflare_monitor.js

    pm2 stop 0  
    pm2 restart 0  
    pm2 reload 0

To check if the script is configured and running properly, `pm2 status 0`
To start at boot: `pm2 startup`, followed by `pm2 save`.

---

# License

As-Is. Use at your own risk etc.

----

# Support

Report issues on [GitHub Issues tracker](https://github.com/mobilenations/newrelic_railgun/issues)

----
