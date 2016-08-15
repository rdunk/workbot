var _ = require('lodash');

module.exports = function(controller){
	var module = {};

	module.userIdFromResponse = function(response){
		return response.text.substr(2, response.text.length-3);
	};
	
	module.getUserFromAPI = function(uid, bot, cb) {
		bot.api.users.info({user: uid}, function(err, response) {
			cb(response);
		});
	};

	module.getChannelFromName = function(name, bot, cb) {
		bot.api.channels.list({}, function(err, response) {
			var channel = _.find(response.channels, { 'name': name });
			cb(channel);
		});
	};

	module.getPrivateChannelFromName = function(name, bot, cb) {
		bot.api.groups.list({}, function(err, response) {
			var channel = _.find(response.groups, { 'name': name });
			cb(channel);
		});
	};

	module.getUserFromDatabase = function(uid, cb) {
		controller.storage.users.get(uid, function(err, user){
			cb(user);
		});
	};

	module.getUsersAsString = function(userArray) {
		return _.chain(userArray).map('id').sortBy().join(", ");
	};

	module.getUsersAsMentions = function(userArray) {
		return _.chain(userArray).sortBy('real_name').map(function(user){
			return module.mentionUser(user.id);
		}).join(", ");
	};

	module.mentionUser = function(user) {
		return "<@"+user+">";
	};

	module.typing = function(bot, channelID) {
		bot.say({ type: "typing", channel: channelID });
	};

	return module;
};