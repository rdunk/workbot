var CronJob = require('cron').CronJob;
var _ = require('lodash');

module.exports = function() {
	var module = {};

	module.defaults = {
		cronTime: '00 00 09 * * 1-5',
		onTick: false,
		start: true,
		timeZone: 'Europe/London'
	};

	module.createJob = function(opts){
		var options = _.defaults(opts || {}, module.defaults);
		return new CronJob(options);
	};

	return module;
};