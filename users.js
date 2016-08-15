var _ = require('lodash');

module.exports = function(controller) {
	var module = {};

	module.getAll = function(cb) {
		controller.storage.users.all(function(err, users) {
			cb(users);
		});
	};

	return module;
}