"use strict";

const argv = require('minimist')(process.argv.slice(2));
const user = argv.user ? argv.user : null;

let count = 0;

require("../init_mini.js").init(function() {
	let txn = global.database.env.beginTxn({readOnly: true});
	let cursor = new global.database.lmdb.Cursor(txn, global.database.cacheDB);
	for (let found = cursor.goToFirst(); found; found = cursor.goToNext()) {
        	cursor.getCurrentString(function(key, data){  // jshint ignore:line
			if (user && !key.includes(user)) return;
			if (key.length < 95) { // min XMR address length
				console.log("Skipping " + key + " key");
				return;
			}
			if (key.includes("identifiers:") || !key.includes("_")) return;

			//let txn2 = global.database.env.beginTxn();
			if (key.includes("history:") || key.includes("stats:")) {
				let parts = key.split(/:(.+)/);
				let key2 = parts[1];
				if (!global.database.getCache(key2)) {
					console.log(key + ": found orphan key");
					//txn2.del(global.database.cacheDB, key);
					++ count;
				}
			} else {
				let stats = global.database.getCache("stats:" + key);
				if (!stats) {
					console.log(key + ": found key without stats");
					return;
				}
				if (!global.database.getCache("history:" + key)) {
					console.log(key + ": found key without history");
					return;
				}
				if (Date.now() - stats.lastHash > 7*24*60*60*1000) {
					console.log(key + ": found outdated key");
					//txn2.del(global.database.cacheDB, key);
					//txn2.del(global.database.cacheDB, "history:" + key);
					//txn2.del(global.database.cacheDB, "stats:" + key);
					++ count;
				}
				
			}
		        //txn2.commit();
		});
	}

	console.log("Deleted items: " + count);

	for (let found = cursor.goToFirst(); found; found = cursor.goToNext()) {
        	cursor.getCurrentString(function(key, data){  // jshint ignore:line
			if (user && !key.includes(user)) return;
			if (key.length < 95) { // min XMR address length
				console.log("Skipping " + key + " key");
				return;
			}
			if (!key.includes("identifiers:")) return;

			let parts = key.split(/:(.+)/);
			let key2 = parts[1];

                        try {
	                	let data2 = JSON.parse(data);
				let isAlive = false;
				for (let i in data2) {
					let stats = global.database.getCache("stats:" + key2 + "_" + data2[i]);
					if (stats && Date.now() - stats.lastHash > 24*60*60*1000) isAlive = true;
				}
				if (!isAlive) {
					data2 = [];
					console.log(key + ": found dead key");
					//let txn2 = global.database.env.beginTxn();
					//txn2.putString(global.database.cacheDB, key, JSON.stringify(data2));
					//txn2.commit();
				}
			} catch (e) {
				console.error("Bad cache data with " + key + " key");
			}
		});
	}
	cursor.close();
        txn.commit();
	process.exit(0);
});
