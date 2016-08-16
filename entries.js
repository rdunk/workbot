var _ = require('lodash');
var moment = require('moment');
var timeFormat = {
	sameDay: '[today]',
	nextDay: '[tomorrow]',
	nextWeek: 'dddd',
	lastDay: '[yesterday]',
	lastWeek: '[last] dddd',
	sameElse: 'dddd Do MMMM'
};

module.exports = function(controller) {
	var module = {};

	module.get = function(id, uid, cb) {
		controller.storage.entries.get(id, function(err, user){
			cb(err, user);
		});
	};

	module.save = function(id, uid, cb) {
		controller.storage.entries.save({id: id, user: uid}, function(err, user){
			cb(err, user);
		});
	};

	module.getAll = function(cb) {
		controller.storage.entries.all(function(err, entries) {
			cb(entries);
		});
	};

	module.list = function(limit, cb) {
		module.getAll(function(entries){
			var total = 0;
			var outputArray = [];
			_.eachRight(entries, function(entry, i) {
				var i = entries.length - i;
				total++;
				outputArray.push({
					user: entry.user,
					time: moment(entry.id,'YYMMDD').calendar(null, timeFormat)
				});
				if (i === limit) {
					return false;
				}
			});
			if (total === 0 ) {
				outputArray.unshift("Nobody has done the dishes yet.");
			} else if (total < limit) {
				outputArray.unshift("I could only find " + total + " dishwashers:");
			} else if (total === 1) {
				outputArray.unshift("The last dishwasher was: ");
			} else {
				outputArray.unshift("The last " + total + " dishwashers were: ");
			}
			cb(outputArray);
		});
	};

	module.getLast = function(cb) {
		module.getAll(function(entries) {
			var entry = _.last(entries);
			var time = moment(entry.id,'YYMMDD').calendar(null, timeFormat);
			cb(entry, time);
		});
	};

	// module.getNext = function(cb) {
	// 	var nextElement = false;
	// 	controller.storage.entries.all(function(err, entries){
	// 		var entry = _.last(entries);
	// 		// var user = entry.user;
	// 		controller.storage.users.all(function(err, users) {
	// 			_.each(users, function(user, index) {
	// 				var nextIndex = index+1;
	// 				if (user.id === entry.user) {
	// 					if (nextIndex > users.length) {
	// 						nextElement = users[0];
	// 					} else {
	// 						nextElement = users[nextIndex];
	// 					}
	// 				}
	// 			});
	// 		});
	// 	});
	// 	return nextElement;
	// };

	module.getEntryTime = function(id) {
		return moment(id,'YYMMDD').calendar(null, {
			sameDay: '[today]',
			nextDay: '[tomorrow]',
			nextWeek: 'dddd',
			lastDay: '[yesterday]',
			lastWeek: '[last] dddd',
			sameElse: 'dddd Do MMMM'
		});
	};

	return module;
}